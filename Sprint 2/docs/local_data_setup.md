# Apport local des donnees

## Principe

Les donnees brutes, documents contractuels, exports de portefeuille, historiques structures et referentiels de pairs ne sont pas versionnes. Le depot partageable ne contient que des fixtures synthetiques composees d'alias comme `FUND_01`, `EMET_01` et `CUSTO_01`.

## Emplacement local

1. Creer un dossier `local_data/` a la racine, ou utiliser un dossier securise externe au depot.
2. Definir `FUNDS_MANAGER_LOCAL_INPUT_DIR` vers ce dossier.
3. Ne jamais copier les entrees reelles dans `Sprint 2/tests/fixtures` ou dans un dossier de sortie partageable.
4. Executer d'abord le scan de confidentialite en mode local.
5. Conserver les manifests d'execution et journaux contenant des empreintes dans un espace restreint.

```powershell
$env:FUNDS_MANAGER_LOCAL_INPUT_DIR = "C:\chemin\securise\entrees"
python "Sprint 2\src\pipeline\run_pipeline.py" --input "$env:FUNDS_MANAGER_LOCAL_INPUT_DIR" --output "Sprint 2\src\pipeline\output" --mode local-sensitive
```

Le mode `local-sensitive` refuse toute publication et n'ecrit jamais les lignes source dans les logs. Le mode de demonstration par defaut utilise uniquement les fixtures synthetiques versionnees.

## Controle avant partage

```powershell
python -m unittest discover -s "Sprint 2\tests" -p "test_*.py"
python "Sprint 2\src\pipeline\run_pipeline.py" --check-shareable "Sprint 2\src\pipeline\output"
```

Une sortie n'est partageable que si le rapport indique `publication_allowed: true`, `denylist_hits: 0` et `private_identifier_hits: 0`.
