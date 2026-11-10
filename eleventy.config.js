// Configuration Eleventy — voir CLAUDE.md pour la structure du projet.
import fs from "node:fs";
import path from "node:path";
import Image from "@11ty/eleventy-img";
import { HtmlBasePlugin } from "@11ty/eleventy";
import { MEDIAS } from "./lib/content.js";
import { genererIcones } from "./lib/icones.js";
import { rendreHtml, texteBrut } from "./lib/html.js";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function decouperDate(iso) {
  const [a, m, j] = iso.split("-").map(Number);
  return { a, m, j, jour: JOURS[new Date(Date.UTC(a, m - 1, j)).getUTCDay()] };
}

const OPTIONS_IMAGES = { formats: ["webp", "jpeg"], outputDir: "_site/img/", urlPath: "/img/", sharpJpegOptions: { quality: 80, mozjpeg: true }, sharpWebpOptions: { quality: 78 } };

export default function (config) {
  // Applique le préfixe d'URL (PATH_PREFIX) à tous les liens du HTML généré.
  config.addPlugin(HtmlBasePlugin);

  config.addWatchTarget("content/");
  config.addWatchTarget("theme/");
  config.addWatchTarget("media/");
  config.addWatchTarget("lib/");
  config.addWatchTarget("Resources/");

  config.addPassthroughCopy({ "src/css": "css" });
  config.addPassthroughCopy({ "theme/fonts/*.woff2": "fonts" });
  config.addPassthroughCopy("media/**/*.pdf"); // → _site/media/…

  // Pictogramme coloré selon le thème, favicon, icône téléphone, image de partage par défaut.
  config.on("eleventy.before", async () => {
    await genererIcones("_site/assets");
  });

  // --- Filtres -------------------------------------------------------------
  config.addFilter("html", (texte) => rendreHtml(texte));
  config.addFilter("texteBrut", (texte, max) => texteBrut(texte, max));
  // « jeudi 11 décembre 2025 »
  config.addFilter("dateLongue", (iso) => {
    const { a, m, j, jour } = decouperDate(iso);
    return `${jour} ${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}`;
  });
  // « 11 décembre 2025 »
  config.addFilter("dateSimple", (iso) => {
    const { a, m, j } = decouperDate(iso);
    return `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}`;
  });
  // « 20h00 »
  config.addFilter("heure", (h) => (h ? h.replace(":", "h") : ""));
  // Date et heure ISO avec le décalage horaire de Zurich (hiver +01:00, été +02:00).
  config.addFilter("isoZurich", (date, heure = "00:00") => {
    const instant = new Date(`${date}T${heure}:00Z`);
    const nom = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Zurich", timeZoneName: "longOffset" }).formatToParts(instant).find((p) => p.type === "timeZoneName").value;
    return `${date}T${heure}:00${nom.replace("GMT", "") || "+00:00"}`;
  });
  config.addFilter("absolue", (url, base) => new URL(url, base).href);
  config.addFilter("jsonLd", (obj) => JSON.stringify(obj).replace(/</g, "\\u003c"));
  // Lien mailto avec objet et corps pré-remplis.
  config.addFilter("mailto", (email, objet, corps) => {
    const params = [];
    if (objet) params.push(`subject=${encodeURIComponent(objet)}`);
    if (corps) params.push(`body=${encodeURIComponent(corps)}`);
    return `mailto:${email}${params.length ? "?" + params.join("&") : ""}`;
  });

  // --- Images (redimensionnées et converties au build) ----------------------
  // {% image fichier, alt, sizes, [largeurs], "eager" %}
  // Une image absente (pas encore reprise) n'interrompt pas l'aperçu local : `npm run check` la signale.
  config.addAsyncShortcode("image", async (fichier, alt, sizes = "100vw", largeurs = [400, 800, 1200, 1600], chargement = "lazy") => {
    const source = path.join(MEDIAS, fichier);
    if (!fs.existsSync(source)) {
      console.warn(`[image] media/${fichier} introuvable`);
      return "";
    }
    const meta = await Image(source, { ...OPTIONS_IMAGES, widths: largeurs });
    return Image.generateHTML(meta, { alt, sizes, loading: chargement, decoding: "async" });
  });
  // URL d'une version 1200 px en JPEG (partage Facebook / Open Graph).
  config.addAsyncShortcode("imagePartage", async (fichier, base) => {
    const source = path.join(MEDIAS, fichier);
    if (!fs.existsSync(source)) return new URL("/assets/partage.jpg", base).href;
    const meta = await Image(source, { ...OPTIONS_IMAGES, formats: ["jpeg"], widths: [1200] });
    return new URL(meta.jpeg[0].url, base).href;
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk", "md", "11ty.js"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    // Préfixe d'URL (ex. /SMVT/ sur dkuster.github.io avant le passage au domaine).
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
}
