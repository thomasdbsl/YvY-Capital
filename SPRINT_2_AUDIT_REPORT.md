# Audit du Sprint 2 - Funds Manager

**Projet :** Inteli x YvY Capital - Data Governance Pipeline and Analytics  
**Date de l'audit :** 22 août 2026  
**Branche analysée :** `main`  
**Commit analysé :** `f2a9930e73ebba17f04c757b9a763aadb040c7cf` (`Add Sprint 2 folder`)  
**Nature de l'audit :** lecture seule du dépôt et de ses sources, à l'exception de la création du présent rapport  
**Niveau de confiance global :** élevé sur l'état du dépôt et les écarts documentaires ; moyen sur les calculs métier non reproductibles depuis un script versionné ; faible sur les décisions du partenaire, faute de procès-verbal ou de décision log.

## 1. Résumé exécutif

Le Sprint 2 est **partiellement conforme** à la roadmap. Le dépôt contient bien un paquet cohérent de définition produit : une maquette HTML autonome, un catalogue de KPI, un audit des données avec data-flow, une proposition d'architecture, un backlog et un document de gate W4. La maquette s'exécute réellement : six vues sont chargées, la navigation fonctionne, le drill-down d'allocation filtre les positions et aucune erreur JavaScript n'a été observée lors du test headless Microsoft Edge.

Les travaux les plus solides sont la matérialisation des risques de qualité des sept exports PortfolioView, la séparation Raw/Bronze - Silver - Gold - Serving, le marquage explicite des hypothèses master/feeder et la traduction des besoins en critères d'acceptation. Plusieurs chiffres du classeur de pairs et des jeux structurés ont été recoupés pendant l'audit.

Le Sprint 2 ne peut toutefois pas être déclaré terminé. Le gate W4 est encore une **demande de décisions**, pas une validation : tous les documents principaux sont en version `0.9` / `Draft`, et aucun decision log, compte rendu signé ou réponse `Approuvé / à modifier / reporté` n'est présent. Le backlog n'atteint pas non plus sa propre définition de « prêt » : il ne porte ni pilote par story, ni estimation, ni jeu de test associé.

L'écart le plus critique est la confidentialité. L'API officielle GitHub confirme que `thomasdbsl/YvY-Capital` est **public** au 22/08/2026 (`private=false`, branche `main` non protégée), alors que le TAPI interdit le nom du projet dans les dépôts, interdit le partage des données/challenges hors du projet et exige l'anonymisation LGPD. Le dépôt public contient les sources brutes et le classeur de pairs que le Sprint 2 identifie lui-même comme porteurs de noms réels de fonds et de CNPJ. Ce point est **P0 bloquant** et précède toute présentation ou poursuite normale du projet.

Une seconde contradiction majeure concerne les données historiques. Les livrables Sprint 2 déclarent l'historique NAV/positions/flux « non livré », mais le dépôt contient `returns_navps.csv` (2 733 points du 01/12/2025 au 11/08/2026), `fund_nav_snapshot.csv` (88 snapshots), `portfolio_holdings.csv` (1 013 lignes) et `drawdown.csv` (1 350 lignes). Le Feature Guide et le Data Dictionary les qualifient d'exploitables, avec des réserves. Il faut donc distinguer explicitement l'historique des **sept exports bruts du 29/05/2026** de l'historique **structuré des quatorze fonds**, au lieu d'affirmer globalement que l'historique est absent.

**Conclusion exécutive :** le paquet constitue une bonne base de revue, mais le Sprint 2 n'est pas conforme en l'état. Il peut servir de prototype de travail dans un environnement autorisé après traitement immédiat de l'incident de confidentialité ; il ne doit pas être présenté comme une baseline approuvée.

## 2. Périmètre et méthode

### État Git et délimitation du Sprint 2

- `HEAD`, `origin/main` et la branche active pointent tous vers `f2a9930`; le worktree était propre au début de l'audit.
- Le commit `f2a9930` du 21/08/2026 ajoute neuf fichiers sous `Sprint 2/` : six Markdown, une maquette HTML, un JSON et un bundle Git.
- Le bundle `Sprint 2/sprint2_commit.bundle` est valide. Il contient le commit `7143305e2832dad8b773442dee401f2fb1b2ceab` du 21/08/2026, basé sur `3825889`, avec les huit livrables Sprint 2 hors bundle. Aucun code applicatif caché n'y a été trouvé.
- La seule branche distante est `main`, non protégée ; aucun tag et aucune issue ouverte ne sont signalés. L'API GitHub indique `visibility=public` et `open_issues_count=0`.
- Les limites calendaires ont été déduites de la roadmap : Sprint 2 = semaines 3-4, avec gate de sortie W4. L'historique Git ne contient pas une série de commits de travail pendant ces semaines : le contenu apparaît en un commit de paquet. L'audit porte donc sur l'état livré, non sur la vélocité ou la progression quotidienne.

