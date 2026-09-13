/* Klára naživo — projekce reaguje na to, co zrovna říká.
 *
 * Není to animace obličeje po hláskách; na to by byla potřeba nakreslená
 * ústa pro každou hlásku. Je to řeč těla hologramu: na slabikách projekce
 * mihotne a škubne, na konci věty Klára přikývne, celou dobu se nepatrně
 * pohupuje a dýchá a obrazem projíždí obnovovací pruh, který při řeči
 * zrychlí. Ústa se u toho otevírají podle hlasitosti.
 *
 * Kreslí se z jediné průhledné fotky ve třech vodorovných pruzích, takže
 * není potřeba žádné natáčení ani další soubor. Souřadnice obličeje jsou
 * v podílech obrázku — když se fotka vymění, dolaďuje se jen objekt TVAR.
 */
(function () {
  "use strict";

  const TVAR = {
    krk: 0.305,      // pod nosem — odtud se obličej protahuje
    brada: 0.425,    // pod bradou — sem sahá protažení
    ustaX: 0.500,
    ustaY: 0.347,
    ustaS: 0.105,    // šířka úst
    ustaV: 0.018,    // nejvyšší možná mezera mezi rty
    klesBrady: 0.012 // jak hluboko smí brada klesnout
  };

  const ZESIL = 3.2;     // řeč se drží kolem 0.05–0.15, naplno jen ve špičce
  const NAJEZD = 0.55;   // rty se otevírají rychle
  const DOJEZD = 0.16;   // a zavírají pomaleji, jinak to cvaká
  const SLABIKA = 0.11;  // skok hlasitosti, který bereme jako začátek slabiky
  const MLUVI = 0.20;    // nad tím se považuje za řeč
  const PAUZA = 200;     // ms ticha, po kterých je věta u konce
  const KYV = 760;       // jak dlouho trvá přikývnutí

  let plat = null, ctx = null, obr = null, raf = null, zive = false;
  let cil = 0, ted = 0, pred = 0;
  let spicka = 0, mluvilOd = 0, tichoOd = 0, kyvOd = 0;

  /* ---- pomocné křivky ------------------------------------------------ */
  const tlum = (x) => Math.exp(-x * 3.4);
  /* přikývnutí: rychlý pohyb dolů, pomalejší zpět, s dozvukem */
  const prikyvnuti = (dt) => (dt < 0 || dt > KYV ? 0 : tlum(dt / KYV) * Math.sin((dt / KYV) * 6.6));

  function kresli(t) {
    if (!zive) return;

    /* ---- co dělá hlas -------------------------------------------------- */
    const skok = cil - pred;
    pred = cil;
    if (skok > SLABIKA) spicka = 1;          // začátek slabiky
    spicka *= 0.80;
    ted += (cil - ted) * (cil > ted ? NAJEZD : DOJEZD);

    if (ted > MLUVI) {
      if (!mluvilOd) mluvilOd = t;
      tichoOd = 0;
    } else if (mluvilOd) {
      if (!tichoOd) tichoOd = t;
      else if (t - tichoOd > PAUZA) {
        /* dořekla větu — jen pokud předtím chvíli mluvila, ne po zakašlání */
        if (tichoOd - mluvilOd > 500) kyvOd = t;
        mluvilOd = 0; tichoOd = 0;
      }
    }
    const kyv = prikyvnuti(t - kyvOd);

    const W = plat.width, H = plat.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    /* ---- pohupování, dýchání, škubnutí na slabice ---------------------- */
    const dech = Math.sin(t / 1700) * 0.004 + ted * 0.003;
    const zivost = 1 + ted * 0.7;            // při řeči se pohyb trochu rozjede
    const naklon = (Math.sin(t / 2300) * 0.9 + Math.sin(t / 900) * 0.35) * zivost
                 + spicka * (Math.random() - 0.5) * 2.4;
    ctx.globalAlpha = 0.97 - spicka * 0.16;  // mihotnutí přesně na slabice
    ctx.translate(W / 2 + naklon, H);
    ctx.scale(1 + dech, 1 + dech);
    ctx.translate(-W / 2, -H);

    /* ---- postava ve třech pruzích -------------------------------------- */
    const sirka = obr.naturalWidth, vyska = obr.naturalHeight;
    const y1 = TVAR.krk * vyska, y2 = TVAR.brada * vyska;
    const mer = H / vyska;                       // z obrázku na plátno
    const kles = ted * TVAR.klesBrady * vyska;   // o kolik klesne brada
    const hlava = kyv * 0.020 * vyska;           // o kolik se skloní hlava
    const smrst = 1 - Math.abs(kyv) * 0.02;      // a jak se u toho zkrátí

    ctx.drawImage(obr, 0, 0, sirka, y1,
                  0, hlava * mer, W, y1 * smrst * mer);
    ctx.drawImage(obr, 0, y1, sirka, y2 - y1,
                  0, (y1 * smrst + hlava) * mer, W, (y2 - y1 + kles) * mer);
    ctx.drawImage(obr, 0, y2, sirka, vyska - y2,
                  0, (y1 * smrst + hlava + y2 - y1 + kles) * mer,
                  W, (vyska - y2 - kles - hlava - y1 * (smrst - 1)) * mer);

    /* ---- mezera mezi rty: díra v projekci, ne tmavá skvrna ------------- */
    if (ted > 0.03) {
      const cx = TVAR.ustaX * W;
      const cy = (TVAR.ustaY * vyska * smrst + hlava + kles * 0.45) * mer;
      const rx = TVAR.ustaS * W * (0.30 + ted * 0.16);
      const ry = TVAR.ustaV * H * ted;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      g.addColorStop(0, "rgba(0,0,0,.55)");
      g.addColorStop(0.6, "rgba(0,0,0,.28)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.283);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    /* ---- obnovovací pruh: při řeči projede obrazem rychleji ------------ */
    ctx.globalCompositeOperation = "lighter";
    const rychlost = 0.055 + ted * 0.14;
    const py = ((t * rychlost) % (H * 1.4)) - H * 0.2;
    const pruh = ctx.createLinearGradient(0, py - H * 0.06, 0, py + H * 0.06);
    pruh.addColorStop(0, "rgba(224,177,115,0)");
    pruh.addColorStop(0.5, "rgba(224,177,115," + (0.05 + ted * 0.09).toFixed(3) + ")");
    pruh.addColorStop(1, "rgba(224,177,115,0)");
    ctx.fillStyle = pruh;
    ctx.fillRect(0, py - H * 0.06, W, H * 0.12);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    raf = requestAnimationFrame(kresli);
  }

  function rozmer() {
    if (!plat) return;
    const r = plat.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round((r.width || 264) * dpr), h = Math.round((r.height || 352) * dpr);
    if (plat.width !== w || plat.height !== h) { plat.width = w; plat.height = h }
  }

  function start(canvas, src) {
    if (zive) return Promise.resolve(true);
    plat = canvas;
    ctx = plat.getContext("2d");
    return new Promise((hotovo) => {
      if (obr && obr.src.indexOf(src) >= 0 && obr.complete) return hotovo(true);
      obr = new Image();
      obr.onload = () => hotovo(true);
      obr.onerror = () => hotovo(false);
      obr.src = src;
    }).then((ok) => {
      if (!ok) return false;
      zive = true;
      cil = ted = pred = spicka = 0;
      mluvilOd = tichoOd = kyvOd = 0;
      rozmer();
      addEventListener("resize", rozmer);
      raf = requestAnimationFrame(kresli);
      return true;
    });
  }

  function uroven(v) {
    cil = Math.max(0, Math.min(1, (v || 0) * ZESIL));
  }

  /* Přikývnutí se dá vyvolat i zvenčí — až budou z modelu chodit události,
     hodí se na „rozumím“ ve chvíli, kdy Klára poslouchá a nemluví. */
  function prikyvni() {
    if (zive) kyvOd = performance.now();
  }

  function stop() {
    zive = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    removeEventListener("resize", rozmer);
    if (ctx && plat) ctx.clearRect(0, 0, plat.width, plat.height);
  }

  window.KPZive = { start, uroven, prikyvni, stop, bezi: () => zive };
})();
