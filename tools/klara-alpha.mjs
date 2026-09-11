/**
 * Vyříznutí pozadí z projekce Kláry.
 *
 * Snímek z generátoru má tmavě modré pozadí. Hologram ale musí stát
 * přímo na stránce, ne v rámečku, takže z jasu děláme průhlednost:
 * co je tmavé, zmizí, co svítí, zůstane. Barva se zpětně dělí alfou,
 * jinak by okraje táhly tmavé pozadí s sebou.
 *
 * Čte tools/base/klara.webp, zapisuje assets/klara.webp — opakovatelné.
 *
 * Spuštění:  PLAYWRIGHT_DIR=<cesta k node_modules> node tools/klara-alpha.mjs
 */
import fs from 'fs';
const pw = await import(
  process.env.PLAYWRIGHT_DIR ? `${process.env.PLAYWRIGHT_DIR}/playwright/index.js` : 'playwright'
);
const chromium = pw.chromium ?? pw.default.chromium;

const ROOT = '/home/user/konsalting-profi-';
const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page = await browser.newPage();

const out = await page.evaluate(async ({data, prah, sklon, gama, orez}) => {
  const img = await new Promise(r => {const i=new Image(); i.onload=()=>r(i); i.src='data:image/webp;base64,'+data});
  const h = Math.round(img.height * orez);
  const c = document.createElement('canvas');
  c.width = img.width; c.height = h;
  const g = c.getContext('2d', {willReadFrequently:true});
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, h);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const lum = (0.299*p[i] + 0.587*p[i+1] + 0.114*p[i+2]) / 255;
    let a = (lum - prah) / sklon;
    a = a < 0 ? 0 : (a > 1 ? 1 : a);
    a = Math.pow(a, gama);
    if (a <= 0.004) { p[i+3] = 0; continue; }
    const del = Math.max(a, 0.5);   // mírnější dělení, jinak okraje vyjedou do kyselé žluté
    p[i]   = Math.min(255, p[i]   / del);
    p[i+1] = Math.min(255, p[i+1] / del);
    p[i+2] = Math.min(255, p[i+2] / del);
    p[i+3] = Math.round(a * 255);
  }
  g.putImageData(d, 0, 0);
  return {data: c.toDataURL('image/webp', 0.82).split(',')[1], w: c.width, h};
}, {
  data: fs.readFileSync(`${ROOT}/tools/base/klara.webp`).toString('base64'),
  prah: 0.11, sklon: 0.72, gama: 0.82, orez: 1,   // podstavec zůstává v záběru, je to zdroj světla
});

const buf = Buffer.from(out.data, 'base64');
fs.writeFileSync(`${ROOT}/assets/klara.webp`, buf);
console.log(`assets/klara.webp ${out.w}×${out.h}, ${buf.length} b`);
await browser.close();