### Documents consultés

- `docs/2026_TAPI_YvY_Capital_Inteli_ENGLISH.docx` : sections `PROJECT OUTLINE`, `MACRO SCOPE`, `MVP`, `OTHER DELIVERABLES`, `PROJECT RESTRICTIONS` et `RESTRICTED CONTENT`.
- `docs/Special Projects -4o year.docx` : sections 2, 4 et 5 (cinq sprints, livraison/pré-sentation à chaque sprint, GitLab comme source de vérité).
- `docs/Sprint_1_Delivery_Roadmap_Inteli_YvY_Capital.pdf` : pages 2-5 et 9-11, notamment la définition du Sprint 2 et le gate W4.
- `docs/Plan_interne_YvY_Capital_Sprints1_5.pdf` : pages 10-14 et 18-21, notamment les critères des wireframes, le Sprint 2 et la stratégie de test.
- `docs/FEATURE_GUIDE.pdf` : pages 3-7.
- `docs/DATA_DICTIONARY.pdf` : pages 3-11.
- `docs/Outils_similaires_DataApp_YvY_Capital.pdf` : pages 2-6, utilisé comme inspiration et non comme exigence officielle.
- `data_YvY.zip`, les CSV de `data_YvY/`, les sept exports PortfolioView et le classeur de pairs.
- `docs/Demonstration outils actuels.mp4` a été localisé (46 996 165 octets), mais n'a pas pu être inspecté indépendamment faute d'outil vidéo disponible. L'analyse horodatée déjà présente dans le plan interne, page 7, a été considérée comme une preuve documentaire secondaire, pas comme une vérification vidéo indépendante.

Les deux DOCX ont été extraits intégralement. Leur rendu paginé a échoué car LibreOffice n'est pas installé ; les références à ces documents utilisent donc les titres de sections plutôt que des numéros de page. Tous les PDF ont été extraits page par page.

### Vérifications exécutées

| Vérification | Résultat |
|---|---|
| `git status --short --branch`, révisions `HEAD` / `origin/main` | Propre et synchronisé avant création du rapport |
| `git log`, diff `3825889..f2a9930`, branches, tags | Périmètre Sprint 2 isolé ; une branche `main`, aucun tag |
| `git bundle verify` et inspection du commit bundle | Bundle valide ; huit livrables, aucun code supplémentaire |
| `git diff --check 3825889..f2a9930` | Aucun défaut d'espaces signalé |
| `git fsck --full --no-reflogs` | Objets atteignables valides ; cinq arbres pendants non bloquants |
| API GitHub officielle | Dépôt public, branche `main` non protégée, zéro issue ouverte |
| Parsing `mockup_data.json` | JSON valide ; 7 fonds, 4 liens du bridge, `run_id=SPRINT2-WF-001` |
| Test headless Edge à 1440 px | 6 vues, navigation OK, drill-down 39 -> 3 positions, 12 anomalies, 6 états, zéro erreur console |
| Test headless Edge à 390 px | Pas de débordement horizontal global ; vue fonds chargeable |
| Audit clavier/DOM | 11 cibles `onclick` non sémantiques, 0 rendue focalisable |
| Recherche d'appels réseau dans le HTML | Aucun `fetch`, XHR ou URL externe ; maquette autonome |
| Profilage CSV | Comptages, dates, domaines et anomalies recoupés |
| Lecture du classeur de pairs | 5 feuilles ; volumes conformes ; anomalies FIP confirmées |
| Test de `data_YvY.zip` | Archive lisible, 35 entrées, aucune entrée corrompue |
| Scan textuel de secrets | Aucun secret évident ; un faux positif documentaire sur « coffre de secrets » |
| Build / lint / type-check / tests projet | Non applicables : aucun manifeste, dépendance, code source ou configuration de test dans le dépôt |

## 3. Attendus du Sprint 2

### Exigences officielles et séquencement

Le TAPI demande au produit final un pipeline ETL gouverné et une DataApp couvrant NAV/portefeuille, performance et risque-rendement, comparaison aux pairs, comparaison interne et réconciliation automatisée. Il exige aussi une structure de gouvernance, un data-flow et des manuels d'usage/maintenance. Ces exigences sont obligatoires pour le projet final, mais ne sont pas toutes attendues au Sprint 2.

La roadmap communiquée à YvY place au Sprint 2, pages 2 et 5 :

