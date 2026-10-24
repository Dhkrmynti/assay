"""Animated SVG pictures used instead of paragraphs. {{VIZ:name}} in a design is replaced with VIZ[name]."""
VB = 'viewBox="0 0 300 200" preserveAspectRatio="xMidYMid meet"'
VIZ = {
"scan": f'''<div class="viz v-scan"><svg {VB}><rect class="s o4" x="95" y="30" width="110" height="140" rx="6"/>
<rect class="f o2" x="110" y="50" width="70" height="5" rx="2.5"/><rect class="f o2" x="110" y="66" width="80" height="5" rx="2.5"/><rect class="f o2" x="110" y="82" width="56" height="5" rx="2.5"/><rect class="f o2" x="110" y="98" width="76" height="5" rx="2.5"/><rect class="f o2" x="110" y="114" width="62" height="5" rx="2.5"/><rect class="f o2" x="110" y="130" width="70" height="5" rx="2.5"/>
<g class="beam"><rect class="f" x="88" y="40" width="124" height="2" rx="1"/><rect class="f o2" x="88" y="22" width="124" height="18"/></g>
<path class="s ck" d="M222 60l6 6 12-14"/><path class="s ck" d="M222 96l6 6 12-14"/><path class="s ck" d="M222 132l6 6 12-14"/></svg></div>''',
"radar": f'''<div class="viz v-radar"><svg {VB}><circle class="s o2" cx="150" cy="100" r="84"/><circle class="s o2" cx="150" cy="100" r="56"/><circle class="s o2" cx="150" cy="100" r="28"/><path class="s o2" d="M66 100h168M150 16v168"/></svg><div class="sweep"></div><div class="blips" data-blips></div></div>''',
"snipe": f'''<div class="viz v-snipe"><svg {VB}><circle class="f o4" cx="150" cy="100" r="7"/><circle class="s hit" cx="150" cy="100" r="16"/>
<g class="ret"><circle class="s" cx="150" cy="100" r="40"/><path class="s" d="M150 48v22M150 130v22M98 100h22M180 100h22"/></g></svg></div>''',
"fees": f'''<div class="viz v-fees"><svg {VB}>{"".join(f'<circle class="f acc" cx="{40 + (i % 3) * 22}" cy="{40 + (i // 3) * 40}" r="5" style="animation-delay:{i * .2:.1f}s"/><path class="s o4 flow" d="M{46 + (i % 3) * 22} {40 + (i // 3) * 40}C 170 {40 + (i // 3) * 40} 180 100 236 100"/>' for i in range(9))}
<circle class="s" cx="250" cy="100" r="18"/><circle class="f" cx="250" cy="100" r="7"/></svg></div>''',
"launch": f'''<div class="viz v-launch"><svg {VB}><path class="s o2" d="M40 170H260M40 170V30"/><path class="s o2" d="M40 38H260" stroke-dasharray="3 5"/>
<path class="s curve" d="M40 168C120 166 180 140 244 38" style="stroke-width:2.2"/><circle class="s grad" cx="244" cy="38" r="12"/><circle class="f grad" cx="244" cy="38" r="5"/></svg></div>''',
"kit": f'''<div class="viz v-kit"><svg {VB}><rect class="s o4" x="70" y="34" width="160" height="132" rx="8"/>
<rect class="f ln" x="88" y="58" width="96" height="9" rx="4.5"/><rect class="f o4 ln" x="88" y="82" width="124" height="6" rx="3"/><rect class="f o4 ln" x="88" y="98" width="110" height="6" rx="3"/><rect class="f o4 ln" x="88" y="114" width="118" height="6" rx="3"/><rect class="f o2" x="88" y="140" width="40" height="10" rx="5"/></svg></div>''',
"agent": f'''<div class="viz v-agent"><svg {VB}><g class="b1"><rect class="s" x="60" y="40" width="120" height="34" rx="17"/><rect class="f o4" x="76" y="54" width="80" height="6" rx="3"/></g>
<g class="b2"><rect class="f o2" x="120" y="86" width="120" height="34" rx="17"/><rect class="f o4" x="136" y="100" width="70" height="6" rx="3"/></g>
<g class="b3"><rect class="s" x="60" y="132" width="70" height="30" rx="15"/><circle class="f td" cx="82" cy="147" r="3.5"/><circle class="f td" cx="95" cy="147" r="3.5"/><circle class="f td" cx="108" cy="147" r="3.5"/></g></svg></div>''',
"pick": f'''<div class="viz v-pick"><svg {VB}><circle class="s o2" cx="150" cy="100" r="45" style="stroke-width:6"/><circle class="s ring" cx="150" cy="100" r="45" style="stroke-width:6"/></svg></div>''',
"key": f'''<div class="viz v-key"><svg {VB}><circle class="s o4" cx="130" cy="100" r="22"/><path class="s o4" d="M152 100h70M200 100v16M214 100v12"/><path class="s cross" d="M90 160L210 40" style="stroke-width:2.4"/></svg></div>''',
"clamp": f'''<div class="viz v-clamp"><svg {VB}><path class="s o2" d="M50 100H250"/><path class="s" d="M90 76v48M86 76h8M86 124h8M210 76v48M206 76h8M206 124h8" style="stroke-width:2"/>
<g class="val"><circle class="f" cx="150" cy="100" r="9"/></g></svg></div>''',
"trace": f'''<div class="viz v-trace"><svg {VB}><rect class="s o4" x="40" y="80" width="56" height="40" rx="6"/><rect class="s o4" x="122" y="80" width="56" height="40" rx="6"/><rect class="s" x="204" y="80" width="56" height="40" rx="6"/>
<path class="s tx" d="M96 100h26M178 100h26"/><circle class="f node" cx="68" cy="100" r="4"/><circle class="f node" cx="150" cy="100" r="4"/><circle class="f node" cx="232" cy="100" r="4"/></svg></div>''',
}
