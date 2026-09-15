/* Znak kanceláře pro profily na sítích — tři varianty v jednom souboru.
 *
 *   PLAYWRIGHT_DIR=<cesta k node_modules> node tools/avatar.mjs
 *
 * Vstup je brand/avatar.html, výstupem jsou brand/avatar-*.png ve 1080 px
 * a přehledový list brand/nahled.png, kde je vidět, jak varianty vypadají
 * v kolečku od 260 až po 32 px — Facebook avatar ořezává do kruhu.
 * Vybraná varianta (monogram) žije navíc jako assets/znacka-kp.png.
 */
const JMENA = {v1:'avatar-1-pecet', v2:'avatar-2-monogram', v3:'avatar-3-kruhovy-napis'};
const pw = await import(`${process.env.PLAYWRIGHT_DIR}/playwright/index.js`);
const chromium = pw.chromium ?? pw.default.chromium;
const fs = await import('node:fs');
const DIR = 'brand';   // vstup i výstup je složka brand/
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1100,height:1200}});
await p.goto('file://'+process.cwd()+'/'+DIR+'/avatar.html',{waitUntil:'networkidle'});
await p.evaluate(()=>document.fonts.ready);
await p.waitForTimeout(700);
for(const id of ['v1','v2','v3']){
  await p.locator('#'+id).screenshot({path:`${DIR}/${JMENA[id]}.png`});
  console.log(id, fs.statSync(`${DIR}/${JMENA[id]}.png`).size, 'B');
}
// list ukázek: jak to vypadá v kruhu velké i malé
const nahled = `<body style="margin:0;background:#1b1b1b;font:13px system-ui;color:#bbb">
<div style="display:flex;gap:40px;padding:34px">
${['v1','v2','v3'].map((id,i)=>`
 <div style="text-align:center">
  <div style="font:11px/1.4 system-ui;letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px">${i+1} · ${['pečeť','monogram','kruhový nápis'][i]}</div>
  <img src="${JMENA[id]}.png" style="width:260px;height:260px;border-radius:50%">
  <div style="display:flex;gap:14px;align-items:flex-end;justify-content:center;margin-top:16px">
    <img src="${JMENA[id]}.png" style="width:100px;height:100px;border-radius:50%">
    <img src="${JMENA[id]}.png" style="width:56px;height:56px;border-radius:50%">
    <img src="${JMENA[id]}.png" style="width:32px;height:32px;border-radius:50%">
  </div>
  <div style="margin-top:8px;font-size:11px;color:#777">260 · 100 · 56 · 32 px</div>
 </div>`).join('')}
</div></body>`;
fs.writeFileSync(DIR+'/nahled.html', nahled);
const q = await b.newPage({viewport:{width:1060,height:470},deviceScaleFactor:2});
await q.goto('file://'+process.cwd()+'/'+DIR+'/nahled.html',{waitUntil:'networkidle'});
await q.waitForTimeout(400);
await q.screenshot({path:DIR+'/nahled.png'});
fs.unlinkSync(DIR+'/nahled.html');
await b.close();
console.log('ok');
