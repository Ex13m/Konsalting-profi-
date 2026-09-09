/**
 * Ekonomický přehled — sběr veřejných RSS kanálů z ČR a EU.
 * Vrací zkrácený seznam titulků pro běžící pás na webu.
 * Nic negeneruje: přeposílá jen to, co zdroje samy publikují.
 */
const SOURCES = [
  { tag: "ČNB", source: "Česká národní banka", url: "https://www.cnb.cz/cs/cnb-news/rss/" },
  { tag: "EU", source: "Evropská komise", url: "https://ec.europa.eu/commission/presscorner/api/rss?language=cs&pagesize=10" },
  { tag: "Daně", source: "Finanční správa", url: "https://www.financnisprava.cz/rss/cs/tiskove-zpravy.xml" },
  { tag: "ČR", source: "Ministerstvo financí", url: "https://www.mfcr.cz/cs/rss/tiskove-zpravy" },
];

const TTL = 15 * 60 * 1000;
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
        title: title.length > 118 ? title.slice(0, 115) + "…" : title,
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

export default async () => {
  if (Date.now() - cache.at < TTL && cache.items.length) {
    return Response.json({ items: cache.items, cached: true });
  }

  const settled = await Promise.allSettled(SOURCES.map(fetchOne));
  const items = settled
    .filter((s) => s.status === "fulfilled")
    .flatMap((s) => s.value)
    .sort((a, b) => b.date - a.date)
    .slice(0, 14);

  if (items.length) cache = { at: Date.now(), items };

  return new Response(JSON.stringify({ items: items.length ? items : cache.items }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
};

export const config = { path: "/api/news" };
