# Site web du Syndicat pour le Maintien du Vignoble en Terrasses de Vétroz (SMVT)

> Spécification v0.2 — 10 novembre 2026. Reprend l'architecture du site du Théâtre de la Grappe (`TGV-website`). Les décisions prises sont intégrées ; les points encore ouverts sont listés à la fin.

# 1. Généralités

Le SMVT réunit les propriétaires de vignes du coteau en terrasses de Vétroz (assemblée constitutive du 3 novembre 2014, décision du Grand Conseil du 13 juin 2014). Son site www.smvt.ch (WordPress) a été piraté en septembre 2026 (voir `incident-piratage-2026.md` dans le projet Claude « SMVT »).

Le site évolue très peu : une convocation par an avant l'assemblée générale, la publication du procès-verbal après, quelques documents ou avis (arrosages, travaux), et de rares changements au comité.

**Principe : un site statique, généré à partir de fichiers de données, sans base de données, sans code serveur, sans traceur.** Même outillage que le site TGV.

## 1.1 Maintenance

- Maintenu par Dom (webmaster@smvt.ch), éventuellement avec l'aide d'un assistant IA (`CLAUDE.md`).
- Pas d'interface d'administration : toute modification passe par le dépôt Git, la publication est automatique.

## 1.2 Externalisé / abandonné

