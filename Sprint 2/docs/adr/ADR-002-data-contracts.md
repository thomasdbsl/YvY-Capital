# ADR-002 - Contrats versionnes entre Silver, Gold et Serving

- **Statut :** Proposed - Pending partner validation
- **Contexte :** le frontend ne doit pas dependre du format des exports ni d'un outil BI.
- **Decision proposee :** JSON Schema pour Silver/Gold, contrat Serving JSON et identifiants de lineage obligatoires.
- **Consequences :** changements de schema visibles, tests de contrat possibles et remplacement du Serving sans reecrire le pipeline.
- **Alternative :** couplage direct aux CSV, refuse car non type et non traçable.
