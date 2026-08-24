# Sprint 2 - prototype, contrats et run de preuve

**Statut :** interactive prototype<br>
**Decision produit :** `Pending partner validation`<br>
**Classification versionnee :** fixtures synthetiques et contenus partageables uniquement

## Contenu livre

Le prototype couvre Executive Overview, Funds, Fund Detail, Allocation, Performance & Risk, Internal Comparison, Peer Comparison, Data Quality, Import & Validation et Run History & Lineage. Le parcours Executive explore les fonds et leurs indicateurs ; le parcours Analyst simule un controle local de structure, anomalies, quarantaine, validation et lineage.

Les valeurs restent synthetiques ou aliasees. Les connecteurs de production, calculs financiers certifies, RBAC reel, stockage gere, orchestration, UAT et validation partenaire ne sont pas declares termines.

## Structure

| Chemin | Contenu |
|---|---|
| `src/app/` | application web modulaire |
| `src/pipeline/` | generation deterministe, DQ, privacy et Serving local |
| `data/contracts/` | schemas et catalogue KPI canoniques |
| `config/` | exemples sans secrets ni donnees reelles |
| `docs/` | architecture, politiques, ADR, backlog et decisions |
| `tests/fixtures/` | donnees de test exclusivement synthetiques |
| `tests/web/` | smoke test Playwright |
| `assets/` | captures locales regenerees, ignorees par Git |
| `reports/` | rapports, audits et presentations selon leur type |
| `legacy/wireframes/` | redirection de compatibilite vers l'application actuelle |

## Generer les donnees de demonstration

```powershell
py -3.12 "Sprint 2/src/pipeline/run_pipeline.py"
```

Les sorties sont ecrites dans `Sprint 2/src/pipeline/output/` et restent ignorees par Git :

- `manifest.json` ;
- `quality_report.json` ;
- `run_log.json` ;
- `serving_data.json` ;
- `output_checksums.json` ;
- `privacy_report.json`.

## Lancer le dashboard

```powershell
py -3.12 -m http.server 4173 --directory "Sprint 2"
```

Ouvrir `http://127.0.0.1:4173/src/app/`. Le fichier `legacy/wireframes/wireframes_sprint2.html` redirige vers cette URL. Le prototype n'effectue aucun appel externe.

## Tester et verifier

Depuis la racine du depot :

```powershell
npm run build
npm run lint
npm run test:python
npm run test:web
py -3.12 "Sprint 2/src/pipeline/run_pipeline.py" --verify
py -3.12 "Sprint 2/src/pipeline/run_pipeline.py" --check-shareable "Sprint 2/src/pipeline/output"
```

Le smoke test couvre les neuf sections, les dix scenarios, le drill-down allocation, le workflow Analyst, la navigation clavier, le bureau et le mobile.

## Donnees locales et confidentialite

Les fichiers reels sont fournis hors Git selon [`docs/local_data_setup.md`](docs/local_data_setup.md). La matrice [`docs/source_matrix.md`](docs/source_matrix.md) reconcilie les domaines sans exposer les entrees. Les identifiants prives sont exclus de toute sortie partageable selon [`docs/anonymization_policy.md`](docs/anonymization_policy.md).

Le remote GitHub est public. Aucun rapport interne, document source, archive, CNPJ, ISIN prive ou donnee YvY ne doit etre ajoute ou pousse. Voir [`docs/security_incident_response.md`](docs/security_incident_response.md).