- un paquet de wireframes cliquables et un inventaire d'écrans ;
- un catalogue de KPI avec définitions, formules, colonnes sources et hypothèses ;
- un audit des données et un data-flow draft ;
- une architecture et un backlog priorisé avec critères d'acceptation ;
- un gate partenaire approuvant utilisateurs, écrans, navigation, KPI, univers de fonds, périmètre MVP et traitement des pairs.

Le plan interne, pages 11, 12 et 14, ajoute des critères plus précis : deux parcours Direction et Analyste, états dégradés, navigation clavier, source/fraîcheur/statut sur chaque KPI, mini design system, revue de faisabilité, et stories Sprint 3 avec pilote, estimation, jeu de test et Definition of Done.

### Contradictions entre sources

1. **GitLab / GitHub.** Le guide Inteli impose GitLab comme source de vérité. Le TAPI interdit que la présentation soit partagée sur GitHub, même privé, et interdit le nom du projet dans les dépôts. Le plan interne retient GitLab privé. Le livrable se trouve pourtant dans un GitHub public. La hiérarchie des sources impose de considérer cette situation non conforme.
2. **Sept ou quatorze fonds.** Le TAPI cite sept fonds ; les données structurées en contiennent quatorze ; le paquet Sprint 2 retient sept exports. Le plan interne demandait une architecture quatorze fonds avec sous-périmètre configurable. Aucune décision partenaire n'arbitre ce point.
3. **Historique absent ou disponible.** Les fichiers Sprint 2 déclarent l'historique absent, tandis que le Feature Guide, le Data Dictionary et les CSV structurés fournissent des séries historiques. L'historique absolu NAV/positions est échantillonné et certaines séries sont invalides, mais l'absence globale est factuellement incorrecte.
4. **Pairs absent ou livré.** Le Feature Guide page 6 décrit les pairs comme non livrés ; le classeur de pairs est présent. Le Sprint 2 l'utilise correctement comme échantillon non certifié, mais doit documenter cet arbitrage plus clairement.
5. **ISIN privés.** `Sprint 2/docs/audit_donnees_dataflow.md:60` indique « ISIN conservé » dans les sorties partageables, alors que `Sprint 2/README.md:25` et `Sprint 2/wireframes/wireframes_sprint2.html:301` disent qu'ils sont masqués. La règle la plus restrictive est appliquée dans la maquette, mais la documentation est contradictoire.

## 4. Matrice de conformité

