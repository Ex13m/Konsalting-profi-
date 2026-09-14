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

## Co je ověřené a co ne

Podle dokumentace GA rozhraní Realtime API sedí:

- efemérní klíč: `POST /v1/realtime/client_secrets`
- sesse má `session.type`, výstupní zvuk je pod `session.audio.output`
- WebRTC se navazuje přes `/v1/realtime/calls` (model se do URL nedává,
  je zapečený v klíči)
- hlavička `OpenAI-Beta` se u GA neposílá
- otisk návštěvníka jde v hlavičce `OpenAI-Safety-Identifier`

Neověřené zůstávají specifika GPT-Live — stránka
`developers.openai.com/api/docs/guides/live` nebyla dostupná (síť blokuje
celou doménu; nepomůže ani `.md` na konci adresy). Konkrétně:

- jakou hodnotu má mít `session.type` pro gpt-live-1
- jak se jmenuje pole pro delegovaný backend-model (teď `backend_model`)
- název datového kanálu (teď `oai-events`)

Mění se jen dvě místa, obě označená komentářem:

- `live-session.mjs` — funkce `telo()`
- `live-client.js` — objekt `KONFIG`

Chyba od OpenAI se propisuje do odpovědi i do logu funkce celá, takže
seřízení je jeden pohled do Netlify → Functions → live-session.

Ukazatel „kdo zrovna mluví“ na tvaru API nezávisí — počítá se z hlasitosti
obou zvukových stop, takže funguje i při jiném pojmenování událostí.

## Projekce při hovoru

Když se hovor naváže, projekce se sama rozsvítí a přepne z nahraného
uvítání na živé kreslení — `assets/klara-zive.js`. Hudba pod projekcí se
na dobu hovoru ztiší, aby nepřekážela.

Nic se nenatáčelo. Bere se hotová průhledná fotka `assets/klara.webp`
a kreslí se na plátno ve třech vodorovných pruzích: nad nosem beze změny,
obličej od nosu po bradu se podle hlasitosti protahuje dolů, krk a ramena
se o stejnou míru stlačí, aby nevznikl šev. Mezi rty se do plátna měkce
vyřízne díra — otevřená ústa jsou tak mezera v projekci, ne tmavá skvrna.

Kromě úst má projekce řeč těla:

- **mihotnutí na slabice** — prudký nárůst hlasitosti ztlumí na okamžik
  celý obraz a škubne s ním do strany, jako když projektor nestíhá
- **přikývnutí na konci věty** — když Klára aspoň půl vteřiny mluvila
  a pak na dvě desetiny ztichla, hlava se tlumeně skloní a vrátí;
  `KPZive.prikyvni()` jde zavolat i zvenčí, až budou z modelu chodit
  události, hodí se to na „rozumím“ ve chvíli, kdy poslouchá
- **pohupování a dýchání** — pořád, při řeči s větší amplitudou
- **obnovovací pruh** projíždí obrazem a při řeči zrychlí

Ruce v záběru nejsou — fotka je po prsa, takže gesta rukama z ní udělat
nejdou. Chtělo by to jiný snímek, kde jsou vidět.

Hlasitost přichází z `live-client.js`, který ji už měří kvůli ukazateli
„kdo mluví“. Nic dalšího se nestahuje a nic dalšího se neplatí.

Souřadnice obličeje jsou v `TVAR` v podílech obrázku, ne v pixelech —
když se vymění fotka, dolaďuje se jen tenhle jeden objekt. Amplituda je
schválně střídmá: při plném rozevření se obličej viditelně deformoval.

## Živý obraz zvenčí

Projekce umí místo kreslení z fotky ukázat hotový obraz od poskytovatele
avatara. Stačí mu podat proud:

    KPHolo.obraz(mediaStream)        // zapnout
    KPHolo.obraz(null)               // zpátky na kreslenou

Pozadí si odřízneme sami — stejným filtrem `#klaraLuma`, jakým se čistí
nahrané uvítání. Projekce tak vypadá pořád stejně, ať obraz podává kdokoli,
a výměna poskytovatele se nedotkne ničeho jiného.

Když obraz podává někdo zvenčí, kreslení z fotky se vypne, aby zbytečně
nejelo pod neviditelným plátnem.

## Nabídka pod Klárou

Projekci pouští jedině člověk tlačítkem projektoru — sama od sebe nenaskočí.
Jakmile se rozsvítí, pod Klárou se ukážou tři tlačítka: objednání, daňový
kalendář a zpětné zavolání. Každé projekci zhasne a odscrolluje na svou sekci.

Protože projekci spouští gesto, zvuk hraje rovnou a není potřeba ho odemykat.

Za živého hovoru se nabídka schová — tam se mluví, ne klikají odkazy.
Zavřít jde kliknutím mimo, Escapem nebo tlačítkem projektoru.

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
