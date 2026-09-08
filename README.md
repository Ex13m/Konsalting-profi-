# Konsalting Profi

Jednostránková prezentace účetní kanceláře Konsalting Profi (Praha 9 – Vysočany).

## Obsah
- `index.html` — celý web v jednom souboru (styly i skripty inline)
- `assets/` — fotografie použité v hero sekci, v profilu kanceláře a v postupu spolupráce
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

## Vývoj
Statický web bez build kroku. Stačí otevřít `index.html` nebo spustit libovolný statický server:

    python3 -m http.server 8080

## Nasazení
Netlify, projekt `konsalting-profi`.
