// Ocula Token Scanner: reads a Pons v2 token straight from Robinhood Chain and turns it into facts and flags.
// Every number and flag here is computed by code from on-chain data. The AI only writes the summary on top.
import { ethers } from "ethers";

const FACTORY = "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e";
const ESCROW = "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e";
const DEAD = "0x000000000000000000000000000000000000dead";
const ZERO = ethers.ZeroAddress;

const FACTORY_ABI = [
  "function getLaunchedToken(address token) view returns (tuple(address token, address curve, address deployer, address creatorFeeRecipient, address pairToken, uint256 graduationThreshold, uint256 initialLiquidity, uint24 poolFee, int24 tickSpacing, uint16 creatorTaxBps, bool buybackEnabled, uint8 phase, uint256 sweptQuote, uint256 sweptTokens, bool exists))",
  "event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)",
];
const CURVE_ABI = [
  "function graduated() view returns (bool)",
  "function creatorTaxBps() view returns (uint256)",
  "function currentSnipeTaxBps(address recipient) view returns (uint256)",
  "event CurveBuy(address indexed buyer, address indexed recipient, uint256 quoteIn, uint256 tokensOut, uint256 fee, uint256 tax)",
  "event CurveSell(address indexed seller, address indexed recipient, uint256 tokensIn, uint256 quoteOut, uint256 fee, uint256 tax)",
];
const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function getTokenInfo() view returns (address tokenDeployer, string tokenLogo, string tokenDescription, tuple(string twitter, string telegram, string discord, string website, string farcaster) tokenSocials)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const factoryI = new ethers.Interface(FACTORY_ABI);
// the two ways a Pons token is launched; both carry the deployer's snipe-tax-exempt wallets
const PARAMS = "tuple(string name,string symbol,string logo,string description,tuple(string twitter,string telegram,string discord,string website,string farcaster) socials,address creatorFeeRecipient,uint16 creatorTaxBps,bool buybackEnabled,bytes32 expectedEconomics,bytes32 salt)";
const LAUNCH_I = new ethers.Interface([
  `function launchToken(${PARAMS} params, uint256 launchConfigId, address pairToken, address[] snipeTaxExemptions)`,
  `function launchAndBuy(${PARAMS} params, uint256 launchConfigId, address pairToken, uint256 quoteIn, uint256 minTokensOut, address recipient, address[] snipeTaxExemptions)`,
]);
const curveI = new ethers.Interface(CURVE_ABI);
const TRANSFER = ethers.id("Transfer(address,address,uint256)");
const LAUNCHED = factoryI.getEvent("TokenLaunched").topicHash;
const BUY = curveI.getEvent("CurveBuy").topicHash;
const SELL = curveI.getEvent("CurveSell").topicHash;
const lc = (a) => a.toLowerCase();
const pct = (a, b) => (b > 0n ? Number((a * 1000000n) / b) / 10000 : 0);

/** getLogs over a big range, split into windows that the public RPC accepts. */
async function logsIn(p, filter, from, to, step = 500_000) {
  const out = [];
  for (let a = from; a <= to; a += step) {
    const b = Math.min(to, a + step - 1);
    try {
      out.push(...(await p.getLogs({ ...filter, fromBlock: a, toBlock: b })));
    } catch (e) {
      if (step <= 5_000) throw e;
      out.push(...(await logsIn(p, filter, a, b, Math.floor(step / 5))));
    }
  }
  return out;
}

/** Newest-first search for the launch event of one token (topic1 = token). */
async function findLaunch(p, token, latest) {
  const WINDOW = 9_000_000;
  for (let to = latest; to >= 0; to -= WINDOW) {
    const found = await p.getLogs({ address: FACTORY, topics: [LAUNCHED, ethers.zeroPadValue(token, 32)], fromBlock: Math.max(0, to - WINDOW + 1), toBlock: to });
    if (found.length) return found[0];
  }
  return null;
}