| ID | Exigence | Source et référence | Preuve dans le dépôt | Statut | Écart constaté | Action recommandée | Priorité | Effort estimé |
|---|---|---|---|---|---|---|---|---|
| S2-01 | Paquet Sprint 2 identifiable et traçable | Roadmap p. 5 | Commit `f2a9930`; `Sprint 2/README.md:8-17` | Conforme | Livrables regroupés et historique isolable | Conserver un manifeste de livraison versionné | P2 - Amélioration souhaitable | Très faible |
| S2-02 | Wireframes cliquables et inventaire d'écrans | Roadmap p. 5 ; plan p. 11-12 | `wireframes_sprint2.html:115-122,153-158`; test Edge réussi | Partiellement conforme | Six vues et drill-down fonctionnent, mais performance n'est pas un parcours fonctionnel et l'Analyste n'a pas de flux import -> contrôle -> validation | Compléter les deux parcours et relier chaque écran à son scénario | P1 - Important avant la présentation | Moyen |
| S2-03 | États d'interaction et accessibilité clavier | Plan p. 11-12 | `wireframes_sprint2.html:408-420`; audit DOM : 11 cibles non sémantiques, 0 focalisable | Partiellement conforme | États visibles mais surtout statiques ; « à jour » et « retard » non matérialisés comme écrans ; tuiles et donut non utilisables au clavier | Utiliser boutons/liens ou `tabindex` + gestion clavier/focus visible ; ajouter les états manquants | P1 - Important avant la présentation | Moyen |
| S2-04 | Catalogue KPI : formule, grain, source, unité, garde-fou | Roadmap p. 5 ; plan p. 14 | `catalogue_kpi.md:19-49,53-64` | Partiellement conforme | Bonne couverture, mais grain/unité non explicites pour chaque ligne, pas de jeu de référence ; statut de l'historique erroné | Ajouter colonnes grain, unité, statut de donnée et cas test ; réconcilier avec les CSV structurés | P1 - Important avant la présentation | Moyen |
| S2-05 | Audit complet des données disponibles | Roadmap p. 5 | `audit_donnees_dataflow.md:10-129` | Partiellement conforme | Audit détaillé des 7 exports et pairs, mais exploitation insuffisante des 14 fonds et séries structurées déjà présentes | Produire un inventaire unifié source -> période -> fonds -> qualité -> usage | P1 - Important avant la présentation | Moyen |
| S2-06 | Data-flow avec couches et responsabilités | TAPI `OTHER DELIVERABLES`; roadmap p. 3/5 | `audit_donnees_dataflow.md:65-103` | Conforme | Draft cohérent et responsabilités explicites ; pas encore implémenté, ce qui est normal au Sprint 2 | Ajouter les contrats de tables et propriétaires au passage Sprint 3 | P2 - Amélioration souhaitable | Faible |
| S2-07 | Architecture technique arbitrable | Roadmap p. 5 ; plan p. 14 | `architecture_backlog.md:9-25` | Partiellement conforme | Direction claire, mais pas de diagramme de déploiement, contrat d'interface, choix d'environnement ou ADR ; plusieurs choix restent listés sans décision | Ajouter ADR, schémas de composants et interfaces Raw/Silver/Gold/Serving | P1 - Important avant la présentation | Moyen |
| S2-08 | Backlog Sprint 3 prêt à développer | Plan p. 14 | `architecture_backlog.md:33-74` | Partiellement conforme | Stories et critères solides, mais aucune colonne pilote, estimation ou jeu de test ; « sprint-ready » non démontré | Ajouter owner, estimate, fixture, priorité ordonnée et dépendances externes | P1 - Important avant la présentation | Faible |
| S2-09 | Validation formelle du gate W4 | Roadmap p. 5 ; plan p. 14 | `gate_W4_decisions.md:4-5,19-77`; `README.md:5` indique Draft | Absent | Le fichier liste ce qui est « à approuver » ; aucune réponse, date, décisionnaire signataire ni decision log | Tenir la revue et consigner D1-D8 : accepté/modifié/reporté, date, responsable, impact | P0 - Bloquant | Faible |
| S2-10 | Confidentialité, dépôt autorisé, masquage et LGPD | TAPI `PROJECT RESTRICTIONS`; roadmap p. 3/11 | API GitHub : public ; `architecture_backlog.md:24`; `audit_donnees_dataflow.md:51-63` | Non conforme | Dépôt public contenant des sources identifiées comme sensibles ; nom du projet présent dans le dépôt et son URL | Restreindre immédiatement l'accès, notifier les responsables, assainir l'historique et migrer vers l'espace autorisé | P0 - Bloquant | Élevé |
| S2-11 | Sorties partageables aliasées | Roadmap p. 3 | HTML/JSON utilisent `FUND_01-07`, `EMET_xx`, `CUSTO_xx`; scan indépendant sans noms de dossiers bruts | Conforme | Conformité limitée aux deux sorties ; la liste de noms interdits et le log du scan ne sont pas versionnés | Versionner la denylist hors données sensibles et le rapport de scan CI | P1 - Important avant la présentation | Faible |
| S2-12 | Alignement des sources et de la disponibilité historique | Plan p. 6/14 ; Feature Guide p. 3-6 ; Data Dictionary p. 3-11 | CSV : 2 733 rendements, 88 NAV, 1 350 drawdowns ; `audit_donnees_dataflow.md:17` dit non livré | Non conforme | Confusion entre sept exports instantanés et jeux structurés historiques de quatorze fonds | Établir une matrice de source de vérité et corriger toutes les mentions P0-4 | P1 - Important avant la présentation | Moyen |
| S2-13 | Résultats reproductibles et preuves de calcul | Plan p. 12/14 ; DoD interne | `audit_donnees_dataflow.md:6` revendique un recalcul ; aucun script/notebook/test n'est présent | Non vérifiable | Les chiffres sont plausibles et plusieurs ont été recoupés, mais le run `SPRINT2-WF-001` n'est pas reproductible | Ajouter script versionné, manifest SHA-256, journal de run et tests de réconciliation | P1 - Important avant la présentation | Moyen |
| S2-14 | Cohérence de la règle ISIN | Exigence de protection / traçabilité | `audit_donnees_dataflow.md:60` vs `README.md:25` et HTML ligne 301 | Non conforme | Deux règles opposées ; risque d'implémentation divergente au Sprint 3 | Trancher par classification de données et corriger la documentation | P1 - Important avant la présentation | Très faible |
| S2-15 | Application et pipeline fonctionnels | TAPI final ; roadmap p. 6 | Aucun code applicatif | Hors périmètre du Sprint 2 | Le développement réel est explicitement prévu au Sprint 3 | Ne pas pénaliser Sprint 2 ; vérifier au gate W6 | P3 - Peut attendre un sprint ultérieur | Élevé |
| S2-16 | Risque avancé, pairs certifiés, UAT/RBAC | Roadmap p. 7 | Préfigurations et backlog seulement | Hors périmètre du Sprint 2 | Prévu au Sprint 4 | Conserver les dépendances et conditions explicites | P3 - Peut attendre un sprint ultérieur | Élevé |
| S2-17 | Manuels d'usage et maintenance | TAPI ; roadmap p. 8 | Absents | Hors périmètre du Sprint 2 | Prévus au Sprint 5 | Préparer le squelette à partir du Sprint 3 | P3 - Peut attendre un sprint ultérieur | Moyen |
| S2-18 | Documentation racine fidèle à l'état du projet | Bonne pratique de livraison | `README.md:5-10` ne mentionne que Sprint 1 | Partiellement conforme | Le Sprint 2 et le mode d'ouverture de la maquette ne sont pas visibles depuis la racine | Mettre à jour après validation du gate | P2 - Amélioration souhaitable | Très faible |

