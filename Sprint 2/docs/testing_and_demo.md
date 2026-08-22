# Verification et demonstration

## Matrice de verification

| Domaine | Commande / preuve | Attendu |
|---|---|---|
| JSON et schemas | suite `test_contracts.py` | contrats lisibles, 14 fonds, 24 KPI, 3 lineage |
| Parsing | suite `test_pipeline.py` | 38/51 colonnes, decimal BR, section vide |
| Reproductibilite | `run_pipeline.py --verify` | `idempotent: true` |
| Confidentialite | suite `test_privacy.py` | zero marqueur prive dans sorties |
| KPI | suite `test_kpis.py` | K01-K16 et H01-H08 complets |
| Documentation | suite `test_documentation.py` | 7/14, D1-D8 pending, backlog complet |
| UX bureau/mobile | `npm run test:web` | navigation, drill-down, workflow, etats, clavier, console |

## Verification manuelle accessible

1. Utiliser uniquement `Tab`, `Shift+Tab`, `Enter` et `Space` pour atteindre chaque action.
2. Dans la sidebar, utiliser `ArrowUp`, `ArrowDown`, `Home` et `End`.
3. Ouvrir une anomalie puis fermer avec `Escape`.
4. Activer la preference systeme de reduction des animations et verifier l'absence de mouvement long.
5. Zoomer a 200 % et verifier la lecture et le defilement horizontal des tableaux.
6. Passer a 390 px et verifier le tiroir de navigation et l'absence de debordement global.

## Donnees de demonstration

Toutes les captures et sorties de test doivent conserver `classification: synthetic-example`. Ne jamais capturer une execution `local-sensitive`. Les artefacts visuels locaux sont ignores par Git.
