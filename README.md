# Konsalting Profi

Jednostránková prezentace účetní kanceláře Konsalting Profi (Praha 9 – Vysočany).

## Obsah
- `index.html` — celý web v jednom souboru (styly i skripty inline)
- `assets/` — fotografie použité v hero sekci, v profilu kanceláře a v postupu spolupráce
- `cenik.html` — ceník standardních služeb, samostatná stránka ve stejném stylu
- `assets/konsalting-profi-cenik.pdf` — týž ceník ke stažení
- `netlify.toml`, `_headers` — konfigurace nasazení a cache

## Vizuální systém
- papír (krémová #F7F4EF) · inkoust (námořní modř #16264F) · mosaz (#A9743C)
- písma: Cormorant Garamond (značka), Fraunces (nadpisy), IBM Plex Sans (text)
- světlý i tmavý motiv, volba se ukládá do `localStorage`

## Funkce
- živý odpočet do nejbližšího zákonného termínu
- daňový kalendář na celý rok, generovaný v prohlížeči
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

## Ceník

Ceny jsou jen v `cenik.html`; PDF je z něj vygenerované, ne psané zvlášť.
Po každé změně částek je potřeba PDF přegenerovat, jinak se rozejde
se stránkou:

    python3 -m http.server 8899 &
    PLAYWRIGHT_DIR=<cesta k node_modules> node tools/cenik-pdf.mjs

Tiskový vzhled řídí blok `@media print` v `cenik.html` — hlavička, odkaz
zpět a tlačítka se do PDF netisknou.

Na webu vede k ceníku odkaz v patičce, v odpovědi na otázku po ceně
v sekci Otázky a tlačítko pod Klárou. Záměrně nikde nekřičí: konkrétní
částka se stejně skládá až po schůzce, ceník je orientační.

## Vývoj
Statický web bez build kroku. Stačí otevřít `index.html` nebo spustit libovolný statický server:

    python3 -m http.server 8080

## Nasazení
Netlify, projekt `konsalting-profi`.
