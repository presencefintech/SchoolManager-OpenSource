# Refonte de la carte d'identité élève (StudentCardPreview)

## Contexte

La carte élève existante (`src/components/student-card/student-card-preview.tsx`) affiche déjà
toutes les informations nécessaires (photo, identité, classe, QR...) mais dans un registre
"carte bancaire premium" (dégradés, puce dorée, bandeau holographique) jugé peu lisible et peu
sérieux. L'objectif est de la restyler dans un registre "carte d'identité officielle" (type CNI),
sans toucher à la logique métier, à la génération du QR, ni au pipeline d'export/impression.

Ce composant est le seul système actif de carte élève : il est utilisé pour l'aperçu écran,
l'export PDF (`export-pdf.tsx` via `html2canvas` + `jsPDF`) et l'impression navigateur, sur 3
pages (`admin/students/[id]`, `super-admin/enrollment`, `student-detail-panel`).

Un ancien composant `src/components/student-card/StudentIdCard.tsx` existe mais n'est plus
importé nulle part — hors périmètre, non touché.

## Objectif

Redessiner l'apparence visuelle de la carte pour un rendu plus sobre et institutionnel, en
conservant toutes les données actuellement affichées et en garantissant que le QR reste
scannable après impression.

## Direction visuelle

**Registre** : carte d'identité officielle / gouvernementale — sérieux, formel, disposition en
colonnes strictes, proche d'une vraie CNI. Pas de skeuomorphisme "carte bancaire".

**À retirer** par rapport à la version actuelle :
- Dégradé plein fond + texture diagonale hachurée
- Puce dorée façon carte bancaire
- Bandeau holographique décoratif
- Badges colorés arrondis (pastille genre, encadré matricule en couleur)

**À adopter** :
- Fond blanc / gris très clair, texte noir / gris foncé (contraste fort, lisibilité prioritaire)
- En-tête fin : logo + nom école en texte noir sur fond clair (plus de bloc dégradé plein),
  un filet de couleur (accent école) sous l'en-tête au lieu d'un bandeau plein
- Photo dans un cadre rectangulaire à bordure fine (couleur accent), style photo d'identité,
  sans effet de profondeur/ombre marquée
- Bloc identité en lignes de formulaire strictes, étiquette petite-majuscule grise + valeur
  noire, séparateurs fins horizontaux — champs : `NOM`, `POST-NOM` (si présent), `PRÉNOM`,
  `SEXE`, `NÉ(E) LE`, `LIEU DE NAISSANCE`, `NATIONALITÉ`, `CLASSE` (classe · section · option),
  `MATRICULE`
- QR dans un cadre blanc à bordure fine (pas de couleur de fond derrière le QR), numéro de
  série + validité en dessous en petit monospace
- Un seul point d'accent couleur par carte : bande latérale fine + filet sous l'en-tête
  (couleur = thème école existant, `card-theme.ts`, inchangé)
- Pied de carte sobre : mention légale + numéro de série, filet fin au-dessus, plus de
  dégradé de fond

**Palette / thème** : le système multi-écoles à 6 presets (`teal`, `indigo`, `forest`,
`crimson`, `navy`, `minimal`) est conservé tel quel dans `card-theme.ts`. Chaque école garde
sa couleur, mais celle-ci n'est plus utilisée en fond plein — seulement en accent (bande,
filet, bordure photo/QR).

## Champs de données affichés

Aucun champ ajouté ni retiré par rapport à l'existant — la carte actuelle est déjà complète.
Champs conservés : nom de l'école, ville, devise/slogan, année scolaire, nom, post-nom,
prénom, sexe, matricule, classe/section/option, date de naissance, nationalité, lieu de
naissance, validité, numéro de série, QR, logo école, photo élève.

## Portée technique

**Fichiers modifiés** :
- `src/components/student-card/student-card-preview.tsx` — réécriture de la mise en page et
  des styles (le composant garde exactement la même interface `StudentCardPreviewProps`)
- `src/lib/student-card/card-layout.ts` — ajustement des constantes de dimensions (colonnes,
  marges, tailles de police) pour la nouvelle grille

**Fichiers non modifiés (contraintes dures)** :
- `src/lib/student-card/card-theme.ts` — système de thème conservé à l'identique
- `src/lib/student-card/build-qr-payload.ts`, `resolve-assets.ts`, `validate-qr.ts` — aucune
  modification de la génération/validation du QR
- `src/lib/student-card/export-pdf.tsx` — pipeline d'export PDF / impression inchangé ; le
  composant doit continuer d'exposer la classe `.student-card` avec les dimensions CR80
  (85.6 × 54 mm) attendues par `html2canvas`
- Les 3 pages consommatrices (`admin/students/[id]`, `super-admin/enrollment`,
  `student-detail-panel.tsx`) — aucun changement d'appel, elles héritent automatiquement du
  nouveau rendu

**Contraintes QR (non négociables)** :
- Taille imprimée du QR ≥ 13 mm (`QR_MIN_SIZE_MM`, `validate-qr.ts`)
- Niveau de correction d'erreur H conservé
- Zone blanche (quiet zone) autour du QR conservée
- Contraste fort noir sur blanc pur, aucun overlay ou fond coloré sous le QR
- Aucun changement du payload encodé (`serializeStudentCardQrPayload`)

## Vérification

Aucun test automatisé n'existe sur ce composant. Validation manuelle après implémentation :
1. Rendu visuel sur `/admin/students/[id]` (thème école par défaut + un thème alternatif)
2. Export PDF (`downloadStudentCardPdf`) — vérifier que le rendu capturé correspond à
   l'aperçu écran (WYSIWYG) et que rien n'est coupé/débordant
3. Impression navigateur (`printStudentCard`) — vérifier le format CR80
4. Scan réel du QR imprimé/exporté avec un téléphone pour confirmer qu'il reste lisible après
   le changement de mise en page
