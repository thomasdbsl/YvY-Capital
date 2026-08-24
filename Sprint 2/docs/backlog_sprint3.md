# Backlog Sprint 3 pret a engager

Les owners et reviewers sont des roles deja presents dans les sources du projet. Les personnes exactes et la capacite finale restent a confirmer au planning. Estimations en points relatifs.

| Ordre | ID | Priorite | Story | Owner | Reviewer | Est. | Fixture | Commande d'acceptation | Dependances / owner | Risques | DoD specifique |
|---:|---|---|---|---|---|---:|---|---|---|---|---|
| 1 | S3-01 | Must | Ingestion idempotente avec manifest et quarantaine | Data engineering lead | Application lead | 5 | `export_38.csv`, `export_51.csv` | `py -3.12 "Sprint 2/src/pipeline/run_pipeline.py" --verify` | espace local controle / coordination lead | format source variable | trois replays, memes empreintes, zero doublon |
| 2 | S3-02 | Must | Parser les exports a 38/51 colonnes et distinguer section vide/absente | Data engineering lead | Analytics lead | 8 | exports synthetiques + section vide | `npm run test:python` | registre de sections / data lead | en-tetes inconnus | compteurs lus/rejetes, erreurs sans valeur source |
| 3 | S3-03 | Must | Executer les regles DQ et bloquer la publication | Data engineering lead | UX lead | 5 | `quality_cases.json` | `py -3.12 "Sprint 2/src/pipeline/run_pipeline.py" --verify` | seuils metier / partner decision | faux positifs | rapport par regle, statut lot explicite |
| 4 | S3-04 | Must | Appliquer alias, denylist et exclusion des identifiants prives | Data engineering lead | Coordination lead | 3 | `privacy_cases.json` | `npm run test:python` | politique d'anonymisation / coordination | reidentification | zero hit dans sorties et logs |
| 5 | S3-05 | Must | Publier le contrat Serving synthetique et son lineage | Application lead | Data engineering lead | 5 | `snapshot_valid.json` | `npm run test:python` | schemas proposes / application lead | rupture contrat | schema valide et trois preuves de lineage |
| 6 | S3-06 | Must | Livrer les vues Direction fonds, allocation et positions | Application lead | UX lead | 8 | `serving_data.json` genere | `npm test` | gate D1-D4 / partner | refonte tardive | navigation, filtres, drill-down et etats E2E verts |
| 7 | S3-07 | Must | Livrer le workflow Analyste jusqu'a publication simulee | Application lead | Data engineering lead | 8 | anomalies synthetiques | `npm test` | matrice de droits / partner | confusion simulation/production | controle, detail, quarantaine, validation, lineage |
| 8 | S3-08 | Should | Calculer et exposer K01-K16 depuis contrats | Analytics lead | Data engineering lead | 8 | snapshot et positions synthetiques | `npm run test:python` | tolerances / partner | seuils non valides | 16 definitions completes, tests de domaine |
| 9 | S3-09 | Should | Preparer adaptateurs H01-H08 sans declarer Sprint 4 termine | Analytics lead | Application lead | 5 | historiques partiel/invalide | `npm run test:python` | calendrier, pairs, taux / partner | donnees partielles | interfaces, etats indisponibles, aucune valeur inventee |

## Capacite et engagement

L'ordre ci-dessus est propose. La selection finale, les noms individuels, les tolerances et la capacite restent `Pending partner validation`. Aucune story Sprint 4 ou Sprint 5 n'est declaree terminee dans ce backlog.
