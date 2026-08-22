# Reponse a l'incident de confidentialite

**Statut :** containment local realise ; containment distant `Pending repository owner action`<br>
**Portee :** procedure de travail, sans donnee ni identifiant reel

## Categories concernees

- exports bruts de portefeuille et archives associees ;
- historiques structures et tables financieres ;
- classeurs de comparaison susceptibles de contenir des identifiants ;
- documents contractuels, plans, guides, videos et livrables sources ;
- bundles Git pouvant reproduire des objets retires.

## Mesures de containment locales

- ajout de regles d'exclusion explicites dans `.gitignore` ;
- retrait des categories sensibles de l'index avec conservation des copies locales ;
- remplacement par un manifeste logique, une configuration d'exemple et des fixtures synthetiques ;
- ajout d'un scan denylist et identifiants prives au pipeline ;
- interdiction de publication distante integree aux consignes d'exploitation.

## Operations encore necessaires

1. Rendre le depot distant prive et verifier l'absence d'acces anonyme.
2. Informer le sponsor, l'encadrement et le responsable du depot selon la procedure institutionnelle.
3. Confirmer les categories exposees et la periode d'exposition sans copier leur contenu dans le ticket.
4. Decider formellement si une purge d'historique et une rotation d'identifiants sont requises.
5. Migrer le code nettoye vers l'espace GitLab autorise, avec droits minimaux et branche protegee.
6. Revoquer ou archiver l'ancien depot seulement apres validation humaine et verification de la migration.

## Procedure de purge proposee, non executee

La purge est destructive pour l'historique. Elle exige une autorisation explicite separee, une fenetre de maintenance et la coordination de tous les clones.

1. Creer une sauvegarde miroir chiffree, hors ligne et a acces restreint : `git clone --mirror <remote-autorise> backup-before-purge.git`.
2. Inventorier les chemins et objets concernes avec `git rev-list --objects --all` sans publier la sortie.
3. Tester `git filter-repo --invert-paths` dans un clone jetable en ciblant uniquement les chemins approuves.
4. Verifier l'historique nettoye, les tags, les bundles et les artefacts de CI.
5. Faire approuver le rapport de verification.
6. Effectuer le remplacement distant uniquement dans l'espace autorise et pendant la fenetre approuvee.
7. Demander aux contributeurs de recloner ; invalider les anciens clones et caches.

Aucune de ces commandes de reecriture ou de force-push n'a ete executee dans cette remediation.

## Validations humaines requises

| Validation | Statut |
|---|---|
| Changement de visibilite du depot actuel | Pending repository owner action |
| Qualification institutionnelle de l'incident | Pending partner validation |
| Autorisation de purge d'historique | Pending partner validation |
| Espace GitLab cible et matrice d'acces | Pending partner validation |
| Cloture de l'incident | Pending partner validation |
