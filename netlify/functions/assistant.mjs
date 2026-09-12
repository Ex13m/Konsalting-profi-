/**
 * Virtuální asistentka Klára — serverová část.
 * Klíč k API zůstává na serveru, prohlížeč volá jen tuto funkci.
 *
 * Nasazení: Netlify → Site settings → Environment variables
 *   ANTHROPIC_API_KEY   povinné
 *   ASSISTANT_MODEL     volitelné (výchozí claude-opus-5)
 */
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = process.env.ASSISTANT_MODEL || "claude-opus-5";

/* Stabilní prefix se drží v cache — mění se jen dotaz uživatele. */
const SYSTEM = `Jsi Klára, virtuální asistentka účetní kanceláře Konsalting Profi (Rubeška 383/4, Praha 9 – Vysočany, IČO 25720121, tel. +420 773 966 787, konsaltingprofi@gmail.com).

Kancelář poskytuje: vedení účetnictví a účetní poradenství, mzdovou agendu, daňovou evidenci pro OSVČ a poradenství při zakládání společnosti. Specializací je i rekonstrukce zanedbaného účetnictví.

Provozní doba: úterý a čtvrtek 10:00–18:00 s pauzou 13:00–14:00; pondělí a středa jsou vyhrazené objednaným klientům; pátek až neděle zavřeno.

Pravidelné zákonné termíny, které kancelář klientům hlídá:
- do 8. dne: záloha na zdravotní pojištění OSVČ za předchozí měsíc
- do 20. dne: odvod zálohové a srážkové daně ze mezd, pojistné za zaměstnance, záloha na sociální pojištění OSVČ
- do 25. dne: přiznání k DPH, kontrolní hlášení a úhrada daně za předchozí měsíc nebo čtvrtletí
- 31. 1.: daň silniční, přiznání k dani z nemovitých věcí při změně
- 1. 3. (listinně) / 20. 3. (elektronicky): vyúčtování zálohové daně ze závislé činnosti
- 15. 3., 15. 6., 15. 9., 15. 12.: čtvrtletní zálohy na daň z příjmů
- 1. 4. listinně, 1. 5. elektronicky, 1. 7. s daňovým poradcem: přiznání k dani z příjmů
- měsíc po termínu přiznání: přehledy OSVČ pro ČSSZ a zdravotní pojišťovnu

Jak odpovídáš:
- věcně, vykáš, maximálně 4 věty
- konkrétní daňové posouzení nikdy nevydávej za závazné: u složitějších dotazů řekni, že to potvrdí účetní na konzultaci
- nevymýšlej si ceny, reference ani čísla, která tu nejsou; cena se stanovuje po konzultaci podle objemu dokladů a počtu zaměstnanců
- když se zákazník ptá na schůzku, cenu nebo převzetí agendy, nabídni nezávaznou konzultaci (45 minut) a vrať v odpovědi doporučení objednat se
- termíny, které připadnou na víkend nebo svátek, se posouvají na nejbližší pracovní den`;

/* Stejné jako v prohlížeči — návštěvník píše v jazyce, který si zvolil. */
const BOOKING_HINTS = [
  "objedn", "schůz", "rezerv", "konzultac", "termín schůzky", "sejít", "domluvit", "cena", "kolik stoj", "převz", "přejít",
  "book", "appointment", "meeting", "consultation", "price", "how much", "switch", "handover",
  "запис", "встреч", "консультац", "цен", "стоит", "стоимост", "переход", "перейти",
  "зустріч", "консультац", "вартіст", "коштує", "перехід",
  "termin", "buchen", "beratung", "preis", "kostet", "wechsel", "übergang",
  "umów", "spotkan", "konsultac", "koszt", "ile to", "przejści",
];

/* Jazyk odpovědi. Pokyn je i v cílovém jazyce — na samotný český popis
   model občas nedal a odpovídal dál česky, případně jazyky míchal. */
const JAZYKY = {
  cs: { nazev: "čeština",      pokyn: "Odpovídej výhradně česky." },
  en: { nazev: "angličtina",   pokyn: "Reply in English only. Do not use Czech." },
  ru: { nazev: "ruština",      pokyn: "Отвечай только по-русски. Не используй чешский." },
  uk: { nazev: "ukrajinština", pokyn: "Відповідай лише українською. Чеську не використовуй." },
  de: { nazev: "němčina",      pokyn: "Antworte ausschließlich auf Deutsch. Kein Tschechisch." },
  pl: { nazev: "polština",     pokyn: "Odpowiadaj wyłącznie po polsku. Nie używaj czeskiego." },
};

const jazykovyBlok = (lang) => {
  const j = JAZYKY[lang];
  return [
    "JAZYK ODPOVĚDI: " + j.nazev + ". " + j.pokyn,
    "Celá odpověď musí být v tomto jazyce — včetně názvů měsíců, dnů a popisů termínů.",
    "Nikdy nemíchej dva jazyky v jedné odpovědi.",
    "Beze změny nech jen vlastní jména a adresu: Konsalting Profi, Rubeška 383/4, Praha 9 – Vysočany.",
    "České zkratky (DPH, OSVČ, s.r.o., ČSSZ) uveď v původní podobě a krátce je vysvětli v jazyce odpovědi.",
  ].join(" ");
};

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let question = "";
  let lang = "cs";
  try {
    const body = await req.json();
    question = String(body.question || "").slice(0, 600).trim();
    lang = ["cs", "en", "ru", "uk", "de", "pl"].includes(body.lang) ? body.lang : "cs";
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if (!question) return Response.json({ error: "empty question" }, { status: 400 });

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: [
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
        { type: "text", text: jazykovyBlok(lang) },
      ],
      messages: [{ role: "user", content: question + "\n\n[" + JAZYKY[lang].pokyn + "]" }],
    });

    const answer = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const q = question.toLowerCase();
    const go = BOOKING_HINTS.some((k) => q.includes(k)) ? "#objednani" : undefined;

    return Response.json({ answer, go, usage: message.usage });
  } catch (err) {
    console.error("assistant error", err);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
};

export const config = { path: "/api/assistant" };
