/* Obálka facebookové stránky — dvě varianty v jednom souboru.
 *
 *   PLAYWRIGHT_DIR=<cesta k node_modules> node tools/obalka.mjs
 *
 * Vstup je brand/obalka.html, výstupem jsou brand/obalka-*.png ve 1640×856
 * (rozměr, který Facebook chce k nahrání) a přehled brand/obalka-nahled.png,
 * kde je vidět výřez na počítači i na telefonu a kam sahá profilová fotka.
 */
const JMENA = { o1: 'obalka-1-slogan', o2: 'obalka-2-sluzby' };

const pw = await import(`${process.env.PLAYWRIGHT_DIR}/playwright/index.js`);
const chromium = pw.chromium ?? pw.default.chromium;
const fs = await import('node:fs');
const DIR = 'brand';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1700, height: 900 } });
await p.goto('file://' + process.cwd() + '/' + DIR + '/obalka.html', { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(700);
for (const id of Object.keys(JMENA)) {
  await p.locator('#' + id).screenshot({ path: `${DIR}/${JMENA[id]}.png` });
  console.log(JMENA[id] + '.png', fs.statSync(`${DIR}/${JMENA[id]}.png`).size, 'B');
}

/* Přehled: jak výřez dopadne na počítači (820×312) a na telefonu (640×360)
   a kde přes obálku leží profilová fotka. */
const karta = (id) => `
 <div style="margin-bottom:38px">
   <div style="font:11px/1.4 system-ui;letter-spacing:.14em;text-transform:uppercase;color:#8a8a8a;margin-bottom:10px">${JMENA[id]}</div>
   <div style="display:flex;gap:26px;align-items:flex-start">
     <div>
       <div style="font:11px system-ui;color:#777;margin-bottom:6px">počítač · 820×312 (ukrojí 58 px nahoře i dole)</div>
       <div style="position:relative;width:820px;height:312px;overflow:hidden;background:#000">
         <img src="${JMENA[id]}.png" style="width:820px;height:428px;position:absolute;top:-58px;left:0">
         <!-- profilová fotka: kolečko 168 px, středem sedí na dolní hraně obálky -->
         <div style="position:absolute;left:24px;bottom:-84px;width:168px;height:168px;border-radius:50%;
              background:url(avatar-2-monogram.png) center/cover;border:5px solid #18191a"></div>
       </div>
     </div>
     <div>
       <div style="font:11px system-ui;color:#777;margin-bottom:6px">telefon · 640×360</div>
       <div style="position:relative;width:360px;height:202px;overflow:hidden;background:#000">
         <img src="${JMENA[id]}.png" style="height:202px;width:387px;position:absolute;left:-13px">
       </div>
     </div>
   </div>
 </div>`;

const nahled = `<body style="margin:0;background:#18191a;padding:30px">
${Object.keys(JMENA).map(karta).join('')}
</body>`;
fs.writeFileSync(DIR + '/obalka-nahled.html', nahled);
const q = await b.newPage({ viewport: { width: 1340, height: 800 }, deviceScaleFactor: 1.6 });
await q.goto('file://' + process.cwd() + '/' + DIR + '/obalka-nahled.html', { waitUntil: 'networkidle' });
await q.waitForTimeout(500);
await q.screenshot({ path: DIR + '/obalka-nahled.png', fullPage: true });
fs.unlinkSync(DIR + '/obalka-nahled.html');
await b.close();
console.log('ok');
