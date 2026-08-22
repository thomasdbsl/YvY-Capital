# Catalogue KPI testable

Le contrat canonique est [`../contracts/kpi_catalog.json`](../contracts/kpi_catalog.json). Les tests imposent pour chaque indicateur : question de decision, definition, formule, source, grain, unite, fenetre, prerequis, controles, tolerances, cas d'echec, affichage, lineage, fixture, statut d'implementation et sprint cible.

## Indicateurs snapshot

| ID | Indicateur | Source | Grain | Statut Sprint 2 | Affichage principal |
|---|---|---|---|---|---|
| K01 | Actif net | Snapshot 7 fonds | fonds/date | implemente sur synthese | a jour ou erreur |
| K02 | Valeur de part | Snapshot 7 fonds | fonds/date/type | implemente sur synthese | a jour ou incomplet |
| K03 | Nombre de parts | Snapshot 7 fonds | fonds/date | implemente sur synthese | a jour ou incomplet |
| K04 | Identite NAV | K01-K03 | fonds/date | implemente sur synthese | avertissement si ecart |
| K05 | Allocation par classe | Positions snapshot | fonds/date/classe | implemente sur synthese | a jour ou incomplet |
| K06 | Poids de position | Positions snapshot | fonds/date/position | implemente sur synthese | a jour ou incomplet |
| K07 | Concentration Top N | K06 | fonds/date/N | implemente sur synthese | a jour ou incomplet |
| K08 | HHI | K06 | fonds/date | implemente sur synthese | a jour ou incomplet |
| K09 | Exposition par indexeur | Positions snapshot | fonds/date/indexeur | implemente sur synthese | hypothese si mapping derive |
| K10 | Concentration emetteur | Positions snapshot | fonds/date/alias | implemente sur synthese | a jour ou incomplet |
| K11 | Echeances | Positions snapshot | fonds/date/bucket | implemente sur synthese | incomplet si date absente |
| K12 | Caisse et provisions | Sections snapshot | fonds/date/type | implemente sur synthese | distingue vide et absent |
| K13 | Rapprochement actif net | K01/K05/K12 | fonds/date | implemente sur synthese | hypothese jusqu'au seuil valide |
| K14 | Encours brut/transparise | Snapshot + bridge | portefeuille/date/vue | implemente sur synthese | hypothese a valider |
| K15 | Fraicheur prix | Positions snapshot | fonds/date/position | implemente sur synthese | a jour, retard ou incomplet |
| K16 | Qualite du run | Manifest + DQ | run/regle | implemente | publication bloquee si critique |

## Indicateurs historiques

Les historiques structures couvrent quatorze fonds sur plusieurs dates. Ils ne sont pas absents : leur disponibilite est `available-with-controls`. Le prototype n'en copie aucune valeur et utilise une serie synthetique.

| ID | Indicateur | Prerequis principal | Statut Sprint 2 | Cible |
|---|---|---|---|---|
| H01 | Rendement quotidien | NAV positives consecutives | interface + test | Sprint 4 |
| H02 | Rendement cumule | couverture de fenetre | interface + test | Sprint 4 |
| H03 | Volatilite annualisee | profondeur et calendrier | interface + test | Sprint 4 |
| H04 | Sharpe / Sortino | taux sans risque valide | contrat uniquement | Sprint 4 |
| H05 | Drawdown maximal | serie NAV valide | interface + test | Sprint 4 |
| H06 | DV01 / stress | unite duration validee | contrat uniquement | Sprint 4 |
| H07 | Comparaison aux pairs | univers versionne et nettoye | adaptateur synthetique | Sprint 4 |
| H08 | Attribution / flux | flux alignes et autorises | contrat uniquement | Sprint 4 |

## Conventions

- Toutes les fractions sont stockees en decimal et formatees seulement dans l'interface.
- Les montants de demonstration sont synthetiques et ne servent pas de seuil metier.
- Une valeur sans prerequis est `unavailable` ou `incomplete`, jamais inventee.
- Les seuils K04, K13, K15, H02, H03, H04, H06-H08 restent `Pending partner validation`.
- Tout KPI expose les quatre preuves minimales de lineage definies dans le contrat.
