#!/usr/bin/env node
// Vérifie, après génération, que tous les liens internes du site (_site/) mènent quelque part.
import fs from "node:fs";
import path from "node:path";

const SITE = path.resolve("_site");
const prefixe = (process.env.PATH_PREFIX || "/").replace(/\/?$/, "/");
if (!fs.existsSync(SITE)) {
  console.error("✗  Dossier _site/ absent : lancer d'abord npm run build.");
  process.exit(1);
}

function fichiers(dossier) {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dossier, e.name);
    return e.isDirectory() ? fichiers(p) : [p];
  });
}

function existe(url) {
  let chemin = decodeURIComponent(url.split(/[?#]/)[0]);
  if (!chemin.startsWith(prefixe)) return false;
  chemin = path.join(SITE, chemin.slice(prefixe.length));
  if (fs.existsSync(chemin) && fs.statSync(chemin).isDirectory()) chemin = path.join(chemin, "index.html");
  return fs.existsSync(chemin);
}

const casses = [];
let total = 0;
for (const f of fichiers(SITE).filter((f) => f.endsWith(".html"))) {
  const html = fs.readFileSync(f, "utf8");
  const urls = [];
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) urls.push(m[1]);
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) urls.push(...m[1].split(",").map((s) => s.trim().split(/\s+/)[0]));
  for (const m of html.matchAll(/http-equiv="refresh" content="\d+;\s*url=([^"]+)"/g)) urls.push(m[1]);
  for (const url of urls) {
    if (!url.startsWith("/") || url.startsWith("//")) continue;
    total++;
    if (!existe(url)) casses.push(`${path.relative(SITE, f)} → ${url}`);
  }
}
for (const c of [...new Set(casses)]) console.error(`✗  lien cassé : ${c}`);
if (casses.length) process.exit(1);
console.log(`✓  ${total} liens internes vérifiés.`);
