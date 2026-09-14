/* Ceník do PDF, jeden soubor na jazyk. Spouští se ručně po každé změně cen
 * nebo překladů — jinak se PDF rozejde se stránkou:
 *
 *   python3 -m http.server 8899 &
 *   PLAYWRIGHT_DIR=/tmp/claude-0/node_modules node tools/cenik-pdf.mjs
 *
 * Vstup je cenik.html; jazyk se mu podává v adrese, o vzhled se stará
 * jeho @media print. Česká verze si drží jméno bez přípony, ať zůstane
 * platný odkaz, který už mohl někdo někam vložit.
 */
const JAZYKY = ['cs', 'en', 'ru', 'uk', 'de', 'pl'];
const ADRESA = process.env.CENIK_URL || 'http://127.0.0.1:8899/cenik.html';

const pw = await import(process.env.PLAYWRIGHT_DIR ? `${process.env.PLAYWRIGHT_DIR}/playwright/index.js` : 'playwright');
const chromium = pw.chromium ?? pw.default.chromium;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] });

for (const jazyk of JAZYKY) {
  const p = await b.newPage();
  await p.goto(`${ADRESA}?lang=${jazyk}`, { waitUntil: 'networkidle' });
  /* překlad běží až po načtení slovníku — počkáme, až stránka odkryje sebe sama */
  await p.waitForFunction(() => !document.documentElement.classList.contains('preklad'), { timeout: 5000 });
  await p.emulateMedia({ media: 'print' });
  const soubor = jazyk === 'cs'
    ? 'assets/konsalting-profi-cenik.pdf'
    : `assets/konsalting-profi-cenik-${jazyk}.pdf`;
  await p.pdf({ path: soubor, format: 'A4', printBackground: true,
    displayHeaderFooter: false, preferCSSPageSize: true });
  await p.close();
  console.log(soubor);
}
await b.close();
