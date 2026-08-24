# Funds Manager

Funds Manager est un projet de gouvernance de donnees et d'aide a la decision pour le suivi de fonds. Le Sprint 2 fournit un pipeline reproductible sur fixtures synthetiques, des contrats de donnees et un dashboard interactif. Il ne s'agit pas d'une application de production.

## Securite du depot

Le remote `origin` pointe vers `thomasdbsl/YvY-Capital`. Sa visibilite GitHub a ete confirmee comme **publique le 23 aout 2026**. Aucun push ne doit etre effectue tant que le depot n'est pas prive ou explicitement autorise pour ces contenus.

Les elements suivants restent strictement locaux et ignores par Git :

- donnees brutes YvY et exports de portefeuille ;
- CNPJ, ISIN prives et identifiants internes ;
- `data_YvY.zip` et autres archives de donnees ;
- documents contractuels ou internes dans `docs/` ;
- rapports, presentations et captures binaires non autorises ;
- sorties de pipeline, caches et artefacts de test.

Voir [`Sprint 2/docs/security_incident_response.md`](Sprint%202/docs/security_incident_response.md) pour le contexte de containment.

## Arborescence

| Chemin | Role |
|---|---|
| `Sprint 2/src/app/` | dashboard web statique et design system |
| `Sprint 2/src/pipeline/` | pipeline de preuve, qualite et confidentialite |
| `Sprint 2/data/contracts/` | schemas Silver, Gold, Serving et catalogue KPI |
| `Sprint 2/config/` | configurations et manifestes d'exemple |
| `Sprint 2/docs/` | architecture, ADR, gouvernance et backlog |
| `Sprint 2/tests/` | tests Python, navigateur et fixtures synthetiques |
| `Sprint 2/assets/` | captures et artefacts locaux ignores |
| `Sprint 2/reports/` | rapports, audits et presentations |
| `Sprint 2/legacy/` | points d'entree historiques conserves pour compatibilite |

## Demarrage rapide

Prerequis : Python 3.12, Node.js 20+ et les dependances npm installees.

```powershell
npm install
npm run build
npm start
```

Ouvrir ensuite `http://127.0.0.1:4173/src/app/`.

## Verification

```powershell
npm run lint
npm test
py -3.12 "Sprint 2/src/pipeline/run_pipeline.py" --verify
py -3.12 "Sprint 2/src/pipeline/run_pipeline.py" --check-shareable "Sprint 2/src/pipeline/output"
```

La documentation complete du prototype se trouve dans [`Sprint 2/README.md`](Sprint%202/README.md).
