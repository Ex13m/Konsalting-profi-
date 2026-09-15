# Konsalting Profi

`verze 1.0.0 · 14. 9. 2026`

Jednostránková prezentace účetní kanceláře Konsalting Profi (Praha 9 – Vysočany).

## Obsah
- `index.html` — celý web v jednom souboru (styly i skripty inline)
- `assets/` — fotografie použité v hero sekci, v profilu kanceláře a v postupu spolupráce
- `cenik.html` — ceník standardních služeb, samostatná stránka ve stejném stylu
- `assets/konsalting-profi-cenik.pdf` — týž ceník ke stažení
- `assets/znacka-kp.png` — znak kanceláře 1080×1080 pro profily na sítích
- `brand/` — varianty znaku, velikosti a zdroj, ze kterého se kreslí
  (`brand/README.md`)
- `netlify.toml`, `_headers` — konfigurace nasazení a cache

## Vizuální systém
- papír (krémová #F7F4EF) · inkoust (námořní modř #16264F) · mosaz (#A9743C)
- písma: Cormorant Garamond (značka), Fraunces (nadpisy), IBM Plex Sans (text)
- světlý i tmavý motiv, volba se ukládá do `localStorage`

## Funkce
- živý odpočet do nejbližšího zákonného termínu
- daňový kalendář na celý rok, generovaný v prohlížeči
- objednání termínu: v kalendáři je celý pracovní týden. Pondělí a středa
  jsou přijímací dny — ukáže se celý provozní den, ale volné jsou jen
  bloky 10–11 a 11–12 (`VOLNE` v `index.html`), zbytek je obsazený.
  Úterý a čtvrtek nabídnou tlačítko Zavolat, pátek hlásí, že se nepřijímá.
  Obsazenost z externího kalendáře se dodá funkcí `window.KP_OBSAZENO`
- interaktivní diagnostika (4 otázky) s předvyplněním formuláře
- formulář pro zpětné zavolání (napojení na CRM se doplňuje v `leadform` handleru)
- strukturovaná data schema.org `AccountingService`

## Video v hlavičce (nepovinné)
Položte do `assets/hero.mp4` krátkou smyčku (6–10 s, bez zvuku) a sama se
objeví přes úvodní fotku. Když soubor chybí, nic se neděje a zůstane fotka.

Video se nestahuje vůbec, pokud je návštěvník na telefonu, v úsporném
režimu, na pomalé lince nebo si přeje méně pohybu — a načítá se až po
vykreslení stránky, aby nebrzdilo první dojem. Rozumná velikost je do
2 MB; fotka `hero.webp` slouží jako plakát a záloha.

## Objednání

Formulář posílá rezervaci na `POST /api/objednat`
(`netlify/functions/objednat.mjs`). Funkce ověří, že termín dává smysl,
uloží ho do Netlify Blobs a pošle avízo kanceláři a potvrzení klientovi.

| Proměnná | Povinná | Popis |
|---|---|---|
| `RESEND_API_KEY` | ne | bez ní se rezervace uloží, ale nic neodejde |
| `RESEND_FROM` | ne | odesílatel, výchozí `onboarding@resend.dev` |
| `OBJEDNANI_MAIL` | ne | kam chodí avíza, výchozí `konsaltingprofi@gmail.com` |

`GET /api/objednat` vrací jen obsazené časy (`{"obsazeno":["2026-09-16T10:00"]}`),
žádné osobní údaje. Web si podle nich zašedne bloky.

Když endpoint neběží nebo selže, formulář nespadne: ukáže termín, nabídne
pozvánku do kalendáře a odeslání e-mailem a řekne, že se to nepodařilo
odeslat automaticky. Rezervaci je tedy pořád jak dokončit.

Proti robotům stojí skryté pole ve formuláři a čas vyplnění pod tři
vteřiny; navíc nejvýš tři rezervace z jedné adresy za den. Záznamy starší
než rok funkce maže sama — odpovídá to lhůtě v zásadách zpracování.

## Ceník

Ceny jsou jen v `cenik.html`; PDF je z něj vygenerované, ne psané zvlášť.
Po každé změně částek **i překladů** je potřeba PDF přegenerovat, jinak
se rozejde se stránkou:

    python3 -m http.server 8899 &
    PLAYWRIGHT_DIR=<cesta k node_modules> node tools/cenik-pdf.mjs

Vznikne šest souborů — `konsalting-profi-cenik.pdf` (česky) a `-en`,
`-ru`, `-uk`, `-de`, `-pl`. Tlačítko na stránce nabízí ten, který
odpovídá zvolenému jazyku.

Tiskový vzhled řídí blok `@media print` v `cenik.html` — hlavička, odkaz
zpět a tlačítka se do PDF netisknou.

### Jazyk a návrat

Stránka je ve stejných šesti jazycích jako web a bere si jazyk z téhož
místa: `?lang=` v adrese (tak se generuje PDF), jinak `localStorage`,
kam ho ukládá hlavní stránka. Slovník je společný — klíčem je původní
český text, takže se překlad doplňuje do `assets/i18n-*.js` jako všude
jinde. Čísla, adresa a název kanceláře jsou označené třídou `num`
a nepřekládají se. Než slovník dorazí, je stránka schovaná, aby neblikla
česky; pojistka ji odkryje po 1,5 s i kdyby slovník nedojel.

Odkazy na ceník vedou v téže záložce. Odkaz „zpět na web" se proto vrací
do historie a člověk se ocitne přesně tam, kde skončil — i s pozicí
rolování. Kdo přijde odjinud nebo rovnou z adresního řádku, jde na úvod.

Na webu vede k ceníku odkaz v patičce, v odpovědi na otázku po ceně
v sekci Otázky a tlačítko pod Klárou. Záměrně nikde nekřičí: konkrétní
částka se stejně skládá až po schůzce, ceník je orientační.

## Verze

Číslo verze je v `package.json` a odtud se razítkuje do stránek. Na webu je
vidět v patičce (`v1.0.0`) a v hlavičce zdroje (`<meta name="kp-verze">`),
takže se dá z otevřeného webu poznat, jestli dojel deploy.

    node tools/verze.mjs           co je nastavené teď
    node tools/verze.mjs 1.1.0     přepíše verzi všude a založí sekci v CHANGELOGu

Co se ve které verzi změnilo, je v `CHANGELOG.md`; je tam i tabulka
verze → commit, takže se dají porovnávat:

    git log --oneline d86e0c2..8609e79
    git diff d86e0c2..8609e79 -- index.html

Stejné body nesou i tagy `v0.1.0`…`v1.0.0`. Ty zatím žijí jen lokálně —
proxy tohohle prostředí push tagů nepouští (HTTP 403); z vlastního
počítače odejdou běžným `git push --tags`.

Číslujeme podle semver: **major** — přestavba, po které se web prochází
celý; **minor** — nová sekce nebo funkce; **patch** — texty, sazba, překlady.

Dokumenty v `docs/` i tenhle soubor nesou pod nadpisem razítko verze,
ke které platí. Když se dokument mění, razítko se mění s ním.

## Vývoj
Statický web bez build kroku. Stačí otevřít `index.html` nebo spustit libovolný statický server:

    python3 -m http.server 8080

## Nasazení
Netlify, projekt `konsalting-profi`.
