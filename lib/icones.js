// Génère, à partir du pictogramme vectoriel (Resources/marque.svg, en currentColor)
// et des couleurs du thème, les déclinaisons utilisées par le site.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { RACINE, lireJson } from "./content.js";

const echapper = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function genererIcones(dossierSortie) {
  const theme = lireJson(path.join(RACINE, "theme", "theme.json"));
  const site = lireJson(path.join(RACINE, "content", "site.json"));
  const c = theme.couleurs;
  const marque = fs.readFileSync(path.join(RACINE, "Resources", "marque.svg"), "utf8");
  const colorer = (couleur) => marque.replace(/currentColor/g, couleur);

  fs.mkdirSync(dossierSortie, { recursive: true });
  const ecrire = (nom, contenu) => fs.writeFileSync(path.join(dossierSortie, nom), contenu);

  ecrire("logo.svg", colorer(c.logo));
  ecrire("logo-pied.svg", colorer(c.piedDePageTexte || c.fond));
  ecrire("favicon.svg", colorer(c.accent));

  const png = (svg, largeur) => sharp(Buffer.from(svg), { density: 600 }).resize({ width: largeur }).png().toBuffer();

  // Icône carrée pour les téléphones (180×180, fond du thème).
  await sharp({ create: { width: 180, height: 180, channels: 4, background: c.fond } })
    .composite([{ input: await png(colorer(c.logo), 130), gravity: "center" }])
    .png()
    .toFile(path.join(dossierSortie, "apple-touch-icon.png"));

  // Image de partage par défaut (1200×630) : pictogramme + nom.
  const texte = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="300">
    <text x="0" y="120" font-family="Georgia, serif" font-size="120" font-weight="700" fill="${c.texte}">${echapper(site.nomCourt)}</text>
    <text x="4" y="190" font-family="Georgia, serif" font-size="38" fill="${c.texteDiscret}">Vignoble en terrasses</text>
    <text x="4" y="240" font-family="Georgia, serif" font-size="38" fill="${c.texteDiscret}">de Vétroz</text>
  </svg>`;
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: c.fond } })
    .composite([
      { input: await png(colorer(c.logo), 300), left: 110, top: 165 },
      { input: Buffer.from(texte), left: 470, top: 165 },
    ])
    .jpeg({ quality: 85 })
    .toFile(path.join(dossierSortie, "partage.jpg"));
}
