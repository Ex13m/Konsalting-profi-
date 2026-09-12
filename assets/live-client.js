/* Hlasový hovor s Klárou — klientská část.
 *
 * Prohlížeč si vyžádá krátkodobý token u naší funkce a s ním naváže
 * WebRTC spojení přímo s modelem. Trvalý klíč sem nikdy nechodí.
 *
 * Kdo zrovna mluví se nepoznává z událostí modelu, ale z hlasitosti obou
 * zvukových stop. Je to nezávislé na tom, jak se události jmenují, takže
 * ukazatel funguje i když se API pojmenuje jinak, než jsme čekali.
 *
 * ⚠ Adresa spojení a název datového kanálu nebyly ověřeny proti
 * dokumentaci gpt-live-1 — viz KONFIG. Mění se jen tady.
 */
(function () {
  "use strict";

  const KONFIG = {
    SESSION: "/api/live-session",
    /* GA rozhraní: WebRTC se navazuje přes /calls. Model se neposílá —
       je už zapečený v efemérním klíči, který vydal server. */
    RTC: "https://api.openai.com/v1/realtime/calls",
    MODEL_V_URL: false,
    KANAL: "oai-events",
    ICE: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const PRAH = 0.018;   // pod tím je ticho
  const DRZET = 420;    // ms, aby ukazatel „mluví“ neposkakoval mezi slovy

  let stav = null;

  /* Náhodná značka prohlížeče. Není v ní nic o člověku — slouží jen k tomu,
     aby OpenAI uměla zakročit proti jednomu zneuživateli, ne proti celému
     účtu. Server ji ještě prožene hashem. */
  function znacka() {
    try {
      let z = localStorage.getItem("kp-live-id");
      if (!z) {
        z = (crypto.randomUUID && crypto.randomUUID()) ||
            String(Date.now()) + Math.random().toString(36).slice(2);
        localStorage.setItem("kp-live-id", z);
      }
      return z;
    } catch (e) {
      return "";
    }
  }

  /* ---- měření hlasitosti ------------------------------------------- */
  function merak(ac, stream) {
    const src = ac.createMediaStreamSource(stream);
    const an = ac.createAnalyser();
    an.fftSize = 512;
    an.smoothingTimeConstant = 0.6;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    return () => {
      an.getFloatTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      return Math.sqrt(s / buf.length);
    };
  }

  async function start(lang, ud) {
    if (stav) return;
    const hlas = (t, d) => { try { ud[t] && ud[t](d) } catch (e) {} };

    stav = { zavreno: false, casovace: [] };
    hlas("stav", "connecting");

    /* 1. token */
    let s;
    try {
      const r = await fetch(KONFIG.SESSION, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: lang || "cs", uid: znacka() }),
      });
      s = await r.json();
      if (!r.ok || !s.token) throw new Error(s.detail || s.error || "no token");
    } catch (e) {
      console.error("live: sesse", e);
      stop("error");
      hlas("chyba", "session");
      return;
    }
    if (stav.zavreno) return;

    /* 2. mikrofon */
    let mic;
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      console.error("live: mikrofon", e);
      stop("error");
      hlas("chyba", "mic");
      return;
    }
    if (stav.zavreno) { mic.getTracks().forEach((t) => t.stop()); return; }
    stav.mic = mic;

    /* 3. spojení */
    try {
      const pc = new RTCPeerConnection({ iceServers: KONFIG.ICE });
      stav.pc = pc;

      const zvuk = new Audio();
      zvuk.autoplay = true;
      stav.zvuk = zvuk;
      pc.ontrack = (e) => { zvuk.srcObject = e.streams[0]; napojMeraky(e.streams[0]) };

      pc.addTrack(mic.getAudioTracks()[0], mic);

      const dc = pc.createDataChannel(KONFIG.KANAL);
      stav.dc = dc;
      dc.onmessage = (e) => {
        /* Události bereme jen jako bonus — ukazatel jede z hlasitosti.
           Zajímá nás vlastně jediné: jestli model nehlásí chybu. */
        try {
          const m = JSON.parse(e.data);
          if (m && typeof m.type === "string" && m.type.indexOf("error") >= 0) {
            console.warn("live: událost", m);
          }
        } catch (err) {}
      };

      pc.onconnectionstatechange = () => {
        if (!stav) return;
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          stop("error");
          hlas("chyba", "spojeni");
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const adresa = KONFIG.RTC + (KONFIG.MODEL_V_URL ? "?model=" + encodeURIComponent(s.model) : "");
      const r = await fetch(adresa, {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: "Bearer " + s.token, "Content-Type": "application/sdp" },
      });
      if (!r.ok) throw new Error("sdp " + r.status + " " + (await r.text()).slice(0, 300));
      await pc.setRemoteDescription({ type: "answer", sdp: await r.text() });
    } catch (e) {
      console.error("live: webrtc", e);
      stop("error");
      hlas("chyba", "spojeni");
      return;
    }
    if (stav.zavreno) return;

    /* 4. ukazatele a hodiny */
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    stav.ac = ac;
    const mikMer = merak(ac, mic);
    let klaraMer = null;
    function napojMeraky(stream) { try { klaraMer = merak(ac, stream) } catch (e) {} }

    const zacatek = Date.now();
    const limit = (s.max_seconds || 480) * 1000;
    let mluviDo = 0;

    (function snimek() {
      if (!stav || stav.zavreno) return;
      const m = mikMer();
      const k = klaraMer ? klaraMer() : 0;
      if (k > PRAH) mluviDo = Date.now() + DRZET;
      const mluvi = Date.now() < mluviDo;
      hlas("uroven", { mikrofon: stav.ticho ? 0 : m, klara: k });
      hlas("stav", stav.ticho ? "muted" : mluvi ? "speaking" : "listening");
      hlas("cas", Math.floor((Date.now() - zacatek) / 1000));
      stav.raf = requestAnimationFrame(snimek);
    })();

    stav.casovace.push(setTimeout(() => hlas("varovani", 60), Math.max(0, limit - 60000)));
    stav.casovace.push(setTimeout(() => { stop("limit"); hlas("konec", "limit") }, limit));

    hlas("spojeno", true);
  }

  function ticho(zap) {
    if (!stav || !stav.mic) return false;
    stav.ticho = !!zap;
    stav.mic.getAudioTracks().forEach((t) => { t.enabled = !zap });
    return stav.ticho;
  }

  function stop(duvod) {
    const s = stav;
    if (!s) return;
    stav = null;
    s.zavreno = true;
    s.casovace.forEach(clearTimeout);
    if (s.raf) cancelAnimationFrame(s.raf);
    try { s.dc && s.dc.close() } catch (e) {}
    try { s.pc && s.pc.close() } catch (e) {}
    try { s.mic && s.mic.getTracks().forEach((t) => t.stop()) } catch (e) {}
    try { if (s.zvuk) { s.zvuk.pause(); s.zvuk.srcObject = null } } catch (e) {}
    try { s.ac && s.ac.close() } catch (e) {}
    return duvod;
  }

  /* Tlačítko se ukáže jen když je funkce nasazená a zapnutá. */
  async function dostupne() {
    try {
      const r = await fetch(KONFIG.SESSION, { method: "GET" });
      if (!r.ok) return false;
      const j = await r.json();
      return !!j.enabled;
    } catch (e) {
      return false;
    }
  }

  window.KPLive = { start, stop, ticho, dostupne, bezi: () => !!stav };
})();
