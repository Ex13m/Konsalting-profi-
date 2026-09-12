/**
 * Hlasový hovor s Klárou — vydání krátkodobého klíče pro prohlížeč.
 *
 * Trvalý klíč k OpenAI zůstává tady na serveru. Prohlížeč dostane jen
 * efemérní token sesse, se kterým naváže WebRTC spojení přímo s modelem.
 *
 * Nasazení: Netlify → Site settings → Environment variables
 *   OPENAI_API_KEY   povinné
 *   LIVE_ENABLED     "1" zapne tlačítko na webu (bez toho se ani nezobrazí)
 *   LIVE_MODEL       volitelné, výchozí gpt-live-1
 *   LIVE_VOICE       volitelné, hlas modelu
 *   LIVE_BACKEND_MODEL volitelné, model pro delegované uvažování
 *
 * ⚠ NEOVĚŘENO PROTI DOKUMENTACI. Dokumentace gpt-live-1 nebyla z prostředí,
 * kde tenhle soubor vznikl, dostupná (síť ji blokuje). Tvar požadavku níže
 * odpovídá Realtime API; až bude dokumentace po ruce, opravuje se jen
 * konstanta SESSION_URL a funkce telo() — nic jiného.
 */

const MODEL = process.env.LIVE_MODEL || "gpt-live-1";
const VOICE = process.env.LIVE_VOICE || "cedar";
const BACKEND = process.env.LIVE_BACKEND_MODEL || "";

/* ── provider-specific: jediné dvě místa, která se mění podle dokumentace ── */
const SESSION_URL = "https://api.openai.com/v1/realtime/client_secrets";

const telo = (pokyny) => ({
  session: {
    type: "realtime",
    model: MODEL,
    instructions: pokyny,
    audio: { output: { voice: VOICE } },
    ...(BACKEND ? { backend_model: BACKEND } : {}),
  },
});
/* ───────────────────────────────────────────────────────────────────────── */

const POVOLENE_ORIGINY = [
  "https://konsalting.netlify.app",
  "https://konsalting.cz",
  "https://www.konsalting.cz",
];

const JAZYKY = {
  cs: "čeština",
  en: "angličtina",
  ru: "ruština",
  uk: "ukrajinština",
  de: "němčina",
  pl: "polština",
};

const POKYNY = (lang) => `Jsi Klára, hlasová asistentka účetní kanceláře Konsalting Profi (Rubeška 383/4, Praha 9 – Vysočany, IČO 25720121, tel. +420 773 966 787, konsaltingprofi@gmail.com).

Kancelář poskytuje: vedení účetnictví a účetní poradenství, mzdovou agendu, daňovou evidenci pro OSVČ a poradenství při zakládání společnosti. Specializací je rekonstrukce zanedbaného účetnictví.

Provozní doba: úterý a čtvrtek 10:00–18:00 s pauzou 13:00–14:00; pondělí a středa jsou vyhrazené objednaným klientům; pátek až neděle zavřeno.

Zákonné termíny, které kancelář klientům hlídá:
- do 8. dne: záloha na zdravotní pojištění OSVČ za předchozí měsíc
- do 20. dne: odvod zálohové a srážkové daně ze mezd, pojistné za zaměstnance, záloha na sociální pojištění OSVČ
- do 25. dne: přiznání k DPH, kontrolní hlášení a úhrada daně
- 31. 1.: daň silniční, přiznání k dani z nemovitých věcí při změně
- 1. 3. listinně / 20. 3. elektronicky: vyúčtování zálohové daně ze závislé činnosti
- 15. 3., 15. 6., 15. 9., 15. 12.: čtvrtletní zálohy na daň z příjmů
- 1. 4. listinně, 1. 5. elektronicky, 1. 7. s daňovým poradcem: přiznání k dani z příjmů
- měsíc po termínu přiznání: přehledy OSVČ pro ČSSZ a zdravotní pojišťovnu
Termín, který padne na víkend nebo svátek, se posouvá na nejbližší pracovní den.

Jak mluvíš:
- mluvenou řečí, krátce — dvě až tři věty, pak nech člověka odpovědět
- vykáš, klidně, bez patosu a bez odborného balastu
- čísla a termíny říkej celými slovy, ne zkratkami ("dvacátého pátého", ne "25.")
- když ti někdo skočí do řeči, hned zmlkni a poslouchej
- nevymýšlej si ceny, reference ani čísla; cena se stanovuje po konzultaci podle objemu dokladů a počtu zaměstnanců
- konkrétní daňové posouzení nikdy nevydávej za závazné — u složitějších dotazů řekni, že to potvrdí účetní na konzultaci
- když se řeč stočí na schůzku, cenu nebo převzetí agendy, nabídni nezávaznou konzultaci na 45 minut

JAZYK: mluv v jazyce ${JAZYKY[lang] || JAZYKY.cs}. Pokud člověk přejde do jiného jazyka, přejdi s ním. Vlastní jména a adresu nepřekládej.

Hovor je časově omezený na osm minut. Až se bude blížit konec, řekni to a nabídni, že se domluvíte na schůzce nebo že můžou zavolat na +420 773 966 787.`;

export default async (req) => {
  const klic = process.env.OPENAI_API_KEY;
  const zapnuto = process.env.LIVE_ENABLED === "1" && !!klic;

  /* Prohlížeč se nejdřív zeptá, jestli má tlačítko vůbec ukazovat. */
  if (req.method === "GET") {
    return Response.json({ enabled: zapnuto, model: MODEL });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!zapnuto) return Response.json({ error: "disabled" }, { status: 503 });

  /* Slabá, ale levná zábrana: klíč je na minuty a stojí peníze, tak ho
     nevydáváme cizím stránkám. Proti cílenému zneužití to nestačí —
     to řeší Turnstile a spend limit v OpenAI. */
  const origin = req.headers.get("origin") || "";
  if (origin && !POVOLENE_ORIGINY.includes(origin) && !origin.startsWith("http://localhost")) {
    return Response.json({ error: "forbidden origin" }, { status: 403 });
  }

  let lang = "cs";
  try {
    const body = await req.json();
    if (Object.prototype.hasOwnProperty.call(JAZYKY, body.lang)) lang = body.lang;
  } catch {
    /* prázdné tělo je v pořádku, jedeme česky */
  }

  try {
    const r = await fetch(SESSION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${klic}`, "Content-Type": "application/json" },
      body: JSON.stringify(telo(POKYNY(lang))),
    });
    const text = await r.text();

    if (!r.ok) {
      /* Chybu od OpenAI pošleme dál celou — ladění tvaru požadavku
         je pak jeden pohled do konzole, ne hádání. */
      console.error("live-session upstream", r.status, text.slice(0, 800));
      return Response.json({ error: "upstream", status: r.status, detail: text.slice(0, 800) }, { status: 502 });
    }

    const data = JSON.parse(text);
    /* Token se podle verze API jmenuje různě — vezmeme první, co sedí. */
    const token =
      data.value ||
      data.client_secret?.value ||
      (typeof data.client_secret === "string" ? data.client_secret : null);

    if (!token) {
      console.error("live-session: v odpovědi není token", text.slice(0, 800));
      return Response.json({ error: "no token", detail: text.slice(0, 800) }, { status: 502 });
    }

    return Response.json({
      token,
      model: MODEL,
      expires_at: data.expires_at || null,
      max_seconds: 8 * 60,
    });
  } catch (err) {
    console.error("live-session error", err);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
};

export const config = { path: "/api/live-session" };
