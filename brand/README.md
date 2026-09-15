# Znak kanceláře

`verze 1.0.0 · 15. 9. 2026`

Podklady pro profily na sítích. Vychází ze stejné palety a písma jako web:
námořní modř `#0D1935`, mosaz `#A9743C` / `#C08F4E`, monogram v Cormorant
Garamond — tomtéž písmu, kterým je sázená značka v hlavičce webu.

Facebook a většina sítí avatar ořezávají do kolečka, proto je všechno
uvnitř bezpečné kružnice a rohy zůstávají prázdné.

## Co je tu

| Soubor | Co to je |
|---|---|
| `avatar-2-monogram.png` | **vybraná varianta** — jen monogram, 1080×1080 |
| `avatar-monogram-512.png` | táž varianta pro ostatní profily |
| `avatar-monogram-180.png` | táž varianta pro drobná místa |
| `avatar-1-pecet.png` | varianta s podpisem „Účetní kancelář" |
| `avatar-3-kruhovy-napis.png` | pečeť s názvem a adresou po obvodu |
| `nahled.png` | všechny tři v kolečku na 260, 100, 56 a 32 px |
| `avatar.html` | zdroj, ze kterého se avatary kreslí |
| `obalka-1-slogan.png` | obálka stránky se sloganem z webu, 1640×856 |
| `obalka-2-sluzby.png` | obálka s výčtem služeb, 1640×856 |
| `obalka-nahled.png` | jak obálky vypadají na počítači i na telefonu |
| `obalka.html` | zdroj, ze kterého se obálky kreslí |

Vybraná varianta je navíc v `assets/znacka-kp.png`, aby se dala použít
i z webu — třeba jako veřejná adresa pro nahrání do sítí.

## Přegenerování

    PLAYWRIGHT_DIR=<cesta k node_modules> node tools/avatar.mjs
    PLAYWRIGHT_DIR=<cesta k node_modules> node tools/obalka.mjs

Vzniknou znovu všechny obrázky i přehledové listy. Barvy, velikosti
a rozvržení se mění v `brand/avatar.html` a `brand/obalka.html`,
ne v obrázcích.

## Rozměry obálky

Nahrává se 1640×856. Facebook ji na počítači ukáže jako 820×312 —
udrží šířku a ukrojí 116 px nahoře i dole; na telefonu 640×360 —
udrží výšku a ukrojí zhruba 60 px po stranách. Bezpečné pole je tedy
1520×624 uprostřed.

Navíc přes levý dolní roh leží profilová fotka: kolečko 168 px, které
středem sedí na dolní hraně. Proto musí zůstat prázdných přibližně
390 px zleva a 290 px zdola. Obsah obálky tam nesahá — ověřeno měřením,
ne odhadem.

## Proč zrovna monogram

Na webu se avatar nejčastěji zobrazuje na dvaatřiceti pixelech. Tam
z podpisu ani z kruhového nápisu nezbude nic čitelného, kdežto monogram
drží. Varianty s textem se hodí tam, kde je místa víc — do záhlaví
stránky, na vizitku, do patičky dokumentu.
