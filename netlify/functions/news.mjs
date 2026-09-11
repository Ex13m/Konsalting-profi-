/**
 * Ekonomický přehled — sběr veřejných RSS kanálů z ČR a EU.
 * Vrací zkrácený seznam titulků pro klidný pás na webu.
 *
 * Titulky nevymýšlíme: přeposíláme, co zdroje samy publikují.
 * Pokud je nastavený ANTHROPIC_API_KEY, doplníme k nim překlad
 * do pěti jazyků a jednu větu „o čem to je“ pro podnikatele.
 * Bez klíče web ukáže originální české titulky.
 */
import { createHash } from "node:crypto";

/* České zdroje. Jedou vždy — jsou to ty, které se účetnictví týkají
   nejvíc, a jinde než česky nevycházejí. */
const CS_SOURCES = [
  { tag: "ČNB", source: "Česká národní banka", url: "https://www.cnb.cz/cs/cnb-news/rss/" },
  { tag: "Daně", source: "Finanční správa", url: "https://www.financnisprava.cz/rss/cs/tiskove-zpravy.xml" },
  { tag: "ČR", source: "Ministerstvo financí", url: "https://www.mfcr.cz/cs/rss/tiskove-zpravy" },
];

/* Evropská komise vydává tentýž kanál ve více jazycích. Kde její jazyk
   existuje, bereme ho rovnou — přeložený titulek nemusíme vyrábět.
   Pro ruštinu a ukrajinštinu kanál není, posíláme anglický. */
const EU_RSS = (l) =>
  `https://ec.europa.eu/commission/presscorner/api/rss?language=${l}&pagesize=10`;
const EU_LANG = { cs: "cs", en: "en", de: "de", pl: "pl", ru: "en", uk: "en" };
const CNB_EN = { tag: "ČNB", source: "Czech National Bank", url: "https://www.cnb.cz/en/cnb-news/rss/" };

function sourcesFor(lang) {
  const l = EU_LANG[lang] ? lang : "cs";
  const eu = { tag: "EU", source: l === "cs" ? "Evropská komise" : "European Commission",
               url: EU_RSS(EU_LANG[l]) };
  /* U cizích jazyků přidáme i anglickou ČNB — aspoň část pásu je pak
     v jazyce návštěvníka i bez překladače. */
  return l === "cs" ? [...CS_SOURCES, eu] : [CNB_EN, eu, ...CS_SOURCES];
}

const LANGS = ["cs", "en", "ru", "uk", "de", "pl"];
const TAGS = {
  "ČNB": { cs: "ČNB", en: "CNB", ru: "ЧНБ", uk: "ЧНБ", de: "ČNB", pl: "ČNB" },
  "EU":  { cs: "EU", en: "EU", ru: "ЕС", uk: "ЄС", de: "EU", pl: "UE" },
  "Daně":{ cs: "Daně", en: "Tax", ru: "Налоги", uk: "Податки", de: "Steuern", pl: "Podatki" },
  "ČR":  { cs: "ČR", en: "CZ", ru: "ЧР", uk: "ЧР", de: "CZ", pl: "CZ" },
};

const TTL = 20 * 60 * 1000;      // titulky obnovujeme po 20 minutách;
                                 // překlady drží zásoba, takže to nic nestojí
const cache = new Map();      /* jazyk -> { at, items } */

/* Zdroje sypou entity v obou tvarech: pojmenované (&amp;) i číselné
   (&#xE1; = á, &#x159; = ř). Ministerstvo financí navíc někdy zakóduje
   ampersand ještě jednou, proto dekódujeme dvakrát. */
const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "",
  hellip: "…", mdash: "—", ndash: "–", minus: "−",
  laquo: "«", raquo: "»", bdquo: "„", ldquo: "“", rdquo: "”",
  sbquo: "‚", lsquo: "‘", rsquo: "’", euro: "€", copy: "©", deg: "°",
};

const decodeOnce = (s) =>
  s.replace(/&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{1,31});/g, (m, g) => {
    if (g[0] === "#") {
      const n = g[1] === "x" || g[1] === "X"
        ? parseInt(g.slice(2), 16)
        : parseInt(g.slice(1), 10);
      if (!Number.isFinite(n) || n <= 0 || n > 0x10ffff) return m;
      try { return String.fromCodePoint(n); } catch { return m; }
    }
    const v = NAMED[g.toLowerCase()];
    return v === undefined ? m : v;
  });

