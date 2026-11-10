#!/usr/bin/env node
// Validation complète des données avant génération : `npm run check`.
// - chaque fichier JSON respecte son schéma (schemas/)
// - les champs HTML ne contiennent que les balises autorisées
// - les références (documents de l'ordre du jour, médias) existent
// - les médias sont de vrais fichiers image/PDF, sans contenu suspect
import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import sharp from "sharp";
import { RACINE, CONTENU, MEDIAS, FICHIER_ASSEMBLEE, FICHIER_AVIS, fichiersAValider, lireJson } from "../lib/content.js";
import { validerHtml } from "../lib/html.js";

const erreurs = [];
const avertissements = [];
const rel = (f) => path.relative(RACINE, f).split(path.sep).join("/");
const erreur = (f, msg) => erreurs.push(`${rel(f)} : ${msg}`);
const avertir = (f, msg) => avertissements.push(`${rel(f)} : ${msg}`);

// --- Schémas -------------------------------------------------------------
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, verbose: true });
addFormats(ajv);
ajv.addKeyword({
  keyword: "x-html",
  type: "string",
  schemaType: "boolean",
  errors: true,
  validate: function verifierHtml(actif, valeur) {
    if (!actif) return true;
    const pbs = validerHtml(valeur);
    verifierHtml.errors = pbs.map((message) => ({ keyword: "x-html", message: `HTML : ${message}`, params: {} }));
    return pbs.length === 0;
  },
});
const DOSSIER_SCHEMAS = path.join(RACINE, "schemas");
for (const f of fs.readdirSync(DOSSIER_SCHEMAS).filter((f) => f.endsWith(".schema.json"))) {
  ajv.addSchema(lireJson(path.join(DOSSIER_SCHEMAS, f)), f);
}

function formaterErreurs(errs) {
  // oneOf / if produisent des erreurs sur chaque branche : on retire le bruit.
  const sansOneOf = errs.filter((e) => !["oneOf", "anyOf", "if"].includes(e.keyword));
  const utiles = sansOneOf.filter(
    (e) => !(e.keyword === "type" && sansOneOf.some((a) => a !== e && a.keyword !== "type" && (a.instancePath === e.instancePath || a.instancePath.startsWith(e.instancePath + "/"))))
  );
  const liste = (utiles.length ? utiles : errs).map((e) => {
    const ou = e.instancePath || "(racine)";
    let msg = e.message;
    if (e.keyword === "additionalProperties") msg = `propriété inconnue « ${e.params.additionalProperty} »`;
    if (e.keyword === "required") msg = `propriété obligatoire manquante « ${e.params.missingProperty} »`;
    if (e.keyword === "format") msg = `format invalide (attendu : ${{ date: "date AAAA-MM-JJ existante", uri: "adresse web", email: "adresse e-mail" }[e.params.format] || e.params.format})`;
    if (e.keyword === "pattern") msg = `format invalide (attendu : ${e.parentSchema?.description || e.params.pattern})`;
    if (e.keyword === "type") msg = `type invalide (attendu : ${e.params.type})`;
    if (e.keyword === "minLength") msg = "texte trop court ou vide";
    if (e.keyword === "enum") msg = `valeur non admise (choix : ${e.params.allowedValues.join(", ")})`;
    return `${ou} — ${msg}`;
  });
  return [...new Set(liste)];
}

const donnees = new Map();
for (const { fichier, schema } of fichiersAValider()) {
  if (!fs.existsSync(fichier)) {
    erreur(fichier, "fichier manquant");
    continue;
  }
  let json;
  try {
    json = lireJson(fichier);
  } catch (e) {
    erreurs.push(e.message);
    continue;
  }
  donnees.set(fichier, json);
  const valider = ajv.getSchema(schema);
  if (!valider(json)) for (const m of formaterErreurs(valider.errors)) erreur(fichier, m);
}

