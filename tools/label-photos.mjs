/**
 * Popisky na fotografiích.
 *
 * Čte čisté snímky z tools/base/ (po sjednocení tónu) a zapisuje
 * popsané verze do assets/. Krok je opakovatelný — dvojí spuštění
 * nikdy nevrství text na text.
 *
 * Text neleží na fotce, ale v rovině papíru. Každá plocha je zadaná
 * třemi rohy (A vlevo nahoře, B vpravo nahoře, D vlevo dole); z nich
 * vzniká matice, ve které osa x běží po šířce listu a osa y po jeho
 * délce. Souřadnice i velikost písma jsou pak v pixelech měřených
 * podél těchto os, takže se písmo nedeformuje a přitom sedí v ploše.
 *
 * about.webp  — hřbety pořadačů dostanou názvy firem (smyšlené, ne klienti)
 * step.webp   — tři stohy dostanou razítko a řádek s úkolem
 *
 * Spuštění:  PLAYWRIGHT_DIR=<cesta k node_modules> node tools/label-photos.mjs
 */
import fs from 'fs';
// playwright se do package.json nedává — Netlify by ho tahal při každém buildu.
// Cestu k lokálně nainstalovanému balíku předej přes PLAYWRIGHT_DIR.
const pw = await import(
  process.env.PLAYWRIGHT_DIR ? `${process.env.PLAYWRIGHT_DIR}/playwright/index.js` : 'playwright'
);
const chromium = pw.chromium ?? pw.default.chromium;

const ROOT = '/home/user/konsalting-profi-';
const BASE = `${ROOT}/tools/base`;
const OUT  = `${ROOT}/assets`;

/* Hřbety pořadačů v about.webp.
   Police stoupá zprava doleva, horní hrana skoro vodorovná — proto má
   každý hřbet vlastní rohy. A = levý horní, B = pravý horní, D = levý dolní. */
const yTop = x => 242 + (x - 315) * 0.0588;
const yBot = x => 402 + (x - 320) * 0.320;
const hrbet = (x0, x1, text) => ({
  A: [x0, yTop(x0)], B: [x1, yTop(x1)], D: [x0, yBot(x0)], text,
});
const HRBETY = [
  hrbet(317, 350, 'VLTAVA STAV s.r.o.'),
  hrbet(354, 390, 'NOVOTNÝ SERVIS s.r.o.'),
  hrbet(394, 430, 'BĚLÁK TRANS s.r.o.'),
  hrbet(433, 477, 'HAVLÍK CAFÉ s.r.o.'),
];

/* Stohy dokladů v step.webp — horní list každého stohu.
   Řádky běží po horní hraně listu, tedy dolů doprava. */
const STOHY = [
  {A:[235,  0], B:[390,  95], D:[ 25, 160], razitko:'VYŘEŠENO', ukol:'DPH – 2. čtvrtletí 2026'},
  {A:[415,115], B:[610, 210], D:[228, 272], razitko:'UZAVŘENO', ukol:'Roční závěrka 2025'},
  {A:[628,240], B:[840, 322], D:[440, 432], razitko:'PODÁNO',   ukol:'Přiznání k DPPO'},
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
  const sub  = (p,q) => [p[0]-q[0], p[1]-q[1]];
  const len  = v => Math.hypot(v[0], v[1]);
  const unit = v => {const l = len(v); return [v[0]/l, v[1]/l]};
  const rad  = d => d * Math.PI / 180;

  /* Přepne kreslení do roviny zadané rohy. Osa x jde od A k B, osa y od A k D,
     obojí v pixelech měřených podél hrany — písmo se tedy nesmršťuje. */
  const doRoviny = (g, {A, B, D}) => {
    const ex = unit(sub(B, A)), ey = unit(sub(D, A));
    g.setTransform(ex[0], ex[1], ey[0], ey[1], A[0], A[1]);
    return {w: len(sub(B, A)), h: len(sub(D, A))};
  };
  /* Zmenší písmo, dokud se text nevejde do zadané šířky. */
  const vejdiSe = (g, text, max, size, weight) => {
    g.font = `${weight} ${size}px "DejaVu Sans", sans-serif`;
    while (g.measureText(text).width > max && size > 6) {
      size -= 0.5;
      g.font = `${weight} ${size}px "DejaVu Sans", sans-serif`;
    }
    return size;
  };

  /* --- hřbety pořadačů --- */
  const aboutC = canvasOf(await load(about));
  {
    const g = aboutC.getContext('2d');
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgba(58,44,30,0.38)';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const h of hrbety) {
      g.save();
      // text běží po hřbetu dolů, hlavy písmen míří doprava (evropský zvyk)
      const ex = unit(sub(h.D, h.A)), ey = unit(sub(h.B, h.A));
      const dl = len(sub(h.D, h.A)), sir = len(sub(h.B, h.A));
      g.setTransform(ex[0], ex[1], -ey[0], -ey[1], h.B[0], h.B[1]);
      g.letterSpacing = '0.6px';
      vejdiSe(g, h.text, dl * 0.86, sir * 0.52, 600);
      g.fillText(h.text, dl * 0.5, sir * 0.5);
      g.restore();
    }
  }

  /* --- stohy dokladů --- */
  const stepC = canvasOf(await load(step));
  {
    const g = stepC.getContext('2d');
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const s of stohy) {
      g.save();
      const {w, h} = doRoviny(g, s);
      g.globalCompositeOperation = 'multiply';

      // řádek s úkolem — jako strojem dopsaný popisek nad razítkem
      g.save();
      g.fillStyle = 'rgba(40,34,26,0.58)';
      g.letterSpacing = '0.4px';
      vejdiSe(g, s.ukol, w * 0.72, w * 0.082, 400);
      g.fillText(s.ukol, w * 0.5, h * 0.30);
      g.restore();

      // razítko — mírně nakřivo vůči listu, jak se razítka opravdu otiskují
      g.translate(w * 0.5, h * 0.42);
      g.rotate(rad(-5));
      g.globalAlpha = 0.62;
      g.strokeStyle = '#16264F';
      g.fillStyle = '#16264F';
      g.letterSpacing = `${w * 0.014}px`;
      const size = vejdiSe(g, s.razitko, w * 0.62, w * 0.135, 700);
      const tw = g.measureText(s.razitko).width;
      const pw = tw + size * 1.25, ph = size * 1.75, r = size * 0.18;
      g.lineWidth = Math.max(1.4, size * 0.10);
      g.beginPath();
      g.moveTo(-pw/2 + r, -ph/2);
      g.arcTo( pw/2, -ph/2,  pw/2,  ph/2, r);
      g.arcTo( pw/2,  ph/2, -pw/2,  ph/2, r);
      g.arcTo(-pw/2,  ph/2, -pw/2, -ph/2, r);
      g.arcTo(-pw/2, -ph/2,  pw/2, -ph/2, r);
      g.closePath();
      g.stroke();
      g.fillText(s.razitko, 0, size * 0.06);
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
