# Site du SMVT — guide pour l'assistant

Site statique du Syndicat pour le Maintien du Vignoble en Terrasses de Vétroz (www.smvt.ch), généré par **Eleventy 3** à partir de fichiers **JSON validés par JSON Schema**, publié sur **GitHub Pages** par GitHub Actions. Même architecture que le site du Théâtre de la Grappe (`TGV-website`). La spécification complète est dans `specifications.md` : la lire avant tout changement de structure.

Langue : tout le contenu, les commentaires de code et les messages de commit sont en **français**.

## Structure

```
content/                 ← LES DONNÉES (c'est presque toujours ici qu'on travaille)
  site.json              nom, e-mails, lien Tally (conduite), lien lettre d'information, photos
  comite.json            membres du comité (fonction, nom, e-mail de fonction)
  infos-pratiques.json   page Infos pratiques
  documents.json         documents de référence (statuts, décision du Grand Conseil, plans…)
  assemblees/AAAA.json   une assemblée générale par fichier (2020-2021.json pour l'AG par correspondance)
  avis/AAAA-MM-JJ-titre.json   avis ponctuels (arrosages…)
  redirections.json      anciennes URL WordPress → nouvelles
media/                   PDF et photos référencés par le contenu (chemins relatifs à media/)
  assemblees/<id>/       convocation.pdf, dossier.pdf, bulletin.pdf, pv.pdf…
  documents/  avis/  photos/
schemas/                 JSON Schema de chaque type de fichier (+ communs.schema.json)
theme/theme.json         couleurs, polices, arrondis → /css/theme.css
Resources/               marque.svg (pictogramme provisoire, en currentColor), import-wordpress.json
src/                     gabarits Nunjucks (pages, _includes/layouts, _includes/partials), css/style.css
lib/                     content.js (chargement + enrichissement), html.js (HTML restreint), icones.js
scripts/                 check.js (validation), check-links.js (liens internes), importer-wordpress.js (reprise unique)
eleventy.config.js       filtres, shortcodes images, plugins
```

## Commandes

- `npm run dev` — serveur local http://localhost:8080 avec rechargement.
- `npm run check` — valide données, HTML, références, médias. **Toujours lancer après une modification de contenu.**
- `npm run build` — check + génération dans `_site/` + vérification des liens internes.
- `npm run import-wordpress -- <dossier uploads>` — reprise unique des PDF de l'ancien site (voir README).

## Règles impératives

1. **Dépôt public** : jamais de mot de passe, jeton, export de base de données, liste d'abonnés, ni donnée personnelle non destinée à être publiée. Les sources WordPress restent hors du dépôt.
2. **HTML restreint** dans les champs `texte` : uniquement `p br strong b em i u a(href) ul ol li h3 h4 blockquote`. Liens : `http(s)://`, `mailto:`, `tel:`, `/…` ou `#…`. `npm run check` refuse le reste. Ne jamais contourner (pas de `| safe` sur un champ sans le filtre `html`).
3. **Médias** : seulement jpg, jpeg, png, webp, pdf ; noms en minuscules sans espaces ni accents ; images ~2000 px max de côté. Tout `alt` doit décrire l'image. Pas de SVG dans `media/`. Un PDF contenant du JavaScript ou des fichiers embarqués est refusé : le réimprimer en PDF.
4. **Comité** : uniquement des adresses de fonction (`…@smvt.ch`), jamais d'adresse ou de téléphone privés.
5. **Ne pas modifier les schémas** pour faire passer une donnée invalide : corriger la donnée. Si un nouveau champ est vraiment nécessaire, mettre à jour schéma + gabarit + `specifications.md` ensemble.
6. Les fichiers générés (`_site/`, `.cache/`) ne sont jamais commités.
7. Les procès-verbaux publiés restent dans l'historique Git : vérifier avant de commiter qu'ils ne contiennent rien qu'on ne voudrait pas rendre public.

## Modèle « assemblée » (résumé — voir schemas/assemblee.schema.json)

`numero` (1 = 2015, consécutif) et `type` (ordinaire | extraordinaire | correspondance) sont obligatoires. Réunion : `date`, `heure`, `lieu` obligatoires, `ouverture` (salle), `convoqueeLe`. Correspondance : `delaiVote` obligatoire, `date` = date des résultats. Puis `ordreDuJour[] {point, document?}`, `documents[] {id, type, titre?, statut?, fichier}`, `decisions[]`, `texte`, `brouillon`.

- Types de document : convocation, dossier (« Documents de l'assemblée »), presentation, bulletin, pv, comptes, autre. `statut` (pv) : signe | non-signe | projet.
- Renvoi depuis l'ordre du jour : `"document": "2024/pv"` (document `pv` de l'AG 2024) ou `"documents/statuts"` (documents.json). `npm run check` vérifie que la cible existe.
- Le PV d'une AG est rangé dans **son** AG (`media/assemblees/2025/pv.pdf`), même s'il est approuvé l'année suivante.
- Le texte standard de convocation (« Les membres propriétaires… art. 9 des statuts ») est généré par le gabarit : ne pas le recopier dans `texte`.

**Accueil** : « Prochaine assemblée générale » tant que la date ≥ aujourd'hui (heure de Zurich), puis « Dernière assemblée générale ». Un rebuild quotidien (GitHub Actions) fait la bascule.

## Procédures courantes

- **Convocation** : copier le fichier de l'année précédente vers `content/assemblees/AAAA.json`, incrémenter `numero`, mettre à jour date/heure/ouverture/lieu/`convoqueeLe`/ordre du jour (le point « Lecture du procès-verbal » renvoie vers `<année précédente>/pv`), retirer `documents` et `decisions`. Si le comité fournit un PDF : `media/assemblees/AAAA/convocation.pdf` + entrée `{ "id": "convocation", "type": "convocation", … }`. `npm run check`, aperçu, publication.
- **Après l'AG** : PV dans `media/assemblees/AAAA/pv.pdf` + entrée `{ "id": "pv", "type": "pv", "statut": "projet" }` ; passer à `"signe"` quand la version signée remplace le fichier. Décisions éventuelles dans `decisions`.
- **Avis** : `content/avis/AAAA-MM-JJ-titre.json` avec `jusquau` pour l'afficher sur l'accueil jusqu'à cette date.
- **Comité** : `content/comite.json`.
- **Formulaire Tally / lettre d'information** : renseigner `conduite.formulaire` ou `lettreInformation.inscription` (+ `service`) dans `content/site.json` ; les pages Contact, Lettre d'information et Confidentialité s'adaptent.

## Points techniques

- Le shortcode `image` est asynchrone : dans une boucle qui l'utilise, employer `{% asyncEach %}…{% endeach %}` et non `{% for %}`.
- Les URL internes s'écrivent toujours en absolu depuis la racine (`/assemblees/…`, `/media/…`) : `HtmlBasePlugin` ajoute le préfixe (`PATH_PREFIX`, `/SMVT/` sur dkuster.github.io).
- Le pictogramme est inséré via `/assets/logo.svg` et `/assets/logo-pied.svg`, générés à chaque build depuis `Resources/marque.svg` avec les couleurs du thème (`lib/icones.js`), ainsi que le favicon, l'icône téléphone et l'image de partage.
- Les liens vers les PDF affichent format et taille (`infoMedia` dans `lib/content.js`) ; un média absent n'interrompt pas `npm run dev` mais fait échouer `npm run check`.
