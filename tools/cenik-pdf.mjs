/* Ceník do PDF. Spouští se ručně po každé změně cen:
 *   PLAYWRIGHT_DIR=/tmp/claude-0/node_modules node tools/cenik-pdf.mjs
 * Vstup je cenik.html, o vzhled se stará jeho @media print. */
const pw = await import(process.env.PLAYWRIGHT_DIR ? `${process.env.PLAYWRIGHT_DIR}/playwright/index.js` : 'playwright');
const chromium = pw.chromium ?? pw.default.chromium;
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-proxy-server']});
const p = await b.newPage();
await p.goto('http://127.0.0.1:8899/cenik.html',{waitUntil:'networkidle'});
await p.emulateMedia({media:'print'});
await p.pdf({path:'assets/konsalting-profi-cenik.pdf',format:'A4',printBackground:true,
  displayHeaderFooter:false,preferCSSPageSize:true});
await b.close();
console.log('hotovo');