## 5. Ce qui a été bien fait

### Prototype réellement exécutable

L'attendu « maquette cliquable » est matérialisé, pas seulement décrit. `Sprint 2/wireframes/wireframes_sprint2.html:153-158` définit six onglets ; les lignes 226-301 implémentent le drill-down allocation -> positions. Le test Edge a confirmé la navigation, le passage de 39 à 3 positions après filtre, la vue qualité et l'absence d'erreur JavaScript. La maquette est autonome, sans appel réseau, et responsive à 390 px. **Confiance : élevée.**

### Hypothèses et limites visibles

Le prototype affiche clairement `DONNÉES D'EXEMPLE`, la date métier unique et le statut `HYPOTHÈSE À VALIDER` (`wireframes_sprint2.html:109-113,191-202`). Les relations master/feeder ne sont pas présentées comme certifiées. Cela respecte le principe de ne pas transformer une inférence en fait. **Confiance : élevée.**

### Audit des sept exports et des pairs

`audit_donnees_dataflow.md:20-52` décrit la structure semi-rectangulaire, les variations de largeur, les problèmes de durée, de staleness, les sections vides et le risque de fuite par les valeurs. L'audit indépendant confirme sept fichiers de 81 à 132 lignes et 38/51 colonnes. Le classeur contient bien 25/15/15/15 lignes ; l'onglet FIP a huit rentabilités supérieures à 100 %, un maximum proche de 43,2 millions %, et seulement 4/15 frais renseignés. **Confiance : élevée.**

### Architecture et qualité des critères

Les invariants d'idempotence, traçabilité et indépendance Gold/restauration sont précis (`architecture_backlog.md:11-25`). Les critères de plusieurs stories sont testables, par exemple trois replays sans doublon, sept fichiers parsés, quarantaine explicite et lineage automatisé (`architecture_backlog.md:41-47`). La Definition of Done couvre test, confidentialité, documentation et revue croisée (`architecture_backlog.md:69-74`). **Confiance : élevée sur la qualité de spécification, non vérifiée à l'exécution.**

### Catalogue KPI prudent

Le catalogue sépare KPI d'instantané et KPI historiques, précise les formules et marque les dépendances. Les garde-fous sur duration, staleness, double comptage et traçabilité sont utiles (`catalogue_kpi.md:19-58`). Même si la disponibilité historique est mal qualifiée, le principe de ne pas afficher une valeur simulée comme certifiée est correct. **Confiance : élevée.**

### Absence de secrets évidents dans les fichiers texte

Le scan de motifs usuels n'a pas trouvé de clé API, mot de passe, token ou clé privée dans les fichiers texte. Cela ne compense pas la présence de données métier sensibles et ne constitue pas une certification des PDF/DOCX/XLSX/bundles. **Confiance : moyenne.**

## 6. Ce qui doit être modifié

### P0 - Fermer l'exposition GitHub

**Problème.** Le dépôt est public et contient des sources que le projet qualifie de sensibles.  
**Preuve.** API GitHub `https://api.github.com/repos/thomasdbsl/YvY-Capital` : `private=false`; TAPI `PROJECT RESTRICTIONS`; `architecture_backlog.md:24`; `audit_donnees_dataflow.md:51-63`.  
**Impact.** Violation potentielle des engagements de confidentialité, de la restriction de marque et de la protection des données ; l'historique Git reste accessible même après une simple suppression au prochain commit.  
**Correction.** Restreindre immédiatement l'accès, prévenir l'enseignant/partenaire, inventorier les données exposées, retirer/purger les objets sensibles selon une procédure approuvée, puis utiliser GitLab ou un dépôt privé explicitement autorisé. Ne pas se limiter à supprimer les fichiers au dernier commit.  
**Priorité : P0.**

### P0 - Transformer le gate en décision enregistrée

