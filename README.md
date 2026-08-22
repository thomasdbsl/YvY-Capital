# Funds Manager

Funds Manager est un projet de gouvernance de donnees et d'aide a la decision pour le suivi de fonds. Le produit cible combine un pipeline traçable, des controles de qualite et une interface de consultation. Le Sprint 2 fournit une preuve reproductible et un prototype fonctionnel ; il ne pretend pas remplacer l'industrialisation des Sprints 3 a 5.

## Alerte de confidentialite

Le depot GitHub historique est encore public au 22 aout 2026. **Ne poussez aucun commit vers ce remote** avant son passage en prive, la qualification de l'incident et la validation de l'espace GitLab autorise. Les sources brutes et documents restreints ont ete retires de l'index local sans supprimer les copies de travail.

Voir [`Sprint 2/docs/security_incident_response.md`](Sprint%202/docs/security_incident_response.md).

## Livrables Sprint 2

- application statique modulaire, responsive et accessible ;
- parcours Direction et Analyste ;
- dix etats de demonstration ;
- matrice unifiee des sources : snapshot detaille de 7 fonds et historique structure de 14 fonds ;
- catalogue canonique K01-K16 et H01-H08 ;
- architecture, ADR, contrats Silver/Gold/Serving et droits proposes ;
- backlog Sprint 3 estime et testable ;
- run deterministe `SPRINT2-WF-001` avec manifests, DQ, quarantaine et lineage ;
- fixtures synthetiques et tests Python/navigateur ;
- decision log D1-D8, tous en `Pending partner validation`.

## Demarrage rapide

Prerequis : Python 3.12 et, pour les tests navigateur, Node.js 20+.

```powershell
py -3.12 "Sprint 2\pipeline\run_pipeline.py"
py -3.12 -m http.server 4173 --directory "Sprint 2"
```

Ouvrir ensuite `http://127.0.0.1:4173/app/`. Le prototype ne fait aucun appel externe. Si le payload genere est absent, il utilise un fallback synthetique local.

## Tests

```powershell
py -3.12 -m unittest discover -s "Sprint 2\tests" -p "test_*.py" -v
py -3.12 "Sprint 2\pipeline\run_pipeline.py" --verify
```

Pour les tests navigateur :

```powershell
npm install
npx playwright install chromium
npm run test:web
```

La documentation complete d'installation, de demonstration et de verification se trouve dans [`Sprint 2/README.md`](Sprint%202/README.md).

## Structure partageable

| Chemin | Role |
|---|---|
| `Sprint 2/app/` | prototype web et design system |
| `Sprint 2/pipeline/` | run reproductible et controles |
| `Sprint 2/tests/fixtures/` | cas synthetiques uniquement |
| `Sprint 2/tests/` | tests Python et navigateur |
| `Sprint 2/contracts/` | schemas et catalogue KPI |
| `Sprint 2/docs/` | architecture, gouvernance, backlog et gate |

Les dossiers locaux de donnees, documents sources, archives et bundles sont ignores par Git.
