// Launch Radar and Fee Claimer data, read straight from Robinhood Chain.
// One in-memory index of every Pons launch (token, curve, deployer) is built at start and topped up every few seconds.
import fs from "node:fs";
import { ethers } from "ethers";

const FACTORY = "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e";
export const ESCROW = "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e";
const LAUNCHED = ethers.id("TokenLaunched(address,address,address,address,uint256,uint256)");
const FACTORY_ABI = ["function getLaunchedToken(address token) view returns (tuple(address token, address curve, address deployer, address creatorFeeRecipient, address pairToken, uint256 graduationThreshold, uint256 initialLiquidity, uint24 poolFee, int24 tickSpacing, uint16 creatorTaxBps, bool buybackEnabled, uint8 phase, uint256 sweptQuote, uint256 sweptTokens, bool exists))"];
const CURVE_ABI = [
  "function graduated() view returns (bool)",
  "function creatorTaxBps() view returns (uint256)",
  "function creatorTaxBalance() view returns (uint256)",
  "function currentSnipeTaxBps(address recipient) view returns (uint256)",
];
const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function getTokenInfo() view returns (address tokenDeployer, string tokenLogo, string tokenDescription, tuple(string twitter, string telegram, string discord, string website, string farcaster) tokenSocials)",
];
const ESCROW_ABI = ["function balanceOf(address recipient) view returns (uint256)"];
const MULTICALL = "0xcA11bde05977b3631167028862bE2a173976CA11";
const MULTICALL_ABI = [
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)",
  "function getEthBalance(address addr) view returns (uint256 balance)",
];
const lc = (a) => a.toLowerCase();
const addr = (topic) => lc(ethers.getAddress("0x" + topic.slice(26)));

/** Runs fn over items, at most n at a time (keeps the public RPC happy). */
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

