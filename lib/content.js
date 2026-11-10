// Chargement de toutes les données du site (dossier content/ et theme/).
// Utilisé par Eleventy (src/_data/smvt.js) et par la validation (scripts/check.js).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CONTENU = path.join(RACINE, "content");
export const MEDIAS = path.join(RACINE, "media");

/** content/assemblees/2025.json ou 2020-2021.json */
export const FICHIER_ASSEMBLEE = /^((\d{4})(?:-(\d{4}))?)\.json$/;
/** content/avis/2018-08-03-arrosages.json */
export const FICHIER_AVIS = /^((\d{4}-\d{2}-\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;

export const TYPES_DOCUMENT = {
  convocation: "Convocation",
  dossier: "Documents de l'assemblée",
  presentation: "Présentation",
  bulletin: "Bulletin de vote",
  pv: "Procès-verbal",
  comptes: "Comptes",
  autre: "Document",
};
export const STATUTS_PV = { signe: "signé", "non-signe": "non signé", projet: "projet" };

/** Date du jour à Vétroz, format AAAA-MM-JJ. */
export function aujourdhui() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(new Date());
}

export function lireJson(fichier) {
  const brut = fs.readFileSync(fichier, "utf8").replace(/^﻿/, "");
  try {
    return JSON.parse(brut);
  } catch (e) {
    const err = new Error(`${path.relative(RACINE, fichier)} : JSON invalide — ${e.message}`);
    err.fichier = fichier;
    throw err;
  }
}

export function listerJson(dossier) {
  if (!fs.existsSync(dossier)) return [];
  return fs.readdirSync(dossier).filter((f) => f.endsWith(".json")).sort();
}

/** Liste des fichiers à valider, avec le schéma correspondant. */
export function fichiersAValider() {
  const liste = [
    { fichier: path.join(CONTENU, "site.json"), schema: "site.schema.json" },
    { fichier: path.join(CONTENU, "comite.json"), schema: "comite.schema.json" },
    { fichier: path.join(CONTENU, "infos-pratiques.json"), schema: "page.schema.json" },
    { fichier: path.join(CONTENU, "documents.json"), schema: "documents.schema.json" },
    { fichier: path.join(CONTENU, "redirections.json"), schema: "redirections.schema.json" },
    { fichier: path.join(RACINE, "theme", "theme.json"), schema: "theme.schema.json" },
  ];
  for (const f of listerJson(path.join(CONTENU, "assemblees")))
    liste.push({ fichier: path.join(CONTENU, "assemblees", f), schema: "assemblee.schema.json" });
  for (const f of listerJson(path.join(CONTENU, "avis")))
    liste.push({ fichier: path.join(CONTENU, "avis", f), schema: "avis.schema.json" });
  return liste;
}

/** Informations sur un fichier de media/ : URL publique, taille lisible, présence. */
export function infoMedia(fichier) {
  const chemin = path.join(MEDIAS, fichier);
  const existe = fs.existsSync(chemin);
  const octets = existe ? fs.statSync(chemin).size : 0;
  const taille = !existe ? "" : octets < 1024 * 1024 ? `${Math.max(1, Math.round(octets / 1024))} Ko` : `${(octets / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
  return { fichier, url: `/media/${fichier}`, existe, taille, format: path.extname(fichier).slice(1).toUpperCase() };
}

/** Charge et enrichit toutes les données. */
export function chargerTout({ jour = aujourdhui() } = {}) {
  const site = lireJson(path.join(CONTENU, "site.json"));
  const comite = lireJson(path.join(CONTENU, "comite.json"));
  const infosPratiques = lireJson(path.join(CONTENU, "infos-pratiques.json"));
  const redirections = lireJson(path.join(CONTENU, "redirections.json")).redirections || [];
  const theme = lireJson(path.join(RACINE, "theme", "theme.json"));

  const documentsReference = (lireJson(path.join(CONTENU, "documents.json")).documents || []).map((d) => ({
    ...d,
    ...infoMedia(d.fichier),
    cle: `documents/${d.id}`,
  }));

  // --- Assemblées générales ------------------------------------------------
  const assemblees = [];
  for (const f of listerJson(path.join(CONTENU, "assemblees"))) {
    const m = f.match(FICHIER_ASSEMBLEE);
    if (!m) continue;
    const donnees = lireJson(path.join(CONTENU, "assemblees", f));
    if (donnees.brouillon) continue;
    const id = m[1];
    const documents = (donnees.documents || []).map((d) => {
      const libelleType = TYPES_DOCUMENT[d.type];
      const titre = d.titre || libelleType;
      return {
        ...d,
        ...infoMedia(d.fichier),
        cle: `${id}/${d.id}`,
        titre,
        titreComplet: d.statut ? `${titre} (${STATUTS_PV[d.statut]})` : titre,
      };
    });
    assemblees.push({
      ...donnees,
      id,
      annee: Number(m[2]),
      titre: donnees.titre || `Assemblée générale ${id}`,
      url: `/assemblees/${id}/`,
      documents,
      pv: documents.find((d) => d.type === "pv") || null,
      aVenir: Boolean(donnees.date && donnees.date >= jour),
    });
  }
  // Du plus récent au plus ancien.
  assemblees.sort((a, b) => b.numero - a.numero);

  // Index de tous les documents, pour les renvois de l'ordre du jour.
  const indexDocuments = new Map(documentsReference.map((d) => [d.cle, d]));
  for (const ag of assemblees) for (const d of ag.documents) indexDocuments.set(d.cle, { ...d, assemblee: ag.titre });
  for (const ag of assemblees) {
    ag.ordreDuJour = (ag.ordreDuJour || []).map((p) => ({ ...p, lien: p.document ? indexDocuments.get(p.document) || null : null }));
  }

  const prochaine = [...assemblees].filter((a) => a.aVenir).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  const derniere = assemblees.find((a) => !a.aVenir) || null;

  // --- Avis ----------------------------------------------------------------
  const avis = [];
  for (const f of listerJson(path.join(CONTENU, "avis"))) {
    const m = f.match(FICHIER_AVIS);
    if (!m) continue;
    const donnees = lireJson(path.join(CONTENU, "avis", f));
    if (donnees.brouillon) continue;
    avis.push({
      ...donnees,
      slug: m[1],
      url: `/avis/${m[1]}/`,
      documents: (donnees.documents || []).map((d) => ({ ...d, ...infoMedia(d.fichier) })),
      enCours: Boolean(donnees.jusquau && donnees.jusquau >= jour),
    });
  }
  avis.sort((a, b) => b.date.localeCompare(a.date));

  return {
    site, comite, infosPratiques, redirections, theme,
    documentsReference, assemblees, prochaine, derniere,
    avis, avisEnCours: avis.filter((a) => a.enCours), avisAvecDocuments: avis.filter((a) => a.documents.length),
    jour,
  };
}