**Problème.** Le gate est un questionnaire, pas un résultat.  
**Preuve.** `gate_W4_decisions.md:4-5,22,28,33,39,44-56,77`; tous les livrables sont Draft.  
**Impact.** Le Sprint 3 risque de démarrer sur des écrans, KPI, règles master/feeder et sources non approuvés.  
**Correction.** Ajouter un decision log D1-D8 avec option retenue, statut, décisionnaire, date, conditions et impact backlog ; lier la baseline approuvée à un commit/tag dans l'espace autorisé.  
**Priorité : P0.**

### P1 - Corriger la lecture de l'historique

**Problème.** Les livrables confondent le manque d'historique dans les sept exports PortfolioView avec l'absence d'historique dans tout le dépôt.  
**Preuve.** `audit_donnees_dataflow.md:17`, `catalogue_kpi.md:38-49`, `note_partenaire_sprint2.md:19,33` versus les CSV et Feature Guide pages 3-6.  
**Impact.** Périmètre analytique artificiellement bloqué, décisions P0-4 mal formulées et risque de négliger des données déjà disponibles.  
**Correction.** Décrire deux domaines : (A) snapshot 7 fonds au 29/05/2026 ; (B) séries structurées 14 fonds jusqu'au 11/08/2026. Qualifier par KPI ce qui est calculable, invalide, incomplet ou non aligné.  
**Priorité : P1.**

### P1 - Compléter le backlog « sprint-ready »

**Problème.** Les stories n'ont ni owner, ni estimation, ni fixture/jeu de test, contrairement au plan interne page 14.  
**Preuve.** La table `architecture_backlog.md:39-64` ne contient que ID, story, critères et dépendance.  
**Impact.** Engagement Sprint 3 non mesurable, risques de doublons de responsabilité et tests préparés trop tard.  
**Correction.** Ajouter `Owner`, `Reviewer`, `Estimate`, `Fixture`, `Acceptance command`, `Dependency owner`, puis ordonner les Must.  
**Priorité : P1.**

### P1 - Rendre la maquette conforme aux parcours et au clavier

**Problème.** Le parcours Analyste est représenté par une vue qualité, pas par un enchaînement import -> contrôle -> anomalie -> validation -> publication. Les 11 cibles non sémantiques ne sont pas focalisables.  
**Preuve.** `wireframes_sprint2.html:169,226-238,291-295,408-420`; test DOM.  
**Impact.** Critères d'acceptation UX du plan interne non remplis ; démonstration inaccessible au clavier.  
**Correction.** Ajouter les parcours, actions et transitions ; remplacer les `div/path/span onclick` par contrôles sémantiques ou fournir rôle, tabulation, clavier et focus visible.  
**Priorité : P1.**

### P1 - Unifier la politique ISIN

**Problème.** Le data-flow conserve les ISIN privés tandis que le README et la maquette les masquent.  
**Preuve.** `audit_donnees_dataflow.md:60`, `README.md:25`, HTML ligne 301.  
**Impact.** Deux équipes peuvent implémenter des politiques contradictoires, avec risque de réidentification.  
**Correction.** Définir la classification, le besoin métier, les zones autorisées et la règle d'export ; appliquer la décision à tous les documents.  
**Priorité : P1.**

### P2 - Préciser la métrique de doublons CNPJ

**Problème.** « 5 CNPJ dupliqués » est ambigu. Le contrôle indépendant trouve quatre identifiants distincts impliqués dans neuf lignes, soit cinq occurrences supplémentaires.  
**Preuve.** `audit_donnees_dataflow.md:47` et classeur `Pares - FIP Multi`.  
**Impact.** Faible, mais le chiffre peut être interprété différemment.  
**Correction.** Écrire « 4 CNPJ distincts dupliqués, 9 lignes concernées, 5 doublons au-delà de la première occurrence ».  
**Priorité : P2.**

## 7. Ce qui doit être ajouté

### P0 - Decision log / preuve d'acceptation

Attendu par la roadmap page 5 et le plan interne page 14. La recherche de fichiers `decision`, `validation`, `approval`, `UAT` et de statuts approuvés n'a trouvé que le questionnaire `gate_W4_decisions.md`. Ajouter une preuve datée et attribuée, avec les décisions D1-D8 et la baseline associée.

### P1 - Pipeline reproductible du run Sprint 2

`audit_donnees_dataflow.md:6` affirme que tous les chiffres sont recalculés programmatiquement, mais aucun script, notebook, manifeste ou test ne permet de reproduire `SPRINT2-WF-001`. Ajouter : inventaire SHA-256 des entrées, parseur des sections, génération JSON/HTML, denylist, rapport de scan, contrôles DQ et résultats attendus.

### P1 - Matrice unifiée des sources

