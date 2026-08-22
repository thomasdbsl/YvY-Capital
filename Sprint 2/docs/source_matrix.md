# Matrice unifiee des sources

Cette matrice separe les domaines disponibles sans exposer les fichiers locaux. Les noms techniques sont des alias. Les preuves detaillees et empreintes restent dans les manifests locaux ignores par Git.

| Source alias | Categorie | Couverture | Portee temporelle | Periode observee | Grain | Frequence | Fraicheur | Qualite | Couche | Diffusion | KPI alimentes |
|---|---|---:|---|---|---|---|---|---|---|---|---|
| `SRC_SNAPSHOT_EXPORTS` | Export portefeuille semi-structure | 7 fonds | Snapshot | une date metier en 2026-05 | fonds / section / contrat | ponctuelle | en retard par rapport a l'horodatage d'export | partielle : 38/51 colonnes, sections vides possibles | Raw local -> Silver | interdite en brut ; alias seulement | K01-K16 |
| `SRC_STRUCTURED_HISTORY` | Tables historiques structurees | 14 fonds | Historique | 2025-12 a 2026-08 | fonds / date / mesure | quotidienne selon table | derniere observation locale en 2026-08 | disponible mais controles de domaine requis | Raw local -> Silver | interdite en brut ; agregats synthetiques en demo | H01-H08 selon table |
| `SRC_PEER_UNIVERSE` | Referentiel de pairs | univers multiples | Snapshot versionne | date de reference a confirmer | univers / entite | ponctuelle | non certifiee | doublons et valeurs extremes a quarantainer | Raw local -> Silver | interdite en brut ; adaptateur synthetique seulement | H07 |
| `SRC_SYNTHETIC_FIXTURES` | Fixtures de demonstration | 14 alias dont 7 actifs au snapshot | Snapshot + historique | calendrier synthetique fixe | fonds / date / position | deterministe | toujours reproductible | cas nominaux et erreurs controles | Test -> Serving prototype | partageable | tous les KPI en mode exemple |

## Reconciliation 7 / 14

- Les sept exports ne constituent pas tout l'historique du projet : ils apportent un snapshot detaille de sept fonds.
- Les tables structurees locales couvrent quatorze fonds et plusieurs dates. Elles permettent d'evaluer les KPI historiques, sous reserve de qualite et d'alignement des dates.
- Le prototype ne copie aucune valeur de ces sources. Il utilise quatorze alias synthetiques, dont sept sont selectionnes pour le parcours snapshot.
- Les indicateurs historiques sont donc `available-with-controls`, et non `absent`. Leur certification reste `Pending partner validation`.

## Regles de source de verite

1. Le manifest local et son SHA-256 prouvent le fichier exact traite.
2. `source_id`, `source_record_id`, `run_id` et `business_date` accompagnent chaque ligne Silver.
3. Un KPI publie expose son `lineage_ref`, sa fraicheur et son statut de qualite.
4. Les donnees de pairs restent desactivees si la source n'est pas versionnee et validee.
5. Les fichiers bruts et les manifests contenant leurs noms ou empreintes ne quittent jamais l'espace restreint.
