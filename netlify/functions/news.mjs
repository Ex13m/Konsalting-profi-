/**
 * Ekonomický přehled — sběr veřejných RSS kanálů z ČR a EU.
 * Vrací zkrácený seznam titulků pro klidný pás na webu.
 *
 * Titulky nevymýšlíme: přeposíláme, co zdroje samy publikují.
 * Pokud je nastavený ANTHROPIC_API_KEY, doplníme k nim překlad
 * do pěti jazyků a jednu větu „o čem to je“ pro podnikatele.
 * Bez klíče web ukáže originální české titulky.
 */
const SOURCES = [
  { tag: "ČNB", source: "Česká národní banka", url: "https://www.cnb.cz/cs/cnb-news/rss/" },
  { tag: "EU", source: "Evropská komise", url: "https://ec.europa.eu/commission/presscorner/api/rss?language=cs&pagesize=10" },
  { tag: "Daně", source: "Finanční správa", url: "https://www.financnisprava.cz/rss/cs/tiskove-zpravy.xml" },
  { tag: "ČR", source: "Ministerstvo financí", url: "https://www.mfcr.cz/cs/rss/tiskove-zpravy" },
];

const LANGS = ["cs", "en", "ru", "uk", "de", "pl"];
const TAGS = {
  "ČNB": { cs: "ČNB", en: "CNB", ru: "ЧНБ", uk: "ЧНБ", de: "ČNB", pl: "ČNB" },
  "EU":  { cs: "EU", en: "EU", ru: "ЕС", uk: "ЄС", de: "EU", pl: "UE" },
  "Daně":{ cs: "Daně", en: "Tax", ru: "Налоги", uk: "Податки", de: "Steuern", pl: "Podatki" },
  "ČR":  { cs: "ČR", en: "CZ", ru: "ЧР", uk: "ЧР", de: "CZ", pl: "CZ" },
};

const TTL = 60 * 60 * 1000;      // hodina: RSS i překlad
let cache = { at: 0, items: [] };

const strip = (s) =>
  s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) =>
      ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " }[m] || " ")
    )
    .replace(/\s+/g, " ")
    .trim();

function parse(xml, meta) {
  const blocks = xml.split(/<(?:item|entry)[\s>]/i).slice(1, 7);
  return blocks
    .map((b) => {
      const title = strip((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ""])[1]);
      let link = (b.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [, ""])[1].trim();
      if (!link) link = (b.match(/<link[^>]*href="([^"]+)"/i) || [, ""])[1];
      const date = (b.match(/<(?:pubDate|updated|published)[^>]*>([\s\S]*?)<\/(?:pubDate|updated|published)>/i) || [, ""])[1];
      return {
        tag: meta.tag,
        source: meta.source,
        title: title.length > 130 ? title.slice(0, 127) + "…" : title,
        link: strip(link),
        date: date ? Date.parse(date) || 0 : 0,
      };
    })
    .filter((x) => x.title);
}

async function fetchOne(meta) {
  const ctl = AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined;
  const r = await fetch(meta.url, {
    signal: ctl,
    headers: { "User-Agent": "KonsaltingProfi-web/1.0 (+https://konsalting.cz)" },
  });
  if (!r.ok) throw new Error(meta.url + " " + r.status);
  return parse(await r.text(), meta);
}

/* --- překlad titulků a krátké vysvětlení, co z toho plyne --- */
async function enrich(items) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || process.env.NEWS_TRANSLATE === "0" || !items.length) return items;

  const model = process.env.NEWS_MODEL || "claude-haiku-4-5-20251001";
  const list = items.map((x, i) => `${i}. [${x.source}] ${x.title}`).join("\n");

  const prompt =
    "Níže jsou titulky z českých a evropských veřejných zdrojů pro klienty účetní kanceláře.\n" +
    "Ke každému vrať překlad titulku a jednu krátkou větu, čeho se to prakticky týká " +
    "(daně, mzdy, sazby, povinnosti, ceny) — bez hodnocení, bez čísel, která v titulku nejsou.\n" +
    "Jazyky: cs, en, ru, uk, de, pl. Vysvětlení maximálně 12 slov.\n" +
    "Odpověz POUZE JSON polem tvaru " +
    '[{"i":0,"title":{"cs":"…","en":"…","ru":"…","uk":"…","de":"…","pl":"…"},' +
    '"why":{"cs":"…","en":"…","ru":"…","uk":"…","de":"…","pl":"…"}}]\n\n' +
    list;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout ? AbortSignal.timeout(25000) : undefined,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 3000,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) throw new Error("anthropic " + r.status);
    const j = await r.json();
    const text = (j.content || []).map((c) => c.text || "").join("");
    const m = text.match(/\[[\s\S]*\]/);
    if (!m) throw new Error("no json");
    const rows = JSON.parse(m[0]);

    rows.forEach((row) => {
      const it = items[row.i];
      if (!it) return;
      const t = {}, w = {};
      LANGS.forEach((l) => {
        if (row.title && row.title[l]) t[l] = String(row.title[l]).slice(0, 150);
        if (row.why && row.why[l]) w[l] = String(row.why[l]).slice(0, 120);
      });
      t.cs = t.cs || it.title;
      it.title = t;
      if (Object.keys(w).length) it.why = w;
    });
  } catch (e) {
    /* překlad je nadstavba: bez něj pošleme originální titulky */
  }
  return items;
}

export default async () => {
  if (Date.now() - cache.at < TTL && cache.items.length) {
    return Response.json({ items: cache.items, cached: true });
  }

  const settled = await Promise.allSettled(SOURCES.map(fetchOne));
  let items = settled
    .filter((s) => s.status === "fulfilled")
    .flatMap((s) => s.value)
    .sort((a, b) => b.date - a.date)
    .slice(0, 10)
    .map((x) => ({ ...x, tag: TAGS[x.tag] || { cs: x.tag } }));

  if (items.length) {
    items = await enrich(items);
    cache = { at: Date.now(), items };
  }

  return new Response(JSON.stringify({ items: items.length ? items : cache.items }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
    },
  });
};

export const config = { path: "/api/news" };