export function createTools(provider) {
  const factory = new ethers.Contract(FACTORY, FACTORY_ABI, provider);
  const escrow = new ethers.Contract(ESCROW, ESCROW_ABI, provider);
  // launches of the last 24 hours (radar + serial-launcher check); full history per deployer is looked up on demand
  const recent = [];
  let indexedTo = 0, ready = false, blocksPerSec = 4;
  const toLaunch = (l) => ({ token: addr(l.topics[1]), curve: addr(l.topics[2]), deployer: addr(l.topics[3]), block: l.blockNumber });

  async function logs(topics, from, to, tries = 0) {
    try { return await provider.getLogs({ address: FACTORY, topics, fromBlock: from, toBlock: to }); }
    catch (e) {
      const msg = JSON.stringify(e.info?.error || e.error || e.message || "");
      // rate limited or a hiccup: wait and ask again; only a range/size complaint is worth splitting
      if (!/range|spans|too many results|limit exceeded|10000|returned more/i.test(msg) || /too many requests|rate/i.test(msg)) {
        if (tries >= 6) throw e;
        await new Promise((r) => setTimeout(r, 500 * 2 ** tries));
        return logs(topics, from, to, tries + 1);
      }
      if (to - from < 2_000) throw e;
      const mid = Math.floor((from + to) / 2);
      return [...(await logs(topics, from, mid)), ...(await logs(topics, mid + 1, to))];
    }
  }
  async function sync() {
    const head = await provider.getBlockNumber();
    if (!ready) {
      const [a, b] = await Promise.all([provider.getBlock(head), provider.getBlock(head - 20_000)]);
      blocksPerSec = 20_000 / Math.max(1, a.timestamp - b.timestamp);
      indexedTo = head - Math.round(blocksPerSec * 3600 * 24); // start with the last 24 hours
    }
    if (head <= indexedTo) return;
    for (const l of await logs([LAUNCHED], indexedTo + 1, head)) recent.push(toLaunch(l));
    const cut = head - blocksPerSec * 3600 * 24;
    while (recent.length && (recent[0].block < cut || recent.length > 20_000)) recent.shift();
    indexedTo = head; ready = true;
  }
  (async () => { for (;;) { try { await sync(); } catch (e) { console.error("launch feed:", e.shortMessage || e.message); } await new Promise((r) => setTimeout(r, 2500)); } })();
  const waitReady = async () => { for (let i = 0; !ready && i < 60; i++) await new Promise((r) => setTimeout(r, 500)); if (!ready) throw new Error("Still reading the newest launches, try again in a moment."); };

  // every Pons launch by one deployer; kept on disk per wallet so a second scan only reads the new blocks
  const FIRST = 27_000_000, W = 10_000_000, CACHE = new URL("./launch-cache.json", import.meta.url);
  let devCache = new Map();
  try { devCache = new Map(Object.entries(JSON.parse(fs.readFileSync(CACHE, "utf8")))); } catch {}
  let saveT = null;
  const saveCache = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { fs.writeFileSync(CACHE, JSON.stringify(Object.fromEntries(devCache))); } catch {} }, 2000); };
  const inflightDev = new Map();
  function launchesBy(dev) {
    const key = lc(dev);
    if (inflightDev.has(key)) return inflightDev.get(key);
    const job = (async () => {
      const head = ready ? indexedTo : await provider.getBlockNumber(), c = devCache.get(key) || { to: FIRST - 1, list: [] };
      if (head - c.to < 50) return c.list;
      // a wallet that never sent a transaction cannot have launched anything: skip the log search
      if (!c.list.length && (await provider.getTransactionCount(key)) === 0) return [];
      const topic = ethers.zeroPadValue(key, 32), found = [];
      for (let from = c.to + 1; from <= head; from += W) found.push(...(await logs([LAUNCHED, null, null, topic], from, Math.min(head, from + W - 1))).map(toLaunch));
      const next = { to: head, list: [...c.list, ...found] };
      devCache.set(key, next); saveCache();
      return next.list;
    })().finally(() => inflightDev.delete(key));
    inflightDev.set(key, job);
    return job;
  }

  // per-token details, cached
  const info = new Map();
  // every read for many tokens in one Multicall3 request
  const mc = new ethers.Contract(MULTICALL, MULTICALL_ABI, provider);
  const tI = new ethers.Interface(TOKEN_ABI), cI = new ethers.Interface(CURVE_ABI), fI = new ethers.Interface(FACTORY_ABI), mI = new ethers.Interface(MULTICALL_ABI), eI = new ethers.Interface(ESCROW_ABI);
  async function detailsMany(list) {
    const todo = list.filter((l) => { const c = info.get(l.token); return !(c && Date.now() - c.at < (c.graduated ? 600_000 : 20_000)); });
    for (let k = 0; k < todo.length; k += 40) {
      const part = todo.slice(k, k + 40), calls = [];
      for (const l of part) {
        const c = info.get(l.token);
        calls.push(
          [l.token, tI, c?.name ? null : "name", []], [l.token, tI, c?.symbol ? null : "symbol", []], [l.token, tI, c?.ti ? null : "getTokenInfo", []],
          [l.curve, cI, "creatorTaxBps", []], [l.curve, cI, "graduated", []], [l.curve, cI, "currentSnipeTaxBps", [ethers.ZeroAddress]],
          [MULTICALL, mI, "getEthBalance", [l.curve]], [FACTORY, fI, c?.rec ? null : "getLaunchedToken", [l.token]],
        );
      }
      const live = calls.filter((x) => x[2]);
      const res = await mc.aggregate3.staticCall(live.map(([target, i, fn, args]) => ({ target, allowFailure: true, callData: i.encodeFunctionData(fn, args) })));
      const out = new Map(live.map((x, j) => [x, res[j]]));
      const val = (x, dflt) => { const r = out.get(x); if (!r || !r.success) return dflt; try { return x[1].decodeFunctionResult(x[2], r.returnData)[0]; } catch { return dflt; } };
      part.forEach((l, j) => {
        const c = info.get(l.token), x = calls.slice(j * 8, j * 8 + 8);
        const bal = val(x[6], 0n), tax = val(x[3], 0n), snipe = val(x[5], 0n);
        info.set(l.token, {
          at: Date.now(), name: c?.name || val(x[0], "?"), symbol: c?.symbol || val(x[1], "?"), ti: c?.ti || (x[2][2] ? (() => { const r = out.get(x[2]); try { return r?.success ? tI.decodeFunctionResult("getTokenInfo", r.returnData) : null; } catch { return null; } })() : null),
          rec: c?.rec || val(x[7], null), taxPct: Number(tax) / 100, graduated: val(x[4], false), snipePct: Number(snipe) / 100, curveETH: Number(ethers.formatEther(bal)),
        });
      });
    }
    while (info.size > 3000) info.delete(info.keys().next().value);
    return list.map((l) => info.get(l.token));
  }
  const details = async (l) => (await detailsMany([l]))[0];

  // Traction: unique buyers and recent buys on the curve, read incrementally from CurveBuy logs (every 12 s at most).
  const CURVE_BUY = ethers.id("CurveBuy(address,address,uint256,uint256,uint256,uint256)");
  const flow = new Map();
  async function traction(l) {
    const c = flow.get(l.curve) || { to: l.block - 1, buyers: new Map(), blocks: [], at: 0 };
    if (Date.now() - c.at < 12_000) return c;
    const head = indexedTo || (await provider.getBlockNumber());
    if (head > c.to) {
      const found = await provider.getLogs({ address: l.curve, topics: [CURVE_BUY], fromBlock: c.to + 1, toBlock: head });
      for (const x of found) { if (!c.buyers.has(x.topics[2])) c.buyers.set(x.topics[2], x.blockNumber); c.blocks.push(x.blockNumber); }
      c.to = head;
    }
    const cut = head - 15 * 60 * blocksPerSec; c.blocks = c.blocks.filter((b) => b > cut);
    c.fresh = 0; for (const b of c.buyers.values()) if (b > cut) c.fresh++; // wallets that bought for the first time in the last 15 min
    c.at = Date.now(); flow.set(l.curve, c);
    if (flow.size > 3000) flow.delete(flow.keys().next().value);
    return c;
  }

  // Dev sells: every token that left the deployer wallet (sold on the curve or a router, or moved to another wallet).
  // Read incrementally per token from the Transfer logs, at most every 12 s.
  const TRANSFER = ethers.id("Transfer(address,address,uint256)");
  const devOut = new Map();
  async function devSold(l) {
    const c = devOut.get(l.token) || { to: l.block - 1, out: 0n, supply: 0n, at: 0 };
    if (Date.now() - c.at < 12_000) return c;
    const head = indexedTo || (await provider.getBlockNumber());
    if (head > c.to) {
      const found = await provider.getLogs({ address: l.token, topics: [TRANSFER, ethers.zeroPadValue(l.deployer, 32)], fromBlock: c.to + 1, toBlock: head });
      for (const x of found) c.out += BigInt(x.data);
      c.to = head;
    }
    const erc = new ethers.Contract(l.token, ["function totalSupply() view returns (uint256)", "function balanceOf(address) view returns (uint256)"], provider);
    if (!c.supply) c.supply = await erc.totalSupply().catch(() => 0n);
    c.holds = await erc.balanceOf(l.deployer).catch(() => c.holds ?? 0n);
    c.at = Date.now(); devOut.set(l.token, c);
    if (devOut.size > 3000) devOut.delete(devOut.keys().next().value);
    return c;
  }

  /** The newest launches with the same checks the Ocula sniper filter uses. */
  async function radar(limit = 24) {
    await waitReady();
    const head = indexedTo, list = recent.slice(-limit).reverse();
    await detailsMany(list);
    const rows = await pool(list, 24, async (l) => {
      const d = await details(l);
      const socials = d.ti ? Object.entries(d.ti.tokenSocials.toObject()).filter(([, v]) => String(v).trim()).map(([k]) => k) : [];
      const other = recent.filter((x) => x.deployer === l.deployer && x.token !== l.token).length;
      const grad = d.rec ? Number(ethers.formatEther(d.rec.graduationThreshold)) : 0;
      let ds = null; try { ds = await devSold(l); } catch {}
      let tr = null; try { tr = await traction(l); } catch {}
      // recommended only when it is growing: judged by how fast new buyers arrive, not by a fixed count.
      // A young launch passes on its pace since launch (20 buyers in 10 min is fine); an older one needs new wallets in the last 15 min.
      const buyers = tr ? tr.buyers.size : 0, buys15m = tr ? tr.blocks.length : 0, fresh = tr ? tr.fresh : 0, eth = d.curveETH;
      const ageMin = Math.max(1, (head - l.block) / blocksPerSec / 60), perMin = buyers / ageMin;
      const growing = (ageMin <= 30 && buyers >= 5 && perMin >= 1) || fresh >= 8;
      const mins = (m) => (m < 60 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} h`);
      const soldPct = ds && ds.supply > 0n ? Number((ds.out * 1000000n) / ds.supply) / 10000 : 0;
      const holdPct = ds && ds.supply > 0n ? Number(((ds.holds || 0n) * 1000000n) / ds.supply) / 10000 : 0;
      // a sell alone is fine while the dev still holds; a rug is when the dev sold and kept (almost) nothing: 90% or more of the bag gone
      const rugged = !!ds && ds.out > 0n && (ds.holds || 0n) * 10n < (ds.holds || 0n) + ds.out;
      const checks = [
        { ok: !!ds && !rugged, text: !ds ? "dev sells could not be read" : ds.out === 0n ? "dev has not sold" : rugged ? `dev dumped: sold ${soldPct}%, holds ${holdPct}%` : `dev sold ${soldPct}%, still holds ${holdPct}%` },
        { ok: holdPct < 15, text: holdPct >= 15 ? `dev holds ${holdPct}% and could dump it` : `dev holds ${holdPct}%` },
        { ok: d.taxPct <= 3, text: `creator tax ${d.taxPct}%` },
        { ok: socials.length > 0, text: socials.length ? `socials: ${socials.join(", ")}` : "no socials" },
        { ok: other <= 2, text: other ? `dev launched ${other} other token${other > 1 ? "s" : ""} in 24h` : "no other launch by this dev in 24h" },
        { ok: !d.rec || lc(d.rec.creatorFeeRecipient) === l.deployer, text: !d.rec || lc(d.rec.creatorFeeRecipient) === l.deployer ? "fees go to the dev" : "fees go to another wallet" },
        { ok: !!tr && growing, text: !tr ? "growth could not be read" : growing ? (fresh >= 8 ? `growing: ${fresh} new buyers in the last 15 min` : `growing fast: ${buyers} buyers in ${mins(ageMin)}`) : `slow: ${buyers} buyer${buyers === 1 ? "" : "s"} in ${mins(ageMin)}, ${fresh} new in 15 min` },
      ];
      return {
        token: l.token, curve: l.curve, symbol: d.symbol, name: d.name, logo: d.ti?.tokenLogo || "", deployer: l.deployer, block: l.block, ethPair: !d.rec || BigInt(d.rec.pairToken) === 0n,
        taxPct: d.taxPct, socials: socials.length, devLaunches24h: other, devSoldPct: soldPct, devHoldPct: holdPct, devSold: !ds || ds.out > 0n, devRugged: rugged, buyers, buys15m, newBuyers15m: fresh, buyersPerMin: Math.round(perMin * 10) / 10, active: growing, feesToDev: !d.rec || lc(d.rec.creatorFeeRecipient) === l.deployer,
        ageSec: Math.round((head - l.block) / blocksPerSec), graduated: d.graduated, snipePct: d.snipePct,
        curveETH: d.curveETH, progressPct: grad ? Math.min(100, (d.curveETH / grad) * 100) : 0, checks, pass: checks.every((c) => c.ok),
      };
    });
    return { head, rows };
  }

  /** Creator fees a wallet can claim: pending on each curve it launched, plus what already waits in the escrow. */
  async function fees(wallet) {
    const w = lc(wallet);
    const mine = await launchesBy(w);
    await detailsMany(mine);
    const rows = (await pool(mine, 8, async (l) => {
      const d = await details(l);
      if (d.rec && lc(d.rec.creatorFeeRecipient) !== w) return null;
      const pending = await new ethers.Contract(l.curve, CURVE_ABI, provider).creatorTaxBalance().catch(() => 0n);
      return { token: l.token, curve: l.curve, symbol: d.symbol, name: d.name, graduated: d.graduated, pendingWei: pending.toString(), pendingETH: Number(ethers.formatEther(pending)) };
    })).filter(Boolean).sort((a, b) => b.pendingETH - a.pendingETH);
    const esc = await escrow.balanceOf(wallet);
    const total = rows.reduce((s, r) => s + BigInt(r.pendingWei), 0n) + esc;
    return { wallet, launched: mine.length, rows, escrowWei: esc.toString(), escrowETH: Number(ethers.formatEther(esc)), totalETH: Number(ethers.formatEther(total)) };
  }

  /**
   * The same, for many wallets at once (every account of one seed): launches per account (cached on disk),
   * then one multicall for curve fees, escrow balances and ETH balances. Only addresses come in, never keys.
   */
  async function feesMany(wallets) {
    const ws = wallets.map(lc);
    // the RPC takes one deployer per query over a wide range, so the accounts are read in parallel
    const mine = (await pool(ws, 4, (w) => launchesBy(w))).flat();
    await detailsMany(mine);
    const calls = [
      ...mine.map((l) => ({ target: l.curve, allowFailure: true, callData: cI.encodeFunctionData("creatorTaxBalance", []) })),
      ...ws.map((w) => ({ target: ESCROW, allowFailure: true, callData: eI.encodeFunctionData("balanceOf", [w]) })),
      ...ws.map((w) => ({ target: MULTICALL, allowFailure: true, callData: mI.encodeFunctionData("getEthBalance", [w]) })),
    ];
    const res = [];
    for (let k = 0; k < calls.length; k += 300) res.push(...(await mc.aggregate3.staticCall(calls.slice(k, k + 300))));
    const big = (r) => (r && r.success && r.returnData !== "0x" ? BigInt(r.returnData) : 0n);
    const out = ws.map((w, i) => ({ wallet: w, escrowWei: big(res[mine.length + i]), ethWei: big(res[mine.length + ws.length + i]), tokens: [] }));
    const byW = new Map(out.map((o) => [o.wallet, o]));
    mine.forEach((l, j) => {
      const d = info.get(l.token);
      if (d?.rec && lc(d.rec.creatorFeeRecipient) !== l.deployer) return;
      byW.get(l.deployer).tokens.push({ token: l.token, curve: l.curve, symbol: d?.symbol || "?", graduated: !!d?.graduated, pendingWei: big(res[j]).toString() });
    });
    return out.map((o) => ({ ...o, escrowWei: o.escrowWei.toString(), ethWei: o.ethWei.toString(), totalWei: (o.tokens.reduce((s, t) => s + BigInt(t.pendingWei), 0n) + o.escrowWei).toString() }));
  }

  /** Other launches by this dev in the last 24 hours (from the live feed), for the sniper's serial-launcher check. */
  const devLaunches24h = (dev) => recent.filter((x) => x.deployer === lc(dev)).length - 1 < 0 ? 0 : recent.filter((x) => x.deployer === lc(dev)).length - 1;

  return { radar, fees, feesMany, devLaunches24h, status: () => ({ ready, recent: recent.length, indexedTo }) };
}
