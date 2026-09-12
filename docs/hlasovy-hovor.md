# Hlasový hovor s Klárou (zkušební)

Třetí plovoucí tlačítko na webu — mikrofon nad projektorem a asistentkou.
Zatím **jen hlas, žádný avatar**: ověřuje se, jak model zvládá češtinu.
To je etap Ф0 ze zadání, jen ne na skryté stránce `/lab`, ale rovnou na webu.

## Co je kde

| Soubor | Role |
|---|---|
| `netlify/functions/live-session.mjs` | vydá prohlížeči krátkodobý token; trvalý klíč nikdy neopustí server |
| `assets/live-client.js` | WebRTC spojení, mikrofon, měření hlasitosti, limit hovoru |
| `index.html` | tlačítko `#livebtn`, panel `#live`, obsluha |

## Proměnné v Netlify

| Proměnná | Povinná | Popis |
|---|---|---|
| `OPENAI_API_KEY` | ano | klíč k OpenAI |
| `LIVE_ENABLED` | ano | `1` zapne tlačítko; bez toho se na webu vůbec neukáže |
| `LIVE_MODEL` | ne | výchozí `gpt-live-1` |
| `LIVE_VOICE` | ne | hlas modelu |
| `LIVE_BACKEND_MODEL` | ne | model, kterému se deleguje uvažování |

Tlačítko se řídí odpovědí `GET /api/live-session`. Dokud není klíč nebo
`LIVE_ENABLED=1`, web vypadá přesně jako dřív — nasazení je tedy bezpečné
i před tím, než se klíč vloží.

## Co ještě není ověřené

Dokumentace `gpt-live-1` nebyla z prostředí, kde tohle vznikalo, dostupná
(síť ji blokuje). Tvar požadavku odpovídá Realtime API a může se lišit.
Mění se jen dvě místa, obě označená komentářem:

- `live-session.mjs` — konstanta `SESSION_URL` a funkce `telo()`
- `live-client.js` — objekt `KONFIG` (adresa spojení, název datového kanálu)

Chyba od OpenAI se propisuje do odpovědi i do logu funkce celá, takže
seřízení je jeden pohled do Netlify → Functions → live-session.

Ukazatel „kdo zrovna mluví“ na tvaru API nezávisí — počítá se z hlasitosti
obou zvukových stop, takže funguje i při jiném pojmenování událostí.

## Peníze a zneužití

Hlasová vrstva stojí 0,05 USD za minutu, k tomu se připočítávají tokeny
backend-modelu. Hovor je proto tvrdě omezený na osm minut, minutu předem
Klára upozorní.

Ochrana je zatím slabá — kontroluje se jen `Origin`. Než se tlačítko pustí
mezi lidi, patří k tomu:

1. **spend limit v OpenAI** — bez něj to nezapínat;
2. Cloudflare Turnstile na tlačítko;
3. omezení počtu hovorů na IP (potřebuje úložiště — Netlify Blobs nebo Supabase).

## Hodnocení češtiny

Dvacet scénářů podle zadání: OSVČ, s.r.o., DPH, mzdy, změna účetní, spěšné
daňové přiznání, klient plete pojmy, hluk v kavárně, skákání do řeči.
Každý se hodnotí 1–5 ve třech osách: porozumění, výslovnost, přirozenost.

Průměr ≥ 4 → pokračuje se podle zadání (avatar, odezírání ze rtů).
Níž → kaskáda Claude + ElevenLabs, obousměrný hovor se obětuje.
