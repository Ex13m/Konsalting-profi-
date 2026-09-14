/**
 * Objednání konzultace — příjem rezervací z webu.
 *
 * GET  /api/objednat   → { obsazeno: ["2026-09-16T10:00", …] }
 *   Jen časy, nic o lidech. Kalendář na webu si podle toho zašedne bloky.
 *
 * POST /api/objednat   → { ok, id, mail }
 *   Uloží rezervaci, pošle e-mail kanceláři a potvrzení klientovi.
 *
 * Nasazení: Netlify → Site settings → Environment variables
 *   RESEND_API_KEY   volitelné — bez něj se rezervace uloží, ale nic neodejde
 *   RESEND_FROM      volitelné, výchozí "Konsalting Profi <onboarding@resend.dev>"
 *   OBJEDNANI_MAIL   volitelné, kam chodí avíza; výchozí konsaltingprofi@gmail.com
 *
 * Úložiště jsou Netlify Blobs. Když nejsou k dispozici (lokální běh),
 * funkce to řekne rovnou a nic nepředstírá — horší než nepřijatá
 * rezervace je rezervace, o které si člověk myslí, že platí.
 */

const DNY_SCHUZEK = [1, 3];             // pondělí, středa
const BLOKY = ["10:00", "11:00"];       // začátky hodinových bloků
const DELKA_MIN = 45;                   // délka konzultace
const DOPREDU_DNI = 60;                 // jak daleko dopředu se dá objednat
const UCHOVANI_DNI = 365;               // po roce se záznam maže sám
const LIMIT_IP = 3;                     // rezervací z jedné adresy za den
const MIN_VYPLNENI_MS = 3000;           // rychleji než za tři vteřiny píše robot

const KANCELAR = process.env.OBJEDNANI_MAIL || "konsaltingprofi@gmail.com";
const ODESILATEL = process.env.RESEND_FROM || "Konsalting Profi <onboarding@resend.dev>";

const POVOLENE_ORIGINY = [
  "https://konsalting.netlify.app",
  "https://konsalting.cz",
  "https://www.konsalting.cz",
];

/* Potvrzení chodí v jazyce, ve kterém si člověk web přepnul. */
const TEXTY = {
  cs: { p: "Potvrzení termínu — Konsalting Profi", a: "Dobrý den", b: "máme pro vás rezervovaný termín nezávazné konzultace:",
        c: "Konzultace trvá 45 minut a nic za ni neplatíte.", d: "Kdyby se termín nehodil, zavolejte na +420 773 966 787.", e: "Těšíme se na vás." },
  en: { p: "Appointment confirmed — Konsalting Profi", a: "Hello", b: "your no-obligation consultation is booked for:",
        c: "The consultation takes 45 minutes and is free of charge.", d: "If the time does not suit you, call +420 773 966 787.", e: "We look forward to meeting you." },
  ru: { p: "Подтверждение записи — Konsalting Profi", a: "Здравствуйте", b: "для вас забронирована необязывающая консультация:",
        c: "Консультация длится 45 минут и ничего не стоит.", d: "Если время не подходит, позвоните на +420 773 966 787.", e: "Будем рады встрече." },
  uk: { p: "Підтвердження запису — Konsalting Profi", a: "Доброго дня", b: "для вас заброньована необов'язкова консультація:",
        c: "Консультація триває 45 хвилин і нічого не коштує.", d: "Якщо час не підходить, зателефонуйте на +420 773 966 787.", e: "Будемо раді зустрічі." },
  de: { p: "Termin bestätigt — Konsalting Profi", a: "Guten Tag", b: "Ihr unverbindliches Beratungsgespräch ist reserviert:",
        c: "Das Gespräch dauert 45 Minuten und ist kostenlos.", d: "Passt der Termin nicht, rufen Sie +420 773 966 787 an.", e: "Wir freuen uns auf Sie." },
  pl: { p: "Potwierdzenie terminu — Konsalting Profi", a: "Dzień dobry", b: "mamy dla Państwa zarezerwowany niezobowiązujący termin konsultacji:",
        c: "Konsultacja trwa 45 minut i jest bezpłatna.", d: "Jeśli termin nie pasuje, proszę zadzwonić na +420 773 966 787.", e: "Czekamy na Państwa." },
};

const ADRESA = "Rubeška 383/4, 190 00 Praha 9 – Vysočany";

/* ── pomocné ─────────────────────────────────────────────────────────── */

