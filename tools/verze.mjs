/* Verze webu na jednom místě.
 *
 *   node tools/verze.mjs            vypíše, co je nastavené teď
 *   node tools/verze.mjs 1.1.0      přepíše verzi všude a připraví tag
 *
 * Číslo žije v package.json; odtud se razítkuje do stránek — do hlavičky
 * (<meta name="kp-verze">) a do patičky, aby šlo z otevřeného webu poznat,
 * jestli dojel deploy. Ručně se to nikde nepřepisuje, jinak se to rozejde.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const STRANKY = ["index.html", "cenik.html", "ochrana-osobnich-udaju.html"];
const BALICEK = "package.json";
const ZMENY = "CHANGELOG.md";

const dnes = new Date().toISOString().slice(0, 10);
const balicek = JSON.parse(readFileSync(BALICEK, "utf8"));
const nova = process.argv[2];

if (!nova) {
  console.log("verze v package.json:", balicek.version || "(chybí)");
  for (const s of STRANKY) {
    const m = readFileSync(s, "utf8").match(/<meta name="kp-verze" content="([^"]+)"/);
    console.log(`  ${s}: ${m ? m[1] : "(nerazítkováno)"}`);
  }
  console.log("\nnastavení nové verze:  node tools/verze.mjs 1.1.0");
  process.exit(0);
}
if (!/^\d+\.\d+\.\d+$/.test(nova)) {
  console.error("verze musí být ve tvaru MAJOR.MINOR.PATCH, například 1.1.0");
  process.exit(1);
}

/* package.json */
balicek.version = nova;
writeFileSync(BALICEK, JSON.stringify(balicek, null, 2) + "\n");

/* stránky: hlavička i patička */
const razitko = `${nova} · ${dnes}`;
for (const soubor of STRANKY) {
  let s = readFileSync(soubor, "utf8");
  if (/<meta name="kp-verze"/.test(s)) {
    s = s.replace(/<meta name="kp-verze" content="[^"]*">/, `<meta name="kp-verze" content="${razitko}">`);
  } else {
    /* první nasazení: posadíme značku hned za popis stránky */
    s = s.replace(/(<meta name="description"[^>]*>)/, `$1\n<meta name="kp-verze" content="${razitko}">`);
  }
  s = s.replace(/(<span class="verze num"[^>]*>)v[\d.]+(<\/span>)/, `$1v${nova}$2`);
  writeFileSync(soubor, s);
  console.log("orazítkováno", soubor);
}

/* CHANGELOG: z „Не выпущено" se stane nová verze a nadpis se doplní znovu */
let zmeny = readFileSync(ZMENY, "utf8");
const hlava = "## [Не выпущено]\n\nЗдесь копятся изменения до следующего тега.\n";
if (zmeny.includes(hlava)) {
  zmeny = zmeny.replace(hlava, `${hlava}\n---\n\n## [${nova}] — ${dnes}\n`);
  writeFileSync(ZMENY, zmeny);
  console.log("CHANGELOG.md: založena sekce", nova);
} else {
  console.log("CHANGELOG.md: sekci „Не выпущено\" jsem nenašel, doplňte ručně");
}

console.log(`\nzbývá popsat změny v CHANGELOG.md, pak:
  git add -A && git commit -m "Verze ${nova}"
  git tag -a v${nova} -m "${(execSync("git log -1 --format=%s").toString().trim())}"
  git push && git push --tags`);