// --- Cohérence : documents de référence -----------------------------------
const cles = new Set(); // « documents/statuts », « 2024/pv »…
const fichierDocs = path.join(CONTENU, "documents.json");
for (const d of donnees.get(fichierDocs)?.documents || []) {
  if (cles.has(`documents/${d.id}`)) erreur(fichierDocs, `identifiant de document en double : ${d.id}`);
  cles.add(`documents/${d.id}`);
}

// --- Cohérence : assemblées ---------------------------------------------
const dossierAG = path.join(CONTENU, "assemblees");
const numeros = new Map();
const assemblees = [];
for (const f of fs.existsSync(dossierAG) ? fs.readdirSync(dossierAG) : []) {
  const chemin = path.join(dossierAG, f);
  if (!f.endsWith(".json")) {
    erreur(chemin, "seuls les fichiers .json sont attendus ici");
    continue;
  }
  const m = f.match(FICHIER_ASSEMBLEE);
  if (!m) {
    erreur(chemin, "nom de fichier invalide (AAAA.json ou AAAA-AAAA.json)");
    continue;
  }
  const ag = donnees.get(chemin);
  if (!ag) continue;
  const id = m[1];
  assemblees.push({ id, chemin, ag });
  if (numeros.has(ag.numero)) erreur(chemin, `numéro ${ag.numero} déjà utilisé par ${numeros.get(ag.numero)}`);
  numeros.set(ag.numero, f);
  if (ag.date) {
    const a = Number(ag.date.slice(0, 4));
    if (a < Number(m[2]) || a > Number(m[3] || m[2])) erreur(chemin, `la date ${ag.date} ne correspond pas au nom du fichier (${id})`);
  }
  if (ag.convoqueeLe && ag.date && ag.convoqueeLe > ag.date) erreur(chemin, "« convoqueeLe » est postérieure à la date de l'assemblée");
  if (ag.ouverture && ag.heure && ag.ouverture > ag.heure) erreur(chemin, "l'ouverture de la salle est après le début de l'assemblée");
  const ids = new Set();
  for (const d of ag.documents || []) {
    if (ids.has(d.id)) erreur(chemin, `identifiant de document en double : ${d.id}`);
    ids.add(d.id);
    cles.add(`${id}/${d.id}`);
    if (d.statut && d.type !== "pv") avertir(chemin, `« statut » n'a de sens que pour un procès-verbal (${d.id})`);
  }
}
for (const { chemin, ag } of assemblees) {
  for (const p of ag.ordreDuJour || []) {
    if (p.document && !cles.has(p.document)) erreur(chemin, `ordre du jour : document « ${p.document} » introuvable`);
  }
}
const tries = [...numeros.keys()].sort((a, b) => a - b);
tries.forEach((n, i) => {
  if (i > 0 && n !== tries[i - 1] + 1) avertissements.push(`content/assemblees : numéro ${tries[i - 1] + 1} absent (de ${tries[i - 1]} à ${n})`);
});

// --- Cohérence : avis ----------------------------------------------------
const dossierAvis = path.join(CONTENU, "avis");
for (const f of fs.existsSync(dossierAvis) ? fs.readdirSync(dossierAvis) : []) {
  const chemin = path.join(dossierAvis, f);
  const m = f.match(FICHIER_AVIS);
  if (!m) {
    erreur(chemin, "nom de fichier invalide (format AAAA-MM-JJ-titre.json)");
    continue;
  }
  const a = donnees.get(chemin);
  if (!a) continue;
  if (a.date !== m[2]) erreur(chemin, `« date » (${a.date}) ne correspond pas au nom du fichier (${m[2]})`);
  if (a.jusquau && a.jusquau < a.date) erreur(chemin, "« jusquau » est antérieur à la date de l'avis");
}

// --- Redirections --------------------------------------------------------
const redirections = donnees.get(path.join(CONTENU, "redirections.json"))?.redirections || [];
const vus = new Set();
for (const r of redirections) {
  if (vus.has(r.de)) erreur(path.join(CONTENU, "redirections.json"), `redirection en double : ${r.de}`);
  vus.add(r.de);
}

