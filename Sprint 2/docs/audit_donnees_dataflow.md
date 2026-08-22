# Audit des donnees et data-flow reconcilie

**Run de preuve :** `SPRINT2-WF-001`<br>
**Statut :** reproductible sur fixtures synthetiques ; sources reelles locales non publiees

## Domaines observes

L'inventaire distingue clairement deux domaines : sept exports semi-structures pour un snapshot detaille et des tables historiques structurees couvrant quatorze fonds sur plusieurs dates. Le manque d'historique dans les sept exports n'implique donc pas l'absence d'historique dans le projet. La matrice complete se trouve dans [`source_matrix.md`](source_matrix.md).

## Cas de qualite couverts

- exports synthetiques de 38 et 51 colonnes ;
- section vide distincte d'une section absente ;
- decimal bresilien ;
- duration invalide preservee en texte et quarantinee ;
- prix obsolete ;
- fonds feeder et relation master/feeder incertaine ;
- doublon d'identifiant de pair entierement synthetique ;
- valeur NAV nulle ou negative et drawdown hors domaine ;
- nom interdit de test et identifiant prive de test ;
- historique partiel ;
- trois preuves de lineage ecran vers fixture.

## Regles DQ

| ID | Controle | Severite | Traitement |
|---|---|---|---|
| DQ01 | unicite fonds/date/enregistrement | blocking | quarantaine |
| DQ05 | decimal bresilien convertible sans perte | blocking | champ rejete |
| DQ06 | largeur conforme a 38 ou 51 colonnes | blocking | fichier en quarantaine |
| DQ07 | NAV strictement positive | blocking | ligne en quarantaine |
| DQ15 | age de prix sous seuil configure | warning | signalement |
| DQ20 | denylist vide dans sortie | blocking | publication interdite |
| DQ21 | identifiant prive absent de la sortie | blocking | publication interdite |
| DQ22 | identifiant pair unique dans un univers/version | warning | doublon en quarantaine |
| DQ23 | section vide/absente distinguee | info | journalisation |
| DQ24 | drawdown dans [-1, 0] | blocking | valeur en quarantaine |

## Politique ISIN et identifiants

Les identifiants prives sont exclus de toute sortie partageable. Un token irreversible peut exister uniquement dans une zone locale restreinte si un rapprochement est indispensable. La politique complete est dans [`anonymization_policy.md`](anonymization_policy.md).

## Data-flow

Les contrats de chaque couche sont documentes dans [`architecture.md`](architecture.md). Le pipeline de preuve produit manifest, rapport DQ, quarantaine, dataset Serving synthetique et empreintes deterministes. Une execution sur source reelle reste locale et ne publie jamais automatiquement.