| Ancien élément WordPress | Remplacement |
|---|---|
| Formulaire « Contact » (CF7 → secretariat@) | Adresses e-mail de fonction sur la page Contact |
| Formulaire « Conduite » (CF7 → conduites@, pièce jointe) | **Formulaire Tally** (pièce jointe sans compte) ; tant que son lien n'est pas renseigné, e-mail pré-rempli vers conduites@ |
| Extension Newsletter (14 abonnés confirmés, listes « convocations AG » et « lettres d'info ») | Service externe de lettre d'information (Brevo) ; en attendant, inscription par e-mail au secrétariat |
| WP Statistics, Flamingo, SMTP Mailer, Really Simple Security, Check & Log Email | Supprimés (plus de serveur, plus de données collectées) |
| Recherche, catégories, auteurs, dates de publication | Supprimés |
| Article « Janvier 2019 » (vœux, ajout de documents, ouverture de la newsletter) | Non repris ; la décision sur la cotisation figure dans l'AG 2019 |
| Article « Décisions de l'AG virtuelle » | Fusionné dans l'AG 2020-2021 |

# 2. Sections du site

Français uniquement. Mobile d'abord. Navigation : Accueil, Assemblées, Documents, Comité, Infos pratiques, Contact.

## 2.1 Accueil

- Photo des terrasses en bandeau (première photo de `site.json`), nom et description du syndicat.
- **Assemblée générale** mise en avant :
  - date ≥ aujourd'hui (heure de Zurich) → « Prochaine assemblée générale » : date, heure, ouverture, lieu, bouton « Convocation et ordre du jour » ;
  - date passée → « Dernière assemblée générale » avec le lien vers le PV s'il est publié.
- Avis en cours (champ `jusquau`).
- Accès rapides : Assemblées, Documents, Infos pratiques, Problème de conduite.
- Bandeau « Recevoir les convocations par e-mail ».

## 2.2 Assemblées générales

- `/assemblees/` : liste de toutes les AG (n° 1 de 2015 à aujourd'hui), de la plus récente à la plus ancienne.
- `/assemblees/<id>/` : une page par AG — texte standard de convocation (généré), date, heure, ouverture de la salle, lieu, ordre du jour numéroté avec renvois vers les documents (ex. PV de l'AG précédente), signature « Vétroz, le … — Le Comité », décisions, documents, navigation vers l'AG précédente / suivante. Données structurées `Event` (schema.org) pour une AG à venir.
- AG par correspondance (2020-2021) : délai de renvoi du bulletin, date des résultats, décisions.

## 2.3 Documents

Page **générée automatiquement** :

1. Documents de référence (`content/documents.json`) : statuts, PV de l'assemblée constitutive, décision du Grand Conseil, plan du sous-périmètre 1, réception des travaux 2019.
2. Documents des assemblées, par AG, tirés des fichiers `content/assemblees/*.json`.
3. Documents joints aux avis.

Chaque lien indique le format et la taille (« PDF, 180 Ko »). Ajouter un PV dans le fichier de l'AG suffit : il apparaît sur la page de l'AG, sur la page Documents et, s'il s'agit de la dernière AG, sur l'accueil.

## 2.4 Comité

Fonction, nom, e-mail de fonction (presidence@, secretariat@, caisse@, webmaster@). Les membres sans fonction sont affichés comme « Membre ». Pas de photo.

## 2.5 Infos pratiques

Texte libre (rattachement de la parcelle au syndicat quelle que soit la culture, art. 4 ; impossibilité de se retirer, art. 5), avec lien vers les statuts.

## 2.6 Contact et signalement d'un problème de conduite

- Questions générales : secretariat@smvt.ch ; e-mails de fonction du comité.
- **Signaler un problème de conduite** (ancre `/contact/#conduite`) :
  - si `site.json → conduite.formulaire` est renseigné : bouton vers le **formulaire Tally**, avec l'e-mail conduites@ en alternative ;
  - sinon : bouton `mailto:conduites@smvt.ch` avec objet et corps pré-remplis (nom, prénom, adresse, NPA/localité, mobile, n° de parcelle(s), description) ; la photo se joint dans la messagerie.
- Champs du formulaire Tally à créer (repris du formulaire WordPress) : nom*, prénom*, adresse*, NPA*, localité*, téléphone mobile*, e-mail*, numéro(s) de parcelle(s)*, description, pièce jointe (photo/PDF, 4 Mo). Notification vers conduites@smvt.ch.
- Pas d'adresse postale publiée tant que le comité n'en fournit pas (`site.json → contact.adresse`, facultatif).

## 2.7 Lettre d'information

- Page `/lettre-information/`.
- Si `site.json → lettreInformation.inscription` est renseigné : bouton « S'inscrire » vers la page hébergée du service ; le service gère la liste, le double opt-in, les envois et la désinscription.
- Si `lettreInformation.integrer` vaut `true` : le formulaire du service est affiché dans la page (iframe, largeur 100 % jusqu'à 540 px), avec un lien « Ouvrir le formulaire dans une nouvelle fenêtre » en secours ; la page Confidentialité signale que ce formulaire est chargé depuis le prestataire. Service retenu : **Brevo** (formulaire hébergé `sibforms.com`).
- Sinon : invitation à écrire au secrétariat (e-mail pré-rempli).
- Reprise des 14 abonnés confirmés : import du CSV dans le service choisi (le fichier reste hors du dépôt).

## 2.8 Avis

Avis ponctuels (« Arrosages » 2018). Champ `jusquau` facultatif : affichage sur l'accueil jusqu'à cette date. Archive sur `/avis/`.

## 2.9 Pages techniques

Mentions légales, Confidentialité (nLPD : pas de cookies ni de traceur ; mentionne Tally et le service de lettre d'information seulement s'ils sont configurés), 404 (renvoie vers Documents, car d'anciens liens vers des PDF circulent dans les e-mails), `sitemap.xml`, `robots.txt`.

# 3. Modèle de données

JSON validés par JSON Schema (draft 2020-12), `"$schema"` déclaré dans chaque fichier (autocomplétion dans VS Code), build en échec si invalide. HTML restreint identique au site TGV : `p br strong b em i u a(href) ul ol li h3 h4 blockquote`.

## 3.1 Arborescence

```
content/
  site.json                 nom, sigle, nom officiel, description, url, e-mail, conduite, lettre d'information, photos
  comite.json               membres : fonction?, nom, email?
  infos-pratiques.json      titre, introduction, texte
  documents.json            documents de référence : id, titre, date?, description?, fichier
  assemblees/
    2015.json … 2025.json   une AG par fichier (2020-2021.json pour l'AG par correspondance)
  avis/
    2018-08-03-arrosages.json
  redirections.json
media/
  assemblees/<id>/          dossier.pdf, convocation.pdf, presentation.pdf, bulletin.pdf, pv.pdf
  documents/                statuts.pdf, pv-constitution-2014.pdf, decision-grand-conseil-2014.pdf, plan-sous-perimetre-1.pdf, reception-travaux-2019.pdf
  avis/                     plan-arrosage-2018.pdf
  photos/                   terrasses-01.jpg, terrasses-02.jpg
schemas/                    site, comite, page, documents, assemblee, avis, redirections, theme, communs
theme/theme.json            couleurs, polices → /css/theme.css
Resources/                  marque.svg (pictogramme), import-wordpress.json (correspondance de reprise)
src/  lib/  scripts/        gabarits, chargement des données, validation, contrôle des liens, import
```

## 3.2 Assemblée générale (`content/assemblees/<id>.json`)

| Champ | Type | Obl. | Remarque |
|---|---|---|---|
| `numero` | entier | oui | n° de l'AG (1 = 2015), unique ; un trou dans la numérotation produit un avertissement |
| `titre` | texte | non | défaut : « Assemblée générale <id> » |
| `type` | `ordinaire` \| `extraordinaire` \| `correspondance` | oui | |
| `date` | AAAA-MM-JJ | réunion | date de l'AG, ou des résultats pour un vote par correspondance ; doit correspondre au nom du fichier |
| `heure`, `ouverture` | HH:MM | `heure` : réunion | ouverture de la salle |
| `lieu` | texte | réunion | ex. « Salle des Pas perdus, Centre scolaire des Plantys, Route du Stade 6, Vétroz » |
| `delaiVote` | AAAA-MM-JJ | correspondance | date limite de renvoi du bulletin |
| `convoqueeLe` | AAAA-MM-JJ | non | « Vétroz, le … » |
| `ordreDuJour` | liste de `{ point, document? }` | non | `document` : « <id AG>/<id document> » (ex. `2024/pv`) ou « documents/<id> » |
| `documents` | liste de `{ id, type, titre?, statut?, fichier }` | non | `type` : convocation \| dossier \| presentation \| bulletin \| pv \| comptes \| autre ; `statut` (PV) : signe \| non-signe \| projet |
| `decisions` | liste de textes | non | résultats des votes |
| `texte` | HTML restreint | non | |
| `brouillon` | booléen | non | |

Le PV d'une AG est rattaché à **son** AG (n° N), même s'il est approuvé à l'AG N+1 ; l'ordre du jour de N+1 y renvoie.

## 3.3 Avis

`titre`, `date` (= préfixe du nom de fichier), `jusquau?`, `texte` (HTML restreint), `documents?` (`{ titre, fichier }`), `brouillon?`.

## 3.4 Informations de référence

| Élément | Valeur |
|---|---|
| Nom officiel | Syndicat pour le maintien du vignoble en terrasses sur la commune de Vétroz |
| E-mails | secretariat@, presidence@, caisse@, webmaster@, conduites@ (smvt.ch) |
| Comité (état 12.03.2026) | Présidence : Mme Chloé Fontannaz ; Secrétariat : M. Fabien Papilloud ; Caisse : M. Alexandre Roh ; Site web : M. Dominique Kuster ; membres : MM. Stéphane Pillet, Benoît Huser, Gérald Glassey |

# 4. Interface

- Mobile d'abord, sobre et lisible par un public âgé : texte de base 18 px, contrastes ≥ 6:1 pour les liens et textes secondaires, liens explicites avec format et taille des fichiers.
- Pas de logo : titre typographique « SMVT » accompagné d'un **pictogramme provisoire** (quatre terrasses et leurs rangs de vigne, `Resources/marque.svg`), décliné en favicon, icône téléphone et image de partage.
- Thème « vigne et pierre sèche » dans `theme/theme.json` : fond pierre claire, vert vigne, pied de page vert très sombre ; titres en Georgia, texte en police système.
- Photos des terrasses : droits d'utilisation confirmés. La première sert de bandeau sur l'accueil et d'image de partage.
- Pas de JavaScript ; menu mobile en `<details>`.

# 5. Technique

## 5.1 Outillage

Identique au TGV : Eleventy 3, Nunjucks, ajv, sharp / eleventy-img, Node 22 (`.nvmrc`), scripts `dev`, `check`, `build`. Le `check` vérifie en plus :

- l'existence des documents cités dans les ordres du jour ;
- l'unicité des numéros d'AG et la cohérence date / nom de fichier ;
- chaque PDF : vraie signature PDF, pas de JavaScript, action de lancement ni fichier embarqué ;
- chaque média de `media/` est référencé (pas de fichier orphelin publié) et chaque média référencé existe.

## 5.2 Hébergement et publication

- **GitHub Pages**, dépôt `dkuster/SMVT` (créé, vide). Dépôt **public**.
- Workflow `.github/workflows/publication.yml` repris du TGV : build à chaque push, déploiement depuis `main`, vérification seule sur les autres branches, rebuild chaque nuit (bascule « Prochaine » → « Dernière » AG, retrait des avis échus). GitHub désactive les tâches planifiées après 60 jours sans commit : sans gravité (la convocation précède l'AG d'un mois environ), un commit suivant les réactive.
- Mise en service : *Settings → Pages → Source : GitHub Actions*. Avant le domaine, le site est visible sur `https://dkuster.github.io/SMVT/` (préfixe `/SMVT/` géré par `PATH_PREFIX`).

## 5.3 Mise en ligne du domaine — opérations manuelles

Domaine, DNS et messagerie `smvt.ch` : **Swisscenter**, gérés par Dom. À faire au moment de la bascule, pas avant (le domaine pointerait vers un site vide).

1. **Quelques jours avant** : abaisser le TTL des enregistrements `@` et `www` à 300 s.
2. **GitHub, paramètres du compte** `dkuster` → *Pages* → *Add a domain* : `smvt.ch`. Créer chez Swisscenter le TXT fourni :
   - `TXT  _github-pages-challenge-dkuster  <valeur fournie par GitHub>` (sous-domaine de `smvt.ch`)
   puis *Verify*.
3. **Chez Swisscenter**, zone DNS de `smvt.ch` :
   - supprimer les `A` / `AAAA` de `@` et `www` qui pointent vers l'ancien hébergement ;
   - `@` :
     ```
     A     185.199.108.153
     A     185.199.109.153
     A     185.199.110.153
     A     185.199.111.153
     AAAA  2606:50c0:8000::153
     AAAA  2606:50c0:8001::153
     AAAA  2606:50c0:8002::153
     AAAA  2606:50c0:8003::153
     ```
   - `www` : `CNAME  dkuster.github.io.`
   - **ne pas toucher** aux `MX`, SPF, DKIM, DMARC, `autoconfig`, `mail`, `imap`, `smtp` : presidence@, secretariat@, caisse@, webmaster@ et conduites@ en dépendent.
4. **Dépôt** → *Settings → Pages → Custom domain* : `www.smvt.ch` (pas de fichier `CNAME` nécessaire avec GitHub Actions), puis **Enforce HTTPS** une fois le certificat émis.
5. Contrôler : `https://smvt.ch`, `https://www.smvt.ch`, une ancienne URL redirigée (`/ag2015/`), envoi et réception d'un e-mail sur secretariat@.
6. **Ancien hébergement** (compte mutualisé `isabelle`) : supprimer les fichiers et la base du site compromis, désactiver PHP pour smvt.ch, faire vider `/tmp/.dps_*` et vérifier les tâches cron. Ne pas résilier si la messagerie ou d'autres sites dépendent du même abonnement.
7. **Google Search Console** : retirer les 7 propriétaires inconnus (fichiers de vérification posés dans `/comite/`), soumettre le nouveau `sitemap.xml`.
8. Repasser `PATH_PREFIX` à `/` : automatique (le workflow lit le chemin de base fourni par GitHub Pages).

## 5.4 Anciennes adresses

Pages de redirection (meta refresh + lien canonique) générées depuis `content/redirections.json` :

| Ancienne URL | Nouvelle |
|---|---|
| `/documents/`, `/comite/`, `/contact/`, `/infos-pratiques/` | identiques |
| `/ag2015/`, `/assemblee-generale-2016/` … `/assemblee-generale-2025/` | `/assemblees/2015/` … |
| `/__trashed/` (AG 2019), `/janvier-2019/` | `/assemblees/2019/` |
| `/juin-2021/`, `/decisions-de-lag-virtuelle/`, `/smvt-ag-2020-2021-vcorrigee/` | `/assemblees/2020-2021/` |
| `/arrosages/` | `/avis/2018-08-03-arrosages/` |
| `/newsletter/` | `/lettre-information/` |
| `/conduite/` | `/contact/#conduite` |
| `/category/assemblee-generale/`, `/author/admin/` | `/assemblees/`, `/` |

Les liens directs vers des PDF (`/wp-content/uploads/…`) ne peuvent pas être redirigés sur GitHub Pages ; la page 404 renvoie vers Documents.

# 6. Maintenance assistée par IA

`CLAUDE.md` à la racine (structure, règles, commandes, procédures). Procédures courantes :

- **Convocation** : copier le fichier de l'année précédente vers `content/assemblees/AAAA.json`, mettre à jour, `npm run check`, aperçu, push. Envoyer ensuite la lettre d'information avec le lien vers `/assemblees/AAAA/`.
- **Après l'AG** : PV `projet`, puis `signe` ; décisions.
- **Comité** : `content/comite.json`.

Skill éventuelle `smvt-contenu` (convocation à partir du PDF ou du texte du comité → JSON).

# 7. Création initiale

## 7.1 Sources (hors dépôt)

- Contenu texte : `C:\TEMP\SMVT\Wordpress\_RECUPERATION_CLAUDE\contenu_complet_smvt.html` (base du 28.10.2026), repris dans `content/` le 10.11.2026.
- Abonnés : `C:\TEMP\SMVT\Database\newsletter_abonnes_confirmes.csv` (14) — **jamais dans le dépôt**.
- PDF, PPTX et photos : récupérés par Dom à la source, puis `npm run import-wordpress` (correspondance dans `Resources/import-wordpress.json` : 20 PDF, 1 PPTX à convertir, 2 photos).

## 7.2 Règles de reprise (site compromis)

1. Seuls les PDF et JPG listés dans `Resources/import-wordpress.json` sont repris ; aucun autre fichier du serveur.
2. PDF : signature vérifiée, refus de tout PDF contenant JavaScript, action de lancement ou fichier embarqué (à réimprimer depuis l'original). Photos réencodées par sharp (métadonnées supprimées, 2000 px max).
3. Le PPTX 2018 est converti en PDF à la main.
4. Doublons : `SMVT-AG-2020-2021.pdf` remplacé par la version corrigée ; PV 2022 en deux versions (`…-non-signe.pdf` importée par défaut) → garder la signée si elle existe.
5. Dépôt public, historique Git permanent : relire les PV avant le premier commit des médias.

## 7.3 Corrections apportées au contenu lors de la reprise

- AG 2016 : convocation datée « Vétroz, le 30 août 2015 » → 30 août 2016 (coquille).
- AG 2024 : l'ordre du jour citait le PV « du 12 décembre 2023 » → 20 décembre 2023 (date de l'AG n° 8, confirmée par le nom du PV).
- AG 2019 : décision « cotisation fixée à 10 centimes » reprise de l'article « Janvier 2019 ».

## 7.4 Étapes

1. Spécification et décisions *(fait le 10.11.2026)*.
2. Squelette, schémas, gabarits, thème provisoire, workflow, `CLAUDE.md` *(fait le 10.11.2026)*.
3. Saisie du contenu : 10 AG (2015 → 2025), documents de référence, comité, infos pratiques, avis, redirections *(fait le 10.11.2026)*.
4. Récupération des PDF et photos, `npm run import-wordpress`, conversion du PPTX, relecture des PV.
5. Formulaire Tally « Problème de conduite » → lien dans `site.json`.
6. Publication sur `dkuster.github.io/SMVT/`, relecture par le comité.
7. AG n° 11 (2026) : `content/assemblees/2026.json`.
8. Bascule DNS, HTTPS, nettoyage de l'ancien hébergement, Search Console (5.3).
9. Service de lettre d'information + import des abonnés.

# 8. Points ouverts

Réglés le 10.11.2026 : DNS et messagerie chez Swisscenter (Dom), formulaire de conduite avec Tally, pas de logo (pictogramme provisoire), droits sur les photos des terrasses, récupération des PDF à la source.

- [ ] Service de lettre d'information (critères : hébergement CH/UE, double opt-in, deux listes « convocations AG » / « informations », coût nul ou faible pour < 50 abonnés).
- [ ] Adresse postale du syndicat à publier dans les mentions légales ?
- [ ] Date et ordre du jour de l'AG 2026 ; PV de l'AG 2025 (n° 10).
- [ ] PV 2022 : existe-t-il une version signée ?
