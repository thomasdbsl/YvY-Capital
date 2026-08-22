# ADR-001 - Prototype web modulaire sans framework

- **Statut :** Proposed - Pending partner validation
- **Contexte :** aucun framework applicatif n'est present et la maquette doit rester legere, locale et facile a auditer.
- **Decision proposee :** HTML semantique, CSS par couches et modules JavaScript ES natifs, servis par un serveur HTTP local.
- **Consequences :** aucune dependance runtime ; composants testables ; lancement par double-clic remplace par une commande locale pour garantir le chargement des modules.
- **Alternative ecartee pour ce sprint :** ajout d'un framework et d'une chaine de build sans besoin fonctionnel demontre.
