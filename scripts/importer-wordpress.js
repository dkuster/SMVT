#!/usr/bin/env node
// Reprise unique des documents de l'ancien site WordPress.
//
//   npm run import-wordpress -- "C:\chemin\vers\wp-content\uploads"
//
// Lit Resources/import-wordpress.json, cherche chaque fichier dans le dossier
// « uploads » récupéré de l'hébergement, le contrôle et le copie sous son
// nouveau nom dans media/. Les images sont réencodées (métadonnées supprimées,
// 2000 px max). Aucun autre fichier n'est repris. Option --force : écraser.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { RACINE, MEDIAS, lireJson } from "../lib/content.js";

const args = process.argv.slice(2);
const forcer = args.includes("--force");
const dossier = args.find((a) => !a.startsWith("--"));
if (!dossier || !fs.existsSync(dossier)) {
  console.error("Usage : npm run import-wordpress -- <dossier wp-content/uploads> [--force]");
  process.exit(1);
}

const { fichiers } = lireJson(path.join(RACINE, "Resources", "import-wordpress.json"));

/** Les noms accentués peuvent être en NFC ou NFD selon le système qui les a copiés. */
function trouver(relatif) {
  if (!relatif) return null;
  for (const forme of [relatif, relatif.normalize("NFC"), relatif.normalize("NFD")]) {
    const p = path.join(dossier, ...forme.split("/"));
    if (fs.existsSync(p)) return p;
  }
  // Dernier recours : comparaison insensible à la normalisation dans le dossier parent.
  const parent = path.join(dossier, ...path.posix.dirname(relatif).split("/"));
  if (!fs.existsSync(parent)) return null;
  const nom = path.posix.basename(relatif).normalize("NFC");
  const trouve = fs.readdirSync(parent).find((f) => f.normalize("NFC") === nom);
  return trouve ? path.join(parent, trouve) : null;
}

const bilan = { copies: [], deja: [], manquants: [], refuses: [], manuels: [] };

for (const e of fichiers) {
  const cible = path.join(MEDIAS, ...e.cible.split("/"));
  if (fs.existsSync(cible) && !forcer) {
    bilan.deja.push(e.cible);
    continue;
  }
  const source = trouver(e.source) || trouver(e.alternative);
  if (!source) {
    bilan.manquants.push(`${e.source}${e.alternative ? ` (ou ${e.alternative})` : ""} → ${e.cible}`);
    continue;
  }
  const ext = path.extname(source).toLowerCase();
  if (ext === ".pptx" || ext === ".docx") {
    bilan.manuels.push(`${e.source} → media/${e.cible} : ${e.remarque || "convertir en PDF"}`);
    continue;
  }
  const tampon = fs.readFileSync(source);
  fs.mkdirSync(path.dirname(cible), { recursive: true });

  if (ext === ".pdf") {
    const brut = tampon.toString("latin1");
    if (!brut.startsWith("%PDF-")) {
      bilan.refuses.push(`${e.source} : ce n'est pas un PDF`);
      continue;
    }
    if (/<\?php|<script/i.test(brut) || /\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/.test(brut)) {
      bilan.refuses.push(`${e.source} : contenu actif (script, lancement ou fichier embarqué) — à réimprimer en PDF depuis l'original`);
      continue;
    }
    fs.writeFileSync(cible, tampon);
  } else if ([".jpg", ".jpeg", ".png"].includes(ext)) {
    try {
      await sharp(tampon).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toFile(cible);
    } catch (err) {
      bilan.refuses.push(`${e.source} : image illisible (${err.message})`);
      continue;
    }
  } else {
    bilan.refuses.push(`${e.source} : type non prévu`);
    continue;
  }
  bilan.copies.push(`${e.source} → media/${e.cible}${e.remarque ? `   ⚠ ${e.remarque}` : ""}`);
}

for (const c of bilan.copies) console.log(`✓  ${c}`);
for (const d of bilan.deja) console.log(`·  déjà présent : media/${d}`);
for (const m of bilan.manuels) console.warn(`✎  à faire à la main : ${m}`);
for (const m of bilan.manquants) console.warn(`?  introuvable : ${m}`);
for (const r of bilan.refuses) console.error(`✗  refusé : ${r}`);
console.log(`\n${bilan.copies.length} copié(s), ${bilan.deja.length} déjà présent(s), ${bilan.manuels.length} à convertir, ${bilan.manquants.length} introuvable(s), ${bilan.refuses.length} refusé(s).`);
console.log("Lancer ensuite : npm run check");
