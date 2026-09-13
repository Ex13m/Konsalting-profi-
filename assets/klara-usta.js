/* Klára mluví — pohyb úst a hlavy podle hlasitosti jejího hlasu.
 *
 * Žádné natáčení, žádná další data: bere se hotová průhledná fotka
 * a kreslí se na plátno ve třech pruzích. Pruh s bradou se podle
 * hlasitosti protahuje dolů, takže se ústa otevřou a brada klesne;
 * nad ústy se do plátna vyřízne měkká díra, aby otevřená ústa
 * vypadala jako mezera v projekci, ne jako tmavá skvrna.
 *
 * Souřadnice jsou v podílech obrázku, ne v pixelech — snímek se dá
 * vyměnit za jiný a stačí je doladit tady.
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

  const ZESIL = 3.2;    // řeč se drží kolem 0.05–0.15, naplno jen ve špičce
  const NAJEZD = 0.55;  // rty se otevírají rychle
  const DOJEZD = 0.16;  // a zavírají pomaleji, jinak to cvaká

  let plat = null, ctx = null, obr = null, raf = null;
  let cil = 0, ted = 0, zive = false;

  function kresli(t) {
    if (!zive) return;
    const k = cil > ted ? NAJEZD : DOJEZD;
    ted += (cil - ted) * k;

    const W = plat.width, H = plat.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    /* lehké dýchání a nepatrné pohupování — projekce nikdy nestojí */
    const dech = Math.sin(t / 1700) * 0.004 + ted * 0.003;
    const naklon = Math.sin(t / 2300) * 0.9 + Math.sin(t / 900) * 0.35;
    ctx.translate(W / 2 + naklon, H);
    ctx.scale(1 + dech, 1 + dech);
    ctx.translate(-W / 2, -H);

    const sirka = obr.naturalWidth, vyska = obr.naturalHeight;
    const y1 = TVAR.krk * vyska, y2 = TVAR.brada * vyska;
    const mer = H / vyska;                       // z obrázku na plátno
    const kles = ted * TVAR.klesBrady * vyska;   // o kolik brada klesne

    /* 1. vše nad nosem beze změny */
    ctx.drawImage(obr, 0, 0, sirka, y1, 0, 0, W, y1 * mer);
    /* 2. obličej od nosu po bradu — protažený dolů */
    ctx.drawImage(obr, 0, y1, sirka, y2 - y1, 0, y1 * mer, W, (y2 - y1 + kles) * mer);
    /* 3. krk a ramena — o tolik stlačené, aby nevznikl šev */
    ctx.drawImage(obr, 0, y2, sirka, vyska - y2, 0, (y2 + kles) * mer, W, (vyska - y2 - kles) * mer);

    /* 4. mezera mezi rty: díra v projekci, ne tmavá skvrna */
    if (ted > 0.03) {
      const cx = TVAR.ustaX * W;
      const cy = (TVAR.ustaY * vyska + kles * 0.45) * mer;
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
      zive = true; cil = 0; ted = 0;
      rozmer();
      addEventListener("resize", rozmer);
      raf = requestAnimationFrame(kresli);
      return true;
    });
  }

  function uroven(v) {
    cil = Math.max(0, Math.min(1, (v || 0) * ZESIL));
  }

  function stop() {
    zive = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    removeEventListener("resize", rozmer);
    if (ctx && plat) ctx.clearRect(0, 0, plat.width, plat.height);
  }

  window.KPUsta = { start, uroven, stop, bezi: () => zive };
})();
