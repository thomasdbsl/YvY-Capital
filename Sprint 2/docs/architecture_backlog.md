# Architecture et backlog - index de revue

Le document monolithique initial est remplace par des artefacts testables :

- [`architecture.md`](architecture.md) : couches, invariants, composants et droits proposes ;
- [`adr/`](adr/) : decisions techniques avec statut `Proposed - Pending partner validation` ;
- [`../contracts/`](../contracts/) : schemas Silver, Gold, Serving et catalogue KPI ;
- [`backlog_sprint3.md`](backlog_sprint3.md) : stories ordonnees, estimees et testables ;
- [`decision_log_W4.md`](decision_log_W4.md) : decisions D1-D8 sans approbation inventee.

## Perimetre

Le Sprint 2 livre une preuve reproductible et une maquette fonctionnelle. Le Sprint 3 porte l'industrialisation du pipeline et du MVP. Les fonctions de risque avance, pairs certifies, RBAC reel, orchestration de production et UAT restent des dependances ou interfaces pour les sprints suivants.

## Definition of Done transverse

Une story n'est terminee que si la commande d'acceptation reussit, les fixtures restent synthetiques, le scan de confidentialite est vert, le lineage est verifie, la documentation est a jour et la revue croisee indiquee dans le backlog a eu lieu.
