# Sprint 2 - prototype, contrats et run de preuve

**Statut :** Draft pret pour revue technique<br>
**Decision produit :** `Pending partner validation`<br>
**Classification du contenu versionne :** synthetique et partageable apres containment du depot

## Ce qui est livre

Le prototype couvre Overview, Funds, Fund Detail avec allocation et positions, Performance & Risk, Internal Comparison, Peer Comparison, Data Quality, Import & Validation et Run History & Lineage. Les six vues historiques sont preservees et etendues par une navigation plus simple.

Le parcours Direction permet de filtrer un fonds et une periode, consulter les KPI, descendre de l'allocation aux positions, comparer les fonds et voir source, fraicheur, qualite et lineage. Le parcours Analyste execute une simulation complete : source, structure, anomalies, detail, quarantaine, validation, publication locale et journal de run.

## Installation

Le pipeline Python n'a aucune dependance externe.

```powershell
py -3.12 --version
py -3.12 "Sprint 2\pipeline\run_pipeline.py"
```

La commande genere dans `Sprint 2/pipeline/output/` :

- `manifest.json` ;
- `quality_report.json` ;
- `run_log.json` ;
- `serving_data.json` ;
- `output_checksums.json` ;
- `privacy_report.json`.

Ces sorties sont ignorees par Git et peuvent etre regenerees.

## Lancer la maquette

Depuis la racine :

```powershell
py -3.12 -m http.server 4173 --directory "Sprint 2"
```

Ouvrir `http://127.0.0.1:4173/app/`. L'ancien chemin `wireframes/wireframes_sprint2.html` redirige vers cette application. Un serveur HTTP local est requis pour les modules JavaScript ; aucune connexion Internet n'est utilisee.

## Tester

Suite Python :

```powershell
py -3.12 -m unittest discover -s "Sprint 2\tests" -p "test_*.py" -v
py -3.12 "Sprint 2\pipeline\run_pipeline.py" --verify
py -3.12 "Sprint 2\pipeline\run_pipeline.py" --check-shareable "Sprint 2\pipeline\output"
```

Suite navigateur :

```powershell
npm install
npx playwright install chromium
npm run test:web
```

Le smoke test couvre les neuf sections, les dix scenarios, le drill-down allocation, le workflow Analyste, la modale et `Escape`, la navigation aux fleches, l'absence de `onclick`, la console, le bureau et le mobile.

## Demonstration en 7 minutes

1. Ouvrir Vue generale et commenter la double couverture 7 snapshot / 14 historique.
2. Ouvrir Fonds, puis `FUND_01` et filtrer l'allocation `Credit prive`.
3. Ouvrir Performance et montrer les prerequis H01-H08.
4. Ouvrir Comparaison puis Pairs et rappeler le statut d'exemple.
5. Choisir le parcours Analyste et avancer jusqu'a la publication locale.
6. Ouvrir Runs & lineage et montrer les trois preuves.
7. Changer le Scenario prototype pour demontrer chargement, retard, incomplet, vide, erreur, acces refuse, aucun resultat et hypothese.

## Sources et confidentialite

La matrice [`docs/source_matrix.md`](docs/source_matrix.md) reconcilie les domaines. Les fichiers reels sont fournis localement selon [`docs/local_data_setup.md`](docs/local_data_setup.md). Les identifiants prives sont exclus de toute sortie partageable selon [`docs/anonymization_policy.md`](docs/anonymization_policy.md).

Le remote GitHub public ne doit recevoir aucun push. Les actions de containment et la procedure de purge non executee sont dans [`docs/security_incident_response.md`](docs/security_incident_response.md).

## Decisions et limites

Le journal [`docs/decision_log_W4.md`](docs/decision_log_W4.md) laisse D1-D8 en attente. Les analytics avances, pairs certifies, RBAC reel, orchestration de production, stockage gere et UAT ne sont pas declares termines ; seuls leurs contrats ou interfaces sont prepares.
