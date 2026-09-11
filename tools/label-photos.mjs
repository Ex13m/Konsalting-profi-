/**
 * Popisky na fotografiích.
 *
 * Čte čisté snímky z tools/base/ (po sjednocení tónu) a zapisuje
 * popsané verze do assets/. Díky tomu je krok opakovatelný — spuštění
 * dvakrát po sobě nikdy nevrství text na text.
 *
 * about.webp  — hřbety pořadačů dostanou názvy firem (smyšlené, ne klienti)
 * step.webp   — tři stohy dostanou razítko a řádek s úkolem
 *
 * Spuštění:  node tools/label-photos.mjs
 * Vyžaduje:  PLAYWRIGHT_DIR=<cesta k node_modules>
 */
// playwright se do package.json nedává — Netlify by ho tahal při každém buildu.
// Cestu k lokálně nainstalovanému balíku předej přes PLAYWRIGHT_DIR.
const pw = await import(
  process.env.PLAYWRIGHT_DIR ? `${process.env.PLAYWRIGHT_DIR}/playwright/index.js` : 'playwright'
);
const chromium = pw.chromium ?? pw.default.chromium;
import fs from 'fs';

const ROOT = '/home/user/konsalting-profi-';
const BASE = `${ROOT}/tools/base`;
const OUT  = `${ROOT}/assets`;

// hřbety: střed, výška, sklon, text
const HRBETY = [
  {x:333, y:333, h:172, rot:-1.5, size:15, text:'VLTAVA STAV s.r.o.'},
  {x:372, y:337, h:178, rot:-1.5, size:15, text:'NOVOTNÝ SERVIS s.r.o.'},
  {x:412, y:342, h:182, rot:-1.5, size:15, text:'BĚLÁK TRANS s.r.o.'},
  {x:455, y:348, h:186, rot:-1.5, size:15, text:'HAVLÍK CAFÉ s.r.o.'},
];

// stohy: střed horního listu, sklon papíru, razítko, úkol
const STOHY = [
  {x:218, y:132, rot:-10, razitko:'VYŘEŠENO', ukol:'DPH – 2. čtvrtletí 2026'},
  {x:420, y:255, rot:-10, razitko:'UZAVŘENO', ukol:'Roční závěrka 2025'},
  {x:645, y:385, rot:-10, razitko:'PODÁNO',   ukol:'Přiznání k DPPO'},
];

const b64 = f => fs.readFileSync(f).toString('base64');
const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page = await browser.newPage();

const out = await page.evaluate(async ({about, step, hrbety, stohy}) => {
  const load = d => new Promise(r => {const i=new Image(); i.onload=()=>r(i); i.src='data:image/webp;base64,'+d});
  const canvasOf = img => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
  };
  const rad = d => d * Math.PI / 180;

  /* --- hřbety pořadačů: text svisle, sotva znatelně --- */
  const aboutC = canvasOf(await load(about));
  {
    const g = aboutC.getContext('2d');
    g.globalCompositeOperation = 'multiply';
    for (const h of hrbety) {
      g.save();
      g.translate(h.x, h.y);
      g.rotate(rad(h.rot - 90));           // text běží zdola nahoru po hřbetu
      let size = h.size;
      g.font = `600 ${size}px "DejaVu Sans", sans-serif`;
      g.letterSpacing = '0.6px';
      while (g.measureText(h.text).width > h.h - 16 && size > 9) {
        size -= 0.5;
        g.font = `600 ${size}px "DejaVu Sans", sans-serif`;
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(58,44,30,0.33)';  // tmavší odstín papíru, ne černá
      g.fillText(h.text, 0, 0);
      g.restore();
    }
  }

  /* --- stohy: razítko a strojopisný řádek --- */
  const stepC = canvasOf(await load(step));
  {
    const g = stepC.getContext('2d');
    for (const s of stohy) {
      // úkol — drobný řádek nad razítkem, jako popisek psaný rukou stroje
      g.save();
      g.globalCompositeOperation = 'multiply';
      g.translate(s.x, s.y);
      g.rotate(rad(s.rot));
      g.font = '400 13px "DejaVu Sans", sans-serif';
      g.letterSpacing = '0.4px';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(40,34,26,0.55)';
      g.fillText(s.ukol, 0, -26);
      g.restore();

      // razítko — mírně nakřivo vůči papíru, jak se razítka opravdu tisknou
      g.save();
      g.globalCompositeOperation = 'multiply';
      g.globalAlpha = 0.62;
      g.translate(s.x, s.y + 6);
      g.rotate(rad(s.rot - 5));
      g.font = '700 24px "DejaVu Sans", sans-serif';
      g.letterSpacing = '2.5px';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const w = g.measureText(s.razitko).width;
      g.strokeStyle = '#16264F';
      g.fillStyle = '#16264F';
      g.lineWidth = 2.2;
      const pw = w + 30, ph = 42, r = 4;
      g.beginPath();
      g.moveTo(-pw/2 + r, -ph/2);
      g.arcTo( pw/2, -ph/2,  pw/2,  ph/2, r);
      g.arcTo( pw/2,  ph/2, -pw/2,  ph/2, r);
      g.arcTo(-pw/2,  ph/2, -pw/2, -ph/2, r);
      g.arcTo(-pw/2, -ph/2,  pw/2, -ph/2, r);
      g.closePath();
      g.stroke();
      g.fillText(s.razitko, 0, 1);
      g.restore();
    }
  }

  return {
    'about.webp': aboutC.toDataURL('image/webp', 0.78).split(',')[1],
    'step.webp':  stepC.toDataURL('image/webp', 0.78).split(',')[1],
  };
}, {about: b64(`${BASE}/about.webp`), step: b64(`${BASE}/step.webp`), hrbety: HRBETY, stohy: STOHY});

for (const [name, data] of Object.entries(out)) {
  const buf = Buffer.from(data, 'base64');
  fs.writeFileSync(`${OUT}/${name}`, buf);
  console.log(name, buf.length + 'b');
}
await browser.close();
