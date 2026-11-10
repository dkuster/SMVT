# Site web du SMVT

Site statique du [Syndicat pour le Maintien du Vignoble en Terrasses de Vétroz](https://www.smvt.ch), généré avec [Eleventy](https://www.11ty.dev/) à partir de fichiers JSON.

- Spécification : [`specifications.md`](specifications.md)
- Guide technique (aussi utilisé par l'assistant IA) : [`CLAUDE.md`](CLAUDE.md)

## Installation

1. Installer [Node.js](https://nodejs.org/) (version LTS, 22 ou plus récente).
2. Dans ce dossier : `npm install`

## Utilisation

| Commande | Effet |
|---|---|
| `npm run dev` | Aperçu local sur http://localhost:8080, mis à jour à chaque modification |
| `npm run check` | Vérifie toutes les données (à lancer après chaque modification) |
| `npm run build` | Vérifie, génère le site dans `_site/` et contrôle les liens |

Un `git push` sur `main` publie automatiquement le site (onglet **Actions** sur GitHub pour suivre la publication). Si `npm run check` échoue, rien n'est publié.

## Publier une convocation

1. Copier `content/assemblees/<année précédente>.json` vers `content/assemblees/AAAA.json`.
2. Mettre à jour `numero`, la date, l'heure, l'ouverture, le lieu, `convoqueeLe` et l'ordre du jour ; retirer `documents` et `decisions`.
3. Facultatif : déposer le PDF de la convocation dans `media/assemblees/AAAA/convocation.pdf` et l'ajouter dans `documents`.
4. `npm run check`, puis `npm run dev` pour vérifier.
5. Commit et push.

Après l'assemblée : ajouter le procès-verbal (`media/assemblees/AAAA/pv.pdf`, statut `projet` puis `signe`).

Dans VS Code, l'autocomplétion et les erreurs s'affichent directement dans les fichiers JSON grâce aux schémas.

## Reprise des documents de l'ancien site (une seule fois)

1. Télécharger par FTP le dossier `wp-content/uploads` de l'ancien hébergement **hors de ce dépôt** (ex. `C:\TEMP\SMVT\uploads`).
2. `npm run import-wordpress -- "C:\TEMP\SMVT\uploads"`
   - copie les 21 PDF et les 2 photos sous leur nouveau nom dans `media/` (correspondance : `Resources/import-wordpress.json`) ;
   - refuse tout PDF contenant du JavaScript ou des fichiers embarqués, réencode les photos ;
   - ne copie rien d'autre.
3. Convertir à la main le PowerPoint `2018/12/20181023-AG-4.pptx` en `media/assemblees/2018/presentation.pdf`.
4. PV 2022 : deux versions existent (`2024/07/…-non-signe.pdf` importée, `2023/11/…docx.pdf`) ; garder la signée si elle existe.
5. `npm run check` doit afficher ✓.

## Mise en service sur GitHub Pages (une fois)

1. Dépôt `dkuster/SMVT` **public** → *Settings* → *Pages* → *Build and deployment* → *Source* : **GitHub Actions**.
2. Premier push sur `main` : le site est visible sur https://dkuster.github.io/SMVT/.
3. Domaine `www.smvt.ch` : voir `specifications.md`, section 5.3.