/** Every token this deployer launched through the Pons factory. */
async function launchesBy(p, deployer, latest) {
  const WINDOW = 9_000_000;
  const out = [];
  for (let to = latest; to >= 0; to -= WINDOW) {
    const found = await p.getLogs({ address: FACTORY, topics: [LAUNCHED, null, null, ethers.zeroPadValue(deployer, 32)], fromBlock: Math.max(0, to - WINDOW + 1), toBlock: to });
    out.push(...found);
  }
  return out.map((l) => ({ token: lc(ethers.getAddress("0x" + l.topics[1].slice(26))), curve: lc(ethers.getAddress("0x" + l.topics[2].slice(26))), block: l.blockNumber }));
}

export async function scan(provider, caRaw) {
  if (!ethers.isAddress(caRaw)) throw new Error("That is not a token address.");
  const ca = ethers.getAddress(caRaw);
  const p = provider;
  const factory = new ethers.Contract(FACTORY, FACTORY_ABI, p);
  const rec = await factory.getLaunchedToken(ca);
  if (!rec.exists) throw new Error("This token was not launched on Pons (the factory has no record of it).");

  const token = new ethers.Contract(ca, TOKEN_ABI, p);
  const curve = new ethers.Contract(rec.curve, CURVE_ABI, p);
  const latest = await p.getBlockNumber();
  const [name, symbol, decimals, supply, info, graduated, curveEth, launch] = await Promise.all([
    token.name().catch(() => "?"), token.symbol().catch(() => "?"), token.decimals().catch(() => 18n), token.totalSupply(),
    token.getTokenInfo().catch(() => null), curve.graduated().catch(() => false), p.getBalance(rec.curve), findLaunch(p, ca, latest),
  ]);
  const startBlock = launch ? launch.blockNumber : latest - 200_000;
  const [launchBlock, nowBlock] = await Promise.all([p.getBlock(startBlock), p.getBlock(latest)]);
  const ageHours = (nowBlock.timestamp - launchBlock.timestamp) / 3600;

  // Trades on the curve and every token transfer since launch.
  const [buys, sells, transfers] = await Promise.all([
    logsIn(p, { address: rec.curve, topics: [BUY] }, startBlock, latest),
    logsIn(p, { address: rec.curve, topics: [SELL] }, startBlock, latest),
    logsIn(p, { address: ca, topics: [TRANSFER] }, startBlock, latest),
  ]);
  const B = buys.map((l) => ({ block: l.blockNumber, tx: l.transactionHash, ...curveI.parseLog(l).args.toObject() }));
  const S = sells.map((l) => ({ block: l.blockNumber, ...curveI.parseLog(l).args.toObject() }));

  // Holder book from transfers, plus how much each wallet sent out (sold through any router, or moved).
  const bal = new Map(), sent = new Map(), moves = [];
  for (const l of transfers) {
    const from = lc(ethers.getAddress("0x" + l.topics[1].slice(26))), to = lc(ethers.getAddress("0x" + l.topics[2].slice(26))), v = BigInt(l.data);
    moves.push({ from, to, v });
    if (from !== lc(ZERO)) { bal.set(from, (bal.get(from) || 0n) - v); sent.set(from, (sent.get(from) || 0n) + v); }
    if (to !== lc(ZERO)) bal.set(to, (bal.get(to) || 0n) + v);
  }
  const skip = new Set([lc(rec.curve), lc(ESCROW), DEAD, lc(ZERO), lc(ca)]);
  const holders = [...bal.entries()].filter(([a, v]) => v > 0n && !skip.has(a)).sort((x, y) => (y[1] > x[1] ? 1 : -1));
  const circulating = holders.reduce((s, [, v]) => s + v, 0n);
  const top10 = holders.slice(0, 10);
  const top10Pct = pct(top10.reduce((s, [, v]) => s + v, 0n), supply);
  const largestPct = holders[0] ? pct(holders[0][1], supply) : 0;
  const contracts = new Set();
  await Promise.all(top10.map(async ([a]) => { if ((await p.getCode(a)) !== "0x") contracts.add(a); }));

  // Dev: what the deployer bought, holds and sold.
  const dev = lc(rec.deployer);
  const devBought = B.filter((b) => lc(b.recipient) === dev || lc(b.buyer) === dev).reduce((s, b) => s + b.tokensOut, 0n);
  const devSold = sent.get(dev) || 0n; // anything that left the deployer: sold through the curve or a router, or moved
  const devHolds = bal.get(dev) || 0n;

  // Early buyers: everything bought in the first 60 seconds after launch, excluding the dev.
  // Robinhood Chain makes several blocks a second, so the window is measured in time, not blocks.
  const blocksPerSec = Math.max(1, (latest - startBlock) / Math.max(1, nowBlock.timestamp - launchBlock.timestamp));
  const early = B.filter((b) => b.block <= startBlock + Math.ceil(60 * blocksPerSec) && lc(b.recipient) !== dev);
  const earlyWallets = [...new Set(early.map((b) => lc(b.recipient)))];
  const earlyTokens = early.reduce((s, b) => s + b.tokensOut, 0n);
  const earlyStillHold = earlyWallets.reduce((s, a) => s + ((bal.get(a) || 0n) > 0n ? bal.get(a) : 0n), 0n);
  const earlySold = earlyWallets.filter((a) => S.some((s) => lc(s.seller) === a)).length;

  // Bundles: wallets that look like they belong to the deployer or to one operator.
  const bundle = await bundles(p, { launch, rec, dev, B, moves, bal, supply, early, earlyWallets, startBlock, skip: new Set([lc(rec.curve), lc(ESCROW), DEAD, lc(ZERO), lc(ca)]) });

  // Flow: volume and the last hour.
  const ethIn = B.reduce((s, b) => s + b.quoteIn, 0n), ethOut = S.reduce((s, x) => s + x.quoteOut, 0n);
  const hourAgoBlock = latest - Math.round(3600 / Math.max(0.1, (nowBlock.timestamp - launchBlock.timestamp) / Math.max(1, latest - startBlock)));
  const b1h = B.filter((b) => b.block >= hourAgoBlock), s1h = S.filter((s) => s.block >= hourAgoBlock);
  const sellers = new Set(S.map((s) => lc(s.seller)));
  const buyers = new Set(B.map((b) => lc(b.recipient)));

  // Deployer history.
  const past = (await launchesBy(p, rec.deployer, latest)).filter((x) => x.token !== lc(ca));
  const pastInfo = await Promise.all(past.slice(-12).map(async (x) => {
    const [g, e, sym] = await Promise.all([
      new ethers.Contract(x.curve, CURVE_ABI, p).graduated().catch(() => false),
      p.getBalance(x.curve).catch(() => 0n),
      new ethers.Contract(x.token, TOKEN_ABI, p).symbol().catch(() => "?"),
    ]);
    return { token: x.token, symbol: sym, graduated: g, curveETH: +ethers.formatEther(e) };
  }));
  const deadPast = pastInfo.filter((x) => !x.graduated && x.curveETH < 0.05).length;

  const fmtT = (v) => +ethers.formatUnits(v, decimals);
  const socials = info ? Object.fromEntries(Object.entries(info.tokenSocials.toObject()).filter(([, v]) => v)) : {};
  const snipeTax = Number(await curve.currentSnipeTaxBps(ethers.Wallet.createRandom().address).catch(() => 0n)) / 100;
  const gradETH = +ethers.formatEther(rec.graduationThreshold);
  const x = await xCheck(info?.tokenSocials?.twitter || "");
  const facts = {
    token: { address: ca, name, symbol, ageHours: +ageHours.toFixed(1), supply: fmtT(supply), socials, description: info?.tokenDescription?.slice(0, 280) || "", logo: info?.tokenLogo || "" },
    pons: { curve: rec.curve, graduated, curveETH: +ethers.formatEther(curveEth), graduationETH: gradETH, progressPct: graduated ? 100 : +Math.min(100, (+ethers.formatEther(curveEth) / Math.max(1e-9, gradETH)) * 100).toFixed(1), creatorTaxPct: Number(rec.creatorTaxBps) / 100, buybackEnabled: rec.buybackEnabled, snipeTaxNowPct: snipeTax },
    deployer: { address: lc(rec.deployer), feeRecipient: lc(rec.creatorFeeRecipient), feeRecipientIsDeployer: lc(rec.creatorFeeRecipient) === dev, boughtPct: pct(devBought, supply), holdsPct: pct(devHolds > 0n ? devHolds : 0n, supply), soldPct: pct(devSold, supply), otherLaunches: past.length, otherLaunchesLooked: pastInfo.length, otherLaunchesDead: deadPast, otherLaunchesGraduated: pastInfo.filter((x) => x.graduated).length, recent: pastInfo.slice(-5) },
    holders: { count: holders.length, top10Pct, largestPct, inCirculationPct: pct(circulating, supply), top: top10.map(([a, v]) => ({ address: a, pct: pct(v, supply), contract: contracts.has(a), dev: a === dev })) },
    early: { wallets: earlyWallets.length, boughtPct: pct(earlyTokens, supply), stillHoldPct: pct(earlyStillHold, supply), soldWallets: earlySold },
    trading: { buys: B.length, sells: S.length, buyers: buyers.size, sellers: sellers.size, volumeInETH: +ethers.formatEther(ethIn), volumeOutETH: +ethers.formatEther(ethOut), lastHour: { buys: b1h.length, sells: s1h.length, inETH: +ethers.formatEther(b1h.reduce((s, b) => s + b.quoteIn, 0n)), outETH: +ethers.formatEther(s1h.reduce((s, x) => s + x.quoteOut, 0n)) } },
    bundle, x,
    scannedAtBlock: latest,
  };
  return { facts, flags: flagsFor(facts), risk: riskOf(facts) };
}