const strip = (s) => {
  let t = String(s).replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]*>/g, "");
  t = decodeOnce(decodeOnce(t));
  return t.replace(/\s+/g, " ").trim();
};

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
  const ctl = AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined;
  const r = await fetch(meta.url, {
    signal: ctl,
    headers: { "User-Agent": "KonsaltingProfi-web/1.0 (+https://konsalting.cz)" },
  });
  if (!r.ok) throw new Error(meta.url + " " + r.status);
  return parse(await r.text(), meta);
}

/* --- trvalá zásoba překladů ---------------------------------------
   Titulky se v kanálech opakují celé hodiny. Bez zásoby bychom je
   překládali znovu při každém obnovení; s ní platíme jen za to, co
   jsme ještě neviděli. Když úložiště není k dispozici (lokální běh),
   funkce jede dál, jen bez úspory. */
const idOf = (t) => createHash("sha256").update(t).digest("hex").slice(0, 20);

async function store() {
  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore({ name: "news-i18n", consistency: "eventual" });
  } catch {
    return null;
  }
}

async function fromStore(s, items) {
  if (!s) return new Map();
  const found = new Map();
  await Promise.all(
    items.map(async (x) => {
      try {
        const v = await s.get(idOf(x.title), { type: "json" });
        if (v && v.title) found.set(x.title, v);
      } catch { /* chybějící klíč není chyba */ }
    })
  );
  return found;
}

async function toStore(s, rows) {
  if (!s) return;
  await Promise.all(
    rows.map(([cs, v]) => s.setJSON(idOf(cs), v).catch(() => {}))
  );
}

/* --- překlad titulků a krátké vysvětlení, co z toho plyne --- */
async function enrich(items) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || process.env.NEWS_TRANSLATE === "0" || !items.length) return items;

  const s = await store();
  const cached = await fromStore(s, items);
  cached.forEach((v, cs) => {
    const it = items.find((x) => x.title === cs);
    if (!it) return;
    it.title = v.title;
    if (v.why) it.why = v.why;
    it._done = true;
  });

  const todo = items.filter((x) => !x._done);
  if (!todo.length) return items.map(({ _done, ...x }) => x);

  const model = process.env.NEWS_MODEL || "claude-haiku-4-5-20251001";
  const list = todo.map((x, i) => `${i}. [${x.source}] ${x.title}`).join("\n");

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

    const fresh = [];
    rows.forEach((row) => {
      const it = todo[row.i];
      if (!it) return;
      const t = {}, w = {};
      LANGS.forEach((l) => {
        if (row.title && row.title[l]) t[l] = String(row.title[l]).slice(0, 150);
        if (row.why && row.why[l]) w[l] = String(row.why[l]).slice(0, 120);
      });
      const cs = it.title;
      t.cs = t.cs || cs;
      const rec = Object.keys(w).length ? { title: t, why: w } : { title: t };
      it.title = rec.title;
      if (rec.why) it.why = rec.why;
      fresh.push([cs, rec]);
    });
    await toStore(s, fresh);
  } catch (e) {
    /* překlad je nadstavba: bez něj pošleme originální titulky */
  }
  return items.map(({ _done, ...x }) => x);
}

export default async (req) => {
  const url = new URL(req.url);
  const lang = ["cs", "en", "ru", "uk", "de", "pl"].includes(url.searchParams.get("lang"))
    ? url.searchParams.get("lang") : "cs";
  const debug = url.searchParams.get("debug") === "1";

  const hit = cache.get(lang);
  if (hit && Date.now() - hit.at < TTL && hit.items.length) {
    return Response.json({ items: hit.items, lang, cached: true });
  }

  const srcs = sourcesFor(lang);
  const settled = await Promise.allSettled(srcs.map(fetchOne));

  /* Kdo odpověděl a kdo ne — ať se na to dá kouknout zvenčí a nehádalo
     se, proč je pás prázdný. */
  const stav = settled.map((r, i) => ({
    zdroj: srcs[i].source,
    url: srcs[i].url,
    ok: r.status === "fulfilled",
    pocet: r.status === "fulfilled" ? r.value.length : 0,
    chyba: r.status === "rejected" ? String(r.reason).slice(0, 160) : null,
  }));

  let items = settled
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .sort((a, b) => b.date - a.date)
    .slice(0, 10)
    .map((x) => ({ ...x, tag: TAGS[x.tag] || { cs: x.tag } }));

  if (items.length) {
    items = await enrich(items);
    cache.set(lang, { at: Date.now(), items });
  }

  const telo = { items: items.length ? items : (hit ? hit.items : []), lang };
  if (debug || !telo.items.length) telo.zdroje = stav;

  return new Response(JSON.stringify(telo), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
};

export const config = { path: "/api/news" };