Ajouter un tableau pour chaque source : fonds couverts, plage de dates, grain, fraîcheur, statut de qualité, caractère brut/structuré, autorisation de diffusion et KPI alimentés. Le résultat concret attendu est l'arbitrage 7/14 fonds et snapshot/historique sans ambiguïté.

### P1 - Cas de test chiffrés

Le backlog exige des critères mais ne fournit pas les fixtures. Ajouter au minimum : replay idempotent, fichier à 38 colonnes, fichier à 51 colonnes, section vide, décimal BR, duration invalide, prix stale, fonds feeder, CNPJ pair dupliqué, série négative H/E, contrôle de noms interdits et trois preuves de lineage écran -> source.

### P1 - Contrats d'architecture

Ajouter les schémas minimaux des tables Silver/Gold, clés, types, règles de nullité, lineage, quarantaines, interfaces de Serving et modèle d'autorisation. Le plan interne page 14 attend une revue de contrats d'interface, absente du paquet.

### P1 - Parcours UX complets

Ajouter les parcours Direction et Analyste, avec états à jour, retard, chargement, vide, erreur import, accès refusé et action de sortie. Les parcours doivent être testables au clavier et annotés avec données, droits et sources.

### P2 - Documentation de racine à jour

Le `README.md` racine ne mentionne pas Sprint 2. Après sécurisation et approbation, ajouter le périmètre, le statut, le mode d'ouverture du prototype et les limites, sans exposer d'informations interdites.

## 8. Qualité technique

| Domaine | Évaluation | Preuves et limites |
|---|---|---|
| Architecture | Moyenne | Couches, invariants et backlog cohérents ; absence d'ADR, schéma de déploiement, contrats et choix d'environnement. Non vérifiée à l'exécution. |
| Qualité et maintenabilité du code | Non vérifiable | Aucun code de produit au Sprint 2. Le HTML monolithique de 431 lignes embarque données, styles et logique ; acceptable pour une maquette, peu maintenable comme base applicative. |
| Cohérence frontend/backend | Non vérifiable | Pas de backend/API. Le prototype utilise des données figées embarquées. |
| Frontend / UX | Moyenne | Navigation et responsive validés ; parcours Analyste incomplet, performance non fonctionnelle, interactions clavier insuffisantes. |
| Exploitation des données | Moyenne | Bon audit des sept exports ; incohérence majeure avec les séries structurées déjà disponibles ; génération non reproductible. |
| Indicateurs financiers | Moyenne | Formules et garde-fous documentés ; grains/unités/cas tests incomplets ; données historiques mal classées. Six valeurs de rendement sont non positives et six drawdowns sont hors domaine, correctement identifiés dans le plan mais pas intégrés au paquet Sprint 2. |
| Tests | Faible | Aucun test automatisé ni configuration. Seuls les tests indépendants de cet audit prouvent le fonctionnement de la maquette et la validité JSON. |
| Documentation | Moyenne | Paquet lisible et bien structuré, mais Draft, contradictions ISIN/historique et README racine obsolète. |
| Sécurité / secrets | Critique | Aucun secret textuel évident, mais dépôt public avec contenus sensibles et branche non protégée. |
| LGPD / anonymisation | Critique au niveau dépôt ; bonne sur la maquette | Les sorties HTML/JSON sont aliasées ; les sources brutes et le classeur de pairs sont exposés dans le même dépôt public. Aucun DPIA, RACI data, politique de rétention ou preuve d'autorisation. |
| Installation / démonstration | Bonne pour la maquette uniquement | Un fichier HTML autonome s'ouvre sans dépendance et sans réseau. Aucun environnement reproductible pour pipeline/application, normal au Sprint 2 mais à créer au Sprint 3. |

## 9. Plan d'action recommandé

### 9.1 Correctifs indispensables

| Ordre | Priorité | Objectif | Fichiers / modules | Résultat attendu | Dépendances | Effort | Validation |
|---|---|---|---|---|---|---|---|
| 1 | P0 | Contenir l'exposition publique | Dépôt GitHub, historique, `data_YvY/`, `docs/` | Accès restreint, incident consigné, données sensibles retirées/purgées selon décision autorisée | Sponsor YvY, enseignant, propriétaire GitHub | Élevé | API GitHub privée/inaccessible publiquement ; revue de l'historique |
| 2 | P0 | Obtenir le gate W4 | `gate_W4_decisions.md` + nouveau decision log | D1-D8 datés, signés, acceptés/modifiés/reportés | Disponibilité YvY | Faible | Revue du procès-verbal et lien vers baseline |
| 3 | P1 | Réconcilier le périmètre data | Audit, catalogue KPI, note partenaire, gate | Matrice 7/14 fonds et snapshot/historique ; P0-4 reformulé | Data owner YvY | Moyen | Recalcul des comptages et revue croisée docs/données |
| 4 | P1 | Unifier anonymisation/ISIN | Audit data-flow, README Sprint 2, maquette | Une seule règle de classification et d'export | Décision sécurité/YvY | Très faible | Scan automatique + revue de la documentation |