// --- Médias --------------------------------------------------------------
const references = new Map(); // chemin média -> fichier JSON qui le cite
function collecter(valeur, source) {
  if (Array.isArray(valeur)) valeur.forEach((v) => collecter(v, source));
  else if (valeur && typeof valeur === "object") {
    for (const [cle, v] of Object.entries(valeur)) {
      if (cle === "fichier" && typeof v === "string" && source.startsWith(CONTENU)) references.set(v, source);
      else collecter(v, source);
    }
  }
}
for (const [fichier, json] of donnees) collecter(json, fichier);

const SIGNATURES = {
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  webp: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  pdf: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
};
SIGNATURES.jpeg = SIGNATURES.jpg;
const EXTENSIONS_MEDIA = new Set(Object.keys(SIGNATURES));
const LARGEUR_MAX = 2500;
const PDF_MAX = 15 * 1024 * 1024;

async function verifierMedia(chemin) {
  const ext = path.extname(chemin).slice(1).toLowerCase();
  const tampon = fs.readFileSync(chemin);
  if (!SIGNATURES[ext]?.(tampon)) {
    erreur(chemin, `le contenu ne correspond pas à un fichier .${ext}`);
    return;
  }
  const brut = tampon.toString("latin1");
  if (/<\?php|<script/i.test(brut)) erreur(chemin, "contenu suspect (code PHP ou script) — fichier refusé");
  if (ext === "pdf") {
    if (/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/.test(brut)) erreur(chemin, "PDF contenant du JavaScript ou des fichiers embarqués — refusé");
    if (tampon.length > PDF_MAX) avertir(chemin, `PDF lourd (${Math.round(tampon.length / 1024 / 1024)} Mo) — compresser si possible`);
    return;
  }
  try {
    const meta = await sharp(tampon).metadata();
    if (Math.max(meta.width, meta.height) > LARGEUR_MAX)
      avertir(chemin, `image très grande (${meta.width}×${meta.height}) — réduire à ~2000 px de côté`);
  } catch (e) {
    erreur(chemin, `image illisible (${e.message})`);
  }
}

function parcourir(dossier) {
  const out = [];
  if (!fs.existsSync(dossier)) return out;
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) out.push(...parcourir(p));
    else out.push(p);
  }
  return out;
}

const fichiersMedia = parcourir(MEDIAS);
const presents = new Set();
for (const f of fichiersMedia) {
  const nom = path.basename(f);
  if (nom === ".gitkeep") continue;
  const ext = path.extname(f).slice(1).toLowerCase();
  const relMedia = path.relative(MEDIAS, f).split(path.sep).join("/");
  if (!EXTENSIONS_MEDIA.has(ext)) {
    erreur(f, "type de fichier non autorisé dans media/ (jpg, jpeg, png, webp, pdf uniquement)");
    continue;
  }
  if (!/^[a-z0-9][a-z0-9/._-]*$/.test(relMedia)) erreur(f, "nom invalide (minuscules, chiffres, tirets, sans espaces ni accents)");
  presents.add(relMedia);
  await verifierMedia(f);
  if (!references.has(relMedia)) avertir(f, "fichier non utilisé (il serait publié sans lien : le référencer ou le retirer)");
}
const manquants = [];
for (const [media, source] of references) {
  if (!presents.has(media)) {
    erreur(source, `média introuvable : media/${media}`);
    manquants.push(media);
  }
}

// --- Bilan ---------------------------------------------------------------
for (const a of avertissements) console.warn(`⚠  ${a}`);
for (const e of erreurs) console.error(`✗  ${e}`);
const nb = fichiersAValider().length;
if (erreurs.length) {
  console.error(`\n${erreurs.length} erreur(s) — corriger avant de publier.`);
  if (manquants.length) console.error(`(${manquants.length} média(s) manquant(s) : voir « npm run import-wordpress » dans le README pour la reprise des PDF.)`);
  process.exit(1);
}
console.log(`✓  ${nb} fichiers de données valides, ${presents.size} média(s) vérifié(s)${avertissements.length ? `, ${avertissements.length} avertissement(s)` : ""}.`);
