// HTML restreint : validation (npm run check) et rendu (gabarits).
// Seules les balises et attributs listés ici sont autorisés dans les champs « texte ».
import { Parser } from "htmlparser2";

export const BALISES_AUTORISEES = {
  p: [], br: [], strong: [], b: [], em: [], i: [], u: [],
  a: ["href"], ul: [], ol: [], li: [], h3: [], h4: [], blockquote: [],
};
const BALISES_VIDES = new Set(["br"]);
const BALISES_BLOC = /^\s*<(p|ul|ol|h3|h4|blockquote)[\s>]/i;
const LIEN_OK = /^(https?:\/\/|mailto:|tel:|\/|#)/i;

const echapper = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const echapperAttr = (s) => echapper(s).replace(/"/g, "&quot;");

/** Accepte une chaîne ou une liste de paragraphes ; renvoie une chaîne HTML. */
export function joindre(texte) {
  if (texte == null) return "";
  if (Array.isArray(texte)) {
    return texte.map((t) => (BALISES_BLOC.test(t) ? t : `<p>${t}</p>`)).join("\n");
  }
  return texte;
}

/** Renvoie la liste des problèmes trouvés (vide si le HTML est conforme). */
export function validerHtml(html) {
  const erreurs = [];
  const parser = new Parser(
    {
      onopentag(nom, attributs) {
        const permis = BALISES_AUTORISEES[nom];
        if (!permis) {
          erreurs.push(`balise <${nom}> non autorisée`);
          return;
        }
        for (const [attr, valeur] of Object.entries(attributs)) {
          if (!permis.includes(attr)) erreurs.push(`attribut « ${attr} » non autorisé sur <${nom}>`);
          else if (attr === "href" && !LIEN_OK.test(valeur.trim()))
            erreurs.push(`lien « ${valeur} » refusé (http(s), mailto:, tel:, / ou # uniquement)`);
        }
        if (nom === "a" && !attributs.href) erreurs.push("lien <a> sans href");
      },
      oncomment() {
        erreurs.push("commentaire HTML non autorisé");
      },
      onprocessinginstruction(nom) {
        erreurs.push(`instruction ${nom} non autorisée`);
      },
    },
    { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true }
  );
  parser.write(html);
  parser.end();
  return erreurs;
}

/**
 * Rendu sûr : reconstruit le HTML en ne gardant que ce qui est autorisé
 * (filet de sécurité si la validation a été contournée) et ajoute
 * target/rel aux liens externes.
 */
export function rendreHtml(texte) {
  const html = joindre(texte);
  let sortie = "";
  const parser = new Parser(
    {
      onopentag(nom, attributs) {
        const permis = BALISES_AUTORISEES[nom];
        if (!permis) return;
        let attrs = "";
        if (nom === "a") {
          const href = (attributs.href || "").trim();
          if (LIEN_OK.test(href)) {
            attrs += ` href="${echapperAttr(href)}"`;
            if (/^https?:\/\//i.test(href)) attrs += ' target="_blank" rel="noopener"';
          }
        }
        sortie += `<${nom}${attrs}>`;
      },
      ontext(t) {
        sortie += echapper(t);
      },
      onclosetag(nom, implicite) {
        if (!BALISES_AUTORISEES[nom] || BALISES_VIDES.has(nom)) return;
        sortie += `</${nom}>`;
      },
    },
    { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true }
  );
  parser.write(html);
  parser.end();
  return sortie;
}

/** Version texte brut (descriptions, balises meta). */
export function texteBrut(texte, max = 0) {
  let s = "";
  const parser = new Parser({ ontext(t) { s += t; }, onclosetag() { s += " "; } }, { decodeEntities: true });
  parser.write(joindre(texte));
  parser.end();
  s = s.replace(/\s+/g, " ").trim();
  if (max && s.length > max) s = s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
  return s;
}