### 9.2 Ajouts indispensables

| Ordre | Priorité | Objectif | Fichiers / modules | Résultat attendu | Dépendances | Effort | Validation |
|---|---|---|---|---|---|---|---|
| 5 | P1 | Reproduire `SPRINT2-WF-001` | Nouveau module de profilage/génération/tests | Même entrée -> mêmes JSON, chiffres et rapport ; manifest et logs | Espace de code autorisé | Moyen | Exécution propre, checksums, tests verts |
| 6 | P1 | Rendre le backlog engageable | `architecture_backlog.md` | Owner, estimate, fixture, reviewer et commande de validation par story | Gate W4 | Faible | Revue de planning Sprint 3 |
| 7 | P1 | Compléter le prototype | `wireframes_sprint2.html` | Parcours Direction/Analyste, états manquants, clavier/focus | Décisions D1-D3 | Moyen | Tests desktop/mobile/clavier sans erreur |
| 8 | P1 | Compléter les contrats | Architecture + schémas de données | Tables, clés, types, DQ, lineage, interfaces, RBAC | Décisions D4-D8 | Moyen | Revue Adrien/Raphael/Isiah |

### 9.3 Améliorations facultatives

| Ordre | Priorité | Objectif | Résultat attendu | Effort | Validation |
|---|---|---|---|---|---|
| 9 | P2 | Mettre à jour le README racine | Sprint 2 et limites visibles depuis la racine | Très faible | Relecture documentaire |
| 10 | P2 | Préciser les statistiques de pairs | Terminologie sans ambiguïté sur doublons/completude | Très faible | Recalcul pandas/Excel |
| 11 | P2 | Séparer données, styles et logique de la maquette | Prototype plus maintenable sans changer le comportement | Faible | Test de non-régression Edge |

### 9.4 À reporter aux prochains sprints

- Sprint 3 : pipeline idempotent, tables Silver/Gold, règles DQ codées, application alpha, tests et lineage automatisé.
- Sprint 4 : risque avancé, réconciliation visible, pairs certifiés ou adaptateur clairement simulé, RBAC, LGPD pack et UAT.
- Sprint 5 : stabilisation, release, manuels, handover et acceptation finale.

## 10. Conclusion

### Le Sprint 2 respecte-t-il actuellement les attendus ?

**Partiellement.** Les artefacts principaux existent et sont de bonne qualité conceptuelle, mais le gate de sortie n'est pas validé, le backlog n'est pas totalement sprint-ready, la maquette ne couvre pas tous les parcours/critères d'accessibilité et la documentation des sources historiques est contradictoire. La confidentialité est non conforme.

### Peut-il être présenté à YvY Capital en l'état ?

**Non comme livraison approuvée, et pas depuis le dépôt public actuel.** La maquette peut être montrée comme Draft dans une session autorisée après containment de l'exposition et revue des données affichées. Le message de présentation doit annoncer les limites et demander formellement les décisions D1-D8.

### Trois risques principaux

1. **P0 - Confidentialité/LGPD :** dépôt public, sources brutes et classeur de pairs potentiellement réidentifiants, historique Git persistant.
2. **P0 - Gouvernance produit :** absence d'acceptation W4, donc risque de développer le Sprint 3 sur une baseline non approuvée.
3. **P1 - Mauvaise source de vérité :** confusion entre 7 exports instantanés et 14 fonds historiques, pouvant fausser le périmètre KPI, les dépendances et le planning.

### Cinq prochaines actions prioritaires

1. Restreindre immédiatement le dépôt et déclencher la procédure de traitement de l'exposition avec YvY/Inteli.
2. Tenir le gate W4 et enregistrer D1-D8 dans un decision log daté.
3. Produire la matrice unifiée des sources et corriger les déclarations d'historique absent.
4. Versionner le pipeline reproductible de `SPRINT2-WF-001`, ses manifests, scans et tests.
5. Compléter le backlog et la maquette avec owners/estimations/fixtures, parcours Analyste et accessibilité clavier.

---

**Confirmation d'intégrité de l'audit :** aucun code, document source, fichier de données, commit ou état distant n'a été modifié. Le seul fichier ajouté au dépôt est `SPRINT_2_AUDIT_REPORT.md`. Aucun commit et aucun push n'ont été effectués.