/** Plain rules over the facts. Levels: "high" (look hard), "watch", "ok", "info". */
export function flagsFor(f) {
  const out = [];
  const add = (level, title, detail) => out.push({ level, title, detail });
  const h = f.holders, d = f.deployer, e = f.early, t = f.trading;
  if (h.count === 0 && t.buys > 0) add("high", "Nobody is holding", "Every buyer has sold. All the supply is back in the curve.");
  if (d.soldPct > 0 && d.holdsPct * 10 < d.holdsPct + d.soldPct) add("high", "Deployer dumped the bag", `${d.soldPct}% of supply left the deployer wallet (sold through the curve or a router, or sent to another wallet) and it holds ${d.holdsPct}% now.`);
  else if (d.soldPct > 0) add("watch", "Deployer sold some", `${d.soldPct}% of supply left the deployer wallet, but it still holds ${d.holdsPct}%.`);
  else if (d.holdsPct >= 10) add("watch", "Deployer holds a big bag", `The deployer holds ${d.holdsPct}% of supply.`);
  else if (d.boughtPct > 0) add("ok", "Deployer has not sold", `Bought ${d.boughtPct}% at launch, still holds ${d.holdsPct}%.`);
  if (h.count === 0) {}
  else if (h.top10Pct >= 70) add("high", "Very concentrated", `The top 10 wallets hold ${h.top10Pct}% of supply.`);
  else if (h.top10Pct >= 45) add("watch", "Concentrated", `The top 10 wallets hold ${h.top10Pct}% of supply.`);
  else add("ok", "Spread out", `The top 10 wallets hold ${h.top10Pct}% of supply.`);
  if (h.largestPct >= 15) add("watch", "One wallet is large", `The largest holder has ${h.largestPct}% of supply.`);
  if (e.boughtPct >= 20) add(e.stillHoldPct >= 15 ? "high" : "watch", "Heavy early buying", `${e.wallets} wallets bought ${e.boughtPct}% in the first minute and still hold ${e.stillHoldPct}%.`);
  else if (e.wallets) add("info", "Early buyers", `${e.wallets} wallets bought ${e.boughtPct}% in the first minute.`);
  if (d.otherLaunches >= 5 && d.otherLaunchesDead / Math.max(1, d.otherLaunchesLooked) >= 0.7) add("high", "Serial launcher", `This deployer launched ${d.otherLaunches} other tokens; ${d.otherLaunchesDead} of the last ${d.otherLaunchesLooked} look abandoned.`);
  else if (d.otherLaunches >= 3) add("watch", "Launched before", `This deployer launched ${d.otherLaunches} other tokens (${d.otherLaunchesGraduated} graduated).`);
  else if (d.otherLaunches === 0) add("info", "First launch", "No other Pons launches from this deployer.");
  if (!d.feeRecipientIsDeployer) add("info", "Fees go elsewhere", `Creator fees go to ${d.feeRecipient}, not the deployer.`);
  if (f.pons.creatorTaxPct > 0) add("info", "Creator tax", `${f.pons.creatorTaxPct}% creator tax on trades.`);
  if (f.pons.snipeTaxNowPct > 0) add("info", "Snipe tax active", `Buying right now pays ${f.pons.snipeTaxNowPct}% snipe tax.`);
  if (t.lastHour.sells > 0 && t.lastHour.outETH > t.lastHour.inETH * 2 && t.lastHour.outETH > 0.05) add("watch", "Selling pressure", `Last hour: ${t.lastHour.outETH.toFixed(3)} ETH out vs ${t.lastHour.inETH.toFixed(3)} ETH in.`);
  if (!Object.keys(f.token.socials).length) add("info", "No socials", "The token has no socials set on-chain.");
  const bn = f.bundle || {};
  if (bn.holdsPct >= 10) add("high", "Bundled wallets", `${bn.count} wallets look tied to one operator and hold ${bn.holdsPct}% of supply.`);
  else if (bn.count >= 2) add("watch", "Some bundled wallets", `${bn.count} wallets look tied to one operator; together they hold ${bn.holdsPct}%.`);
  else add("ok", "No bundle found", "No wallets look tied to the deployer or to each other.");
  const xx = f.x || {};
  if (xx.found) {
    const young = xx.ageDays < 7, small = xx.followers < 100;
    add(young || small ? "watch" : "info", "X account", `@${xx.handle}: ${xx.followers.toLocaleString("en-US")} followers, ${xx.ageDays} days old${xx.post ? `; the linked post has ${xx.post.likes} likes${xx.post.views ? ` and ${xx.post.views.toLocaleString("en-US")} views` : ""}` : ""}.`);
  } else if (xx.linked && xx.found === false) add("watch", "X account not found", `The linked X account @${xx.handle} does not exist.`);
  if (f.pons.graduated) add("ok", "Graduated", "Trading on Uniswap v4.");
  else add("info", "On the curve", `${f.pons.progressPct}% of the way to graduation (${f.pons.curveETH.toFixed(3)} / ${f.pons.graduationETH} ETH).`);
  const order = { high: 0, watch: 1, ok: 2, info: 3 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}


/** Wallets that look like one operator: snipe-tax-exempt at launch (the deployer named them), bought in the
 *  same transaction as other wallets, bought in the launch block with a brand-new wallet, received tokens from
 *  the deployer, or pooled their tokens into one wallet. */
async function bundles(p, { launch, rec, dev, B, moves, bal, supply, early, earlyWallets, startBlock, skip }) {
  const why = new Map(), tag = (a, t) => { if (a === dev || skip.has(a)) return; (why.get(a) || why.set(a, new Set()).get(a)).add(t); };
  // 1. the deployer's own snipe-tax-exempt list, from the launch transaction
  let exempt = [];
  if (launch) {
    try {
      const tx = await p.getTransaction(launch.transactionHash);
      const d = LAUNCH_I.parseTransaction({ data: tx.data });
      exempt = (d?.args?.snipeTaxExemptions || []).map((a) => lc(a));
      if (d?.name === "launchAndBuy" && lc(d.args.recipient) !== dev) tag(lc(d.args.recipient), "dev buy recipient");
    } catch {}
  }
  for (const a of exempt) if (B.some((b) => lc(b.recipient) === a)) tag(a, "snipe-tax exempt by the deployer");
  // 2. one transaction buying for several wallets
  const byTx = new Map(); for (const b of B) (byTx.get(b.tx) || byTx.set(b.tx, new Set()).get(b.tx)).add(lc(b.recipient));
  for (const set of byTx.values()) if (set.size >= 2) for (const a of set) tag(a, "bought in one transaction with other wallets");
  // 3. brand-new wallets buying in the launch block
  const launchBlockBuyers = [...new Set(B.filter((b) => b.block === startBlock).map((b) => lc(b.recipient)))].filter((a) => a !== dev).slice(0, 25);
  const nonces = await Promise.all(launchBlockBuyers.map((a) => p.getTransactionCount(a).catch(() => 99)));
  launchBlockBuyers.forEach((a, i) => { if (nonces[i] <= 3) tag(a, "new wallet buying in the launch block"); });
  // 4. tokens handed out by the deployer
  for (const m of moves) if (m.from === dev && !skip.has(m.to)) tag(m.to, "received tokens from the deployer");
  // 5. early wallets pooling tokens into one wallet
  const earlySet = new Set(earlyWallets), into = new Map();
  for (const m of moves) if (earlySet.has(m.from) && !skip.has(m.to) && m.to !== m.from) (into.get(m.to) || into.set(m.to, new Set()).get(m.to)).add(m.from);
  // only plain wallets count: a router or aggregator receiving tokens is just a sale
  const pooled = [...into].filter(([, froms]) => froms.size >= 2).slice(0, 15);
  const codes = await Promise.all(pooled.map(([to]) => p.getCode(to).catch(() => "0x00")));
  pooled.forEach(([to, froms], i) => { if (codes[i] !== "0x") return; tag(to, "collected tokens from early wallets"); for (const f of froms) tag(f, "sent tokens to a shared wallet"); });

  const wallets = [...why.entries()].map(([address, set]) => ({ address, reasons: [...set], holdsPct: pct((bal.get(address) || 0n) > 0n ? bal.get(address) : 0n, supply), boughtPct: pct(B.filter((b) => lc(b.recipient) === address).reduce((s, b) => s + b.tokensOut, 0n), supply) }))
    .sort((a, b) => b.holdsPct - a.holdsPct || b.boughtPct - a.boughtPct);
  return {
    wallets: wallets.slice(0, 20), count: wallets.length, exemptListed: exempt.length,
    holdsPct: +wallets.reduce((s, w) => s + w.holdsPct, 0).toFixed(4), boughtPct: +wallets.reduce((s, w) => s + w.boughtPct, 0).toFixed(4),
    launchBlockBuyers: launchBlockBuyers.length,
  };
}

let xProbe = { at: 0, up: false };
async function xUp(get) {
  if (Date.now() - xProbe.at < 600_000) return xProbe.up;
  const r = await get("X").catch(() => null); xProbe = { at: Date.now(), up: !!r?.user }; return xProbe.up;
}

/** The token's X account (and the linked post, if the link is a post): reach, age and engagement. */
async function xCheck(link) {
  const m = String(link).match(/(?:x|twitter)\.com\/(?:#!\/)?@?([A-Za-z0-9_]{1,15})(?:\/status(?:es)?\/(\d+))?/i) || String(link).match(/^@?([A-Za-z0-9_]{1,15})$/);
  if (!m) return { linked: !!link };
  const get = async (path) => { const r = await fetch("https://api.fxtwitter.com/" + path, { signal: AbortSignal.timeout(7000), headers: { "user-agent": "OculaScanner/1.0" } }); return r.ok ? r.json() : null; };
  try {
    const [u, t] = await Promise.all([get(m[1]), m[2] ? get("status/" + m[2]) : null]);
    const user = u?.user, tw = t?.tweet;
    // a miss only means "no such account" when the service still finds a known account
    if (!user) return { linked: true, handle: m[1], found: (await xUp(get)) ? false : null };
    const ageDays = Math.max(0, Math.round((Date.now() - Date.parse(user.joined)) / 86400_000));
    const out = { linked: true, found: true, handle: user.screen_name, followers: user.followers, following: user.following, posts: user.tweets, ageDays, verified: !!user.verification?.verified };
    if (tw) out.post = { likes: tw.likes, reposts: tw.retweets, replies: tw.replies, views: tw.views ?? null, ageHours: Math.round((Date.now() - Date.parse(tw.created_at)) / 3600_000) };
    return out;
  } catch { return { linked: true, handle: m[1], found: null }; }
}

/** Rug risk 0-100 from the facts: each signal adds points, the reasons are listed. A read of signals, not a verdict. */
export function riskOf(f) {
  const parts = [], add = (pts, why) => { if (pts) parts.push({ pts, why }); };
  const d = f.deployer, h = f.holders, e = f.early, b = f.bundle || {}, x = f.x || {}, t = f.trading;
  if (h.count === 0 && t.buys > 0) add(25, "every buyer has already sold");
  // same line as the radar: a partial sell while the dev still holds is mild; selling (almost) the whole bag is the rug
  if (d.soldPct > 0 && d.holdsPct * 10 < d.holdsPct + d.soldPct) add(45, `deployer dumped: sold ${d.soldPct}% of supply and holds ${d.holdsPct}%`);
  else if (d.soldPct > 0) add(8, `deployer sold ${d.soldPct}% but still holds ${d.holdsPct}%`);
  if (b.holdsPct >= 20) add(30, `bundled wallets hold ${b.holdsPct}%`); else if (b.holdsPct >= 10) add(20, `bundled wallets hold ${b.holdsPct}%`); else if (b.holdsPct >= 4) add(10, `bundled wallets hold ${b.holdsPct}%`); else if (b.count >= 3) add(5, `${b.count} wallets look bundled`);
  if (d.holdsPct >= 25) add(20, `deployer still holds ${d.holdsPct}% and can dump it`); else if (d.holdsPct >= 10) add(12, `deployer still holds ${d.holdsPct}%`);
  const otherLargest = (h.top || []).find((w) => !w.dev && !w.contract);
  if (otherLargest && otherLargest.pct >= 15) add(8, `one wallet holds ${otherLargest.pct}%`);
  // bundles that bought big and already sold: the classic dump
  if (b.boughtPct >= 15 && b.holdsPct < b.boughtPct / 3) add(25, `bundled wallets bought ${b.boughtPct}% and already dumped most of it`);
  else if (b.boughtPct >= 5 && b.holdsPct < b.boughtPct / 3) add(15, `bundled wallets bought ${b.boughtPct}% and already sold most of it`);
  else if (b.boughtPct >= 10) add(10, `bundled wallets bought ${b.boughtPct}% of supply`);
  if (h.top10Pct >= 70) add(15, `top 10 wallets hold ${h.top10Pct}%`); else if (h.top10Pct >= 45) add(8, `top 10 wallets hold ${h.top10Pct}%`);
  if (e.stillHoldPct >= 15) add(10, `first-minute buyers still hold ${e.stillHoldPct}%`);
  if (d.otherLaunches >= 5 && d.otherLaunchesDead / Math.max(1, d.otherLaunchesLooked) >= 0.7) add(15, `deployer abandoned ${d.otherLaunchesDead} of ${d.otherLaunchesLooked} recent launches`); else if (d.otherLaunches >= 3) add(5, `deployer launched ${d.otherLaunches} other tokens`);
  if (!d.feeRecipientIsDeployer) add(5, "creator fees go to another wallet");
  if (f.pons.creatorTaxPct > 5) add(5, `high creator tax (${f.pons.creatorTaxPct}%)`);
  if (!Object.keys(f.token.socials || {}).length) add(8, "no socials on-chain");
  if (x.found) {
    if (x.ageDays < 7) add(8, `X account is ${x.ageDays} days old`);
    if (x.followers < 100) add(5, `X account has ${x.followers} followers`);
    if (x.post && x.followers > 0 && x.post.likes > x.followers * 1.5 && x.post.likes > 50) add(8, "post likes far exceed the account's followers");
    if (x.post?.views && x.post.likes / x.post.views > 0.25 && x.post.views > 200) add(6, "unusually high likes for the views");
  } else if (x.linked && x.found === false) add(12, "the linked X account does not exist");
  if (t.lastHour.sells > 0 && t.lastHour.outETH > t.lastHour.inETH * 2 && t.lastHour.outETH > 0.05) add(5, "more ETH left than came in over the last hour");
  if (f.pons.graduated) add(-10, "graduated to the DEX");
  const score = Math.max(0, Math.min(100, parts.reduce((s, p) => s + p.pts, 0)));
  return { score, level: score >= 60 ? "high" : score >= 30 ? "medium" : "low", reasons: parts.filter((p) => p.pts > 0).sort((a, b) => b.pts - a.pts).map((p) => p.why) };
}