const dnesKlic = () => new Date().toISOString().slice(0, 10);
const klicSlotu = (den, cas) => `slot/${den}T${cas}`;

/** Datum ve tvaru YYYY-MM-DD jako den v pražském kalendáři, bez posunu. */
function denZeStringu(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [r, m, d] = s.split("-").map(Number);
  const x = new Date(Date.UTC(r, m - 1, d, 12));
  if (x.getUTCFullYear() !== r || x.getUTCMonth() !== m - 1 || x.getUTCDate() !== d) return null;
  return x;
}

async function uloziste() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "objednavky", consistency: "strong" });
}

async function otiskIP(req) {
  const ip = req.headers.get("x-nf-client-connection-ip")
    || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "neznama";
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("kp-objednani:" + ip));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

/** Pozvánka do kalendáře. Stejný tvar, jaký si člověk stáhne na webu. */
function ics(den, cas, id) {
  const [hh, mm] = cas.split(":").map(Number);
  const konec = new Date(Date.UTC(2000, 0, 1, hh, mm + DELKA_MIN));
  const dva = (n) => String(n).padStart(2, "0");
  const bezPomlcek = den.replace(/-/g, "");
  const raz = (h, m) => `${bezPomlcek}T${dva(h)}${dva(m)}00`;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Konsalting Profi//Konzultace//CS",
    "BEGIN:VEVENT", `UID:kp-${id}@konsalting.cz`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/Prague:${raz(hh, mm)}`,
    `DTEND;TZID=Europe/Prague:${raz(konec.getUTCHours(), konec.getUTCMinutes())}`,
    "SUMMARY:Konzultace — Konsalting Profi",
    `LOCATION:${ADRESA.replace(/,/g, "\\,")}`,
    "DESCRIPTION:Nezávazná úvodní konzultace. Telefon: +420 773 966 787",
    "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY",
    "DESCRIPTION:Konzultace Konsalting Profi", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

async function posli(zpravy) {
  const klic = process.env.RESEND_API_KEY;
  if (!klic) return false;
  try {
    const odpovedi = await Promise.all(zpravy.map((z) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${klic}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: ODESILATEL, ...z }),
      })));
    return odpovedi.every((r) => r.ok);
  } catch {
    return false;
  }
}

/* ── kontrola vstupu ─────────────────────────────────────────────────── */

function zkontroluj(t) {
  const den = denZeStringu(String(t.den || ""));
  if (!den) return "Neplatné datum.";
  if (!DNY_SCHUZEK.includes(den.getUTCDay())) return "Na tento den se schůzky nepřijímají.";
  const dnes = denZeStringu(dnesKlic());
  const odstup = Math.round((den - dnes) / 86400000);
  if (odstup < 1) return "Termín musí být v budoucnu.";
  if (odstup > DOPREDU_DNI) return "Tak daleko dopředu se ještě neobjednává.";
  if (!BLOKY.includes(String(t.cas || ""))) return "Tento čas není volný k objednání.";
  if (String(t.jmeno || "").trim().length < 2) return "Chybí jméno.";
  if (String(t.telefon || "").replace(/\D/g, "").length < 9) return "Chybí telefon.";
  const mail = String(t.email || "").trim();
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return "E-mail nevypadá správně.";
  return null;
}

/** Záznamy starší než rok mažeme sami — nikdo je už k ničemu nepotřebuje. */
async function uklid(store) {
  const hranice = new Date(Date.now() - UCHOVANI_DNI * 86400000).toISOString().slice(0, 10);
  try {
    const { blobs } = await store.list({ prefix: "slot/" });
    await Promise.all(blobs
      .filter((b) => b.key.slice(5, 15) < hranice)
      .map((b) => store.delete(b.key).catch(() => {})));
  } catch { /* úklid je nadstavba, rezervaci neblokuje */ }
}

/* ── obsluha ─────────────────────────────────────────────────────────── */

export default async (req) => {
  if (req.method === "GET") {
    try {
      const store = await uloziste();
      const { blobs } = await store.list({ prefix: "slot/" });
      const dnes = dnesKlic();
      const obsazeno = blobs
        .map((b) => b.key.slice(5))
        .filter((k) => k.slice(0, 10) >= dnes)
        .sort();
      return Response.json({ obsazeno }, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
      });
    } catch {
      /* bez úložiště nevíme o žádné obsazenosti — kalendář zůstane, jak byl */
      return Response.json({ obsazeno: [] });
    }
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const origin = req.headers.get("origin") || "";
  if (origin && !POVOLENE_ORIGINY.includes(origin) && !origin.startsWith("http://localhost")) {
    return Response.json({ error: "forbidden origin" }, { status: 403 });
  }

  let t;
  try { t = await req.json(); } catch { return Response.json({ error: "Prázdný požadavek." }, { status: 400 }); }

  /* Past na roboty: pole, které člověk nevidí, a formulář vyplněný
     rychleji než za tři vteřiny. Robotovi odpovíme, že je vše v pořádku,
     ať se nepokouší podruhé. */
  if (String(t.web || "").trim()) return Response.json({ ok: true, id: "x" });
  if (Number(t.trvani) >= 0 && Number(t.trvani) < MIN_VYPLNENI_MS) {
    return Response.json({ ok: true, id: "x" });
  }

  const chyba = zkontroluj(t);
  if (chyba) return Response.json({ error: chyba }, { status: 400 });

  let store;
  try { store = await uloziste(); }
  catch { return Response.json({ error: "Rezervace se teď nedají ukládat. Zavolejte prosím na +420 773 966 787." }, { status: 503 }); }

  const otisk = await otiskIP(req);
  const klicIP = `ip/${otisk}`;
  let pocet = 0;
  try {
    const z = await store.get(klicIP, { type: "json" });
    if (z && z.den === dnesKlic()) pocet = z.pocet || 0;
  } catch { /* první návštěva */ }
  if (pocet >= LIMIT_IP) {
    return Response.json({ error: "Z tohohle spojení už dnes přišlo několik rezervací. Zavolejte prosím na +420 773 966 787." }, { status: 429 });
  }

  const den = String(t.den), cas = String(t.cas), klic = klicSlotu(den, cas);
  try {
    if (await store.get(klic, { type: "json" })) {
      return Response.json({ error: "obsazeno" }, { status: 409 });
    }
  } catch { /* volný slot */ }

  const id = crypto.randomUUID();
  const lang = Object.prototype.hasOwnProperty.call(TEXTY, t.lang) ? t.lang : "cs";
  const zaznam = {
    id, den, cas, lang,
    jmeno: String(t.jmeno).trim().slice(0, 120),
    telefon: String(t.telefon).trim().slice(0, 40),
    email: String(t.email || "").trim().slice(0, 160),
    poznamka: String(t.poznamka || "").trim().slice(0, 2000),
    prijato: new Date().toISOString(),
  };

  try {
    await store.setJSON(klic, zaznam);
    await store.setJSON(klicIP, { den: dnesKlic(), pocet: pocet + 1 });
  } catch {
    return Response.json({ error: "Rezervaci se nepodařilo uložit. Zavolejte prosím na +420 773 966 787." }, { status: 503 });
  }

  const kdy = `${den} ${cas}–${String(Number(cas.slice(0, 2)) + 1).padStart(2, "0")}:00`;
  const pozvanka = { filename: "konzultace-konsalting-profi.ics", content: Buffer.from(ics(den, cas, id)).toString("base64") };
  const zpravy = [{
    to: [KANCELAR],
    reply_to: zaznam.email || undefined,
    subject: `Nová rezervace: ${kdy} — ${zaznam.jmeno}`,
    text: [
      `Termín: ${kdy}`, `Jméno: ${zaznam.jmeno}`, `Telefon: ${zaznam.telefon}`,
      zaznam.email ? `E-mail: ${zaznam.email}` : "E-mail: neuveden",
      `Jazyk webu: ${lang}`, "",
      zaznam.poznamka ? `Co potřebuje řešit:\n${zaznam.poznamka}` : "Poznámku nevyplnil.",
    ].join("\n"),
    attachments: [pozvanka],
  }];
  if (zaznam.email) {
    const x = TEXTY[lang];
    zpravy.push({
      to: [zaznam.email],
      subject: x.p,
      text: [`${x.a} ${zaznam.jmeno},`, "", `${x.b}`, "", `${kdy}`, ADRESA, "", x.c, x.d, "", x.e,
        "", "Konsalting Profi · +420 773 966 787 · konsaltingprofi@gmail.com"].join("\n"),
      attachments: [pozvanka],
    });
  }

  const odeslano = await posli(zpravy);
  uklid(store);   // na odpověď se nečeká

  return Response.json({ ok: true, id, mail: odeslano });
};

export const config = { path: "/api/objednat" };
