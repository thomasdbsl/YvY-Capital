# Note de synthèse à l'attention de YvY Capital — Livraison du Sprint 2

**Projet :** Pipeline de gouvernance des données et DataApp — partenariat Inteli × YvY Capital
**Période :** Sprint 2 (semaines 3-4) · **Date :** 20 août 2026
**Équipe :** Thomas Duberseuil (coordination), Viktor Suzyumov (UX/UI), Adrien Cognet (data engineering), Isiah Perelman (analytics), Raphael Lefevere (application)

---

## Pourquoi ce sprint

Le Sprint 1 avait prouvé la faisabilité : vos exports PortfolioView peuvent être transformés programmatiquement en tables propres et traçables. Le Sprint 2 avait un objectif différent — convertir ce cadrage en une **direction produit concrète et validable**, avant d'écrire la moindre ligne de l'application définitive. Conformément à la roadmap, aucun développement ne démarre sans votre approbation formelle : c'est l'objet du gate de décision de fin de sprint.

## Ce que nous vous livrons

Le paquet remis comprend cinq éléments, tous construits à partir de vos données réelles du 29 mai 2026.

**1. Une maquette cliquable de la future application.** Ce n'est pas un logiciel : c'est un prototype navigable, autonome, qui montre exactement ce que chaque profil verra. Six vues y sont présentées : une vue exécutive pour la direction (encours, alertes, structure du groupe), une vue fonds pour les gérants (composition, positions, provisions, avec navigation du fonds jusqu'au contrat individuel), une comparaison entre vos fonds, une vue qualité pour le Back Office, la préfiguration de l'écran de comparaison aux pairs, et le comportement de l'application dans les cas dégradés (chargement, erreur, accès restreint). Chaque chiffre affiché est réel, extrait de vos exports, et indique au survol sa provenance exacte — fichier, section, ligne. C'est notre réponse à la question « comment savez-vous que ce chiffre est juste ? ».

**2. Un catalogue des indicateurs.** Chaque KPI y est défini avec sa formule, ses colonnes sources et ses limites. Nous distinguons strictement ce qui est calculable dès aujourd'hui avec un instantané (patrimoine, valeur de part, allocation, concentrations, provisions, rapprochements) de ce qui exige un historique quotidien que nous n'avons pas encore (performance, volatilité, Sharpe, drawdown). Aucun indicateur de la seconde famille ne sera affiché avec une valeur simulée.

**3. Un audit complet de vos données.** Il documente, preuves à l'appui, les points qui conditionnent la fiabilité du produit : structures de fichiers variables, formats à convertir, prix obsolète sur un actif non coté, sections vides, univers de pairs à nettoyer avant usage, et un point de vigilance de confidentialité — les noms réels de fonds apparaissent à l'intérieur des colonnes de positions, ce qui impose un masquage au niveau des valeurs et non des seuls noms de fichiers. Ce masquage est déjà appliqué dans tout ce que nous livrons.

**4. L'architecture technique et le backlog priorisé.** Le pipeline suit quatre couches (données brutes immuables, données nettoyées, données métier, restitution), avec trois garanties : un même fichier rejoué ne crée jamais de doublon, chaque chiffre reste traçable jusqu'à sa source, et la couche métier reste indépendante de l'outil de visualisation final. Le backlog traduit cela en user stories prêtes à développer, avec critères d'acceptation, réparties sur les Sprints 3 à 5.

**5. Le document du gate de décision.** Il rassemble les huit décisions que nous vous demandons.

## Le constat le plus important

En rapprochant les positions de vos sept fonds, nous avons identifié que plusieurs d'entre eux détiennent des parts d'autres fonds internes. La conséquence est directe : additionner les sept patrimoines donne environ 1,08 milliard de BRL, alors que l'encours économique réel serait de l'ordre de 556 millions — une somme naïve surévaluerait donc l'encours d'un facteur proche de deux. Nous avons conçu l'application pour porter en permanence deux lectures : une vue juridique (somme brute) et une vue transparisée (après élimination des participations croisées). Cette structure de détention est pour l'instant une **hypothèse déduite des données**, et elle est étiquetée comme telle partout : seule votre confirmation du registre des fonds la transformera en chiffre certifiable.

## Ce que nous attendons de vous

Pour tenir le calendrier, nous avons besoin d'une réponse consolidée sur les décisions du gate, dont trois sont déterminantes : la validation du jeu d'écrans et des indicateurs proposés ; la confirmation (ou l'infirmation) des relations entre fonds internes ; et surtout **l'accès à l'historique quotidien des valeurs de part** — sans lui, les analyses de performance et de risque prévues au Sprint 4 ne peuvent pas être produites. Les questions ouvertes secondaires (signification du drapeau « Cota Congelada », unité du champ Duration, canal de dépôt des exports) sont listées dans les documents joints avec leur décisionnaire proposé.

## La suite

Dès la baseline approuvée, le Sprint 3 (semaines 5-6) construira le pipeline automatisé version 1 et la première application fonctionnelle sur vos données ; le Sprint 4 ajoutera l'analytique de risque et la comparaison aux pairs ; le Sprint 5 stabilisera et transférera l'ensemble avec sa documentation. À chaque fin de sprint, vous verrez une démonstration et déciderez de la suite.

Nous restons à votre disposition pour une présentation de la maquette en séance.

*L'équipe projet Inteli*
