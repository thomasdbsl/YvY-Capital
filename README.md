# YvY Capital

Ce depot centralise les livrables et jeux de donnees de travail du projet YvY Capital. Il regroupe des documents de cadrage, des extractions de fonds, des fichiers de reference et des tables analytiques destinees a l'etude de la performance, de la composition de portefeuille, de la liquidite et du risque.

## Objectif du projet

Le projet vise a documenter et exploiter des donnees de gestion d'actifs afin de :

- suivre l'evolution des fonds et de leur valeur liquidative ;
- analyser les portefeuilles et les instruments sous-jacents ;
- mesurer les flux de souscriptions et rachats ;
- observer des indicateurs de risque comme le stress testing, le drawdown, la liquidite et le DV01 ;
- conserver les livrables academiques et de recherche relies au sujet.

## Contenu du depot

La racine du depot contient :

- `2026_TAPI_YvY_Capital_Inteli_ENGLISH.docx` : document principal en anglais lie au projet YvY Capital ;
- `Special Projects -4o year.docx` : document de travail complementaire ;
- `data_YvY/` : dossier principal de donnees et de sources ;
- `Sprint 1/` : dossier present mais actuellement vide.

## Structure des donnees

### Dossier `data_YvY/`

Ce dossier rassemble des tables consolidees, des extractions brutes et des fichiers de reference.

#### Tables consolidees

- `funds.csv` : referentiel des fonds avec identifiant, nom, devise et statut d'activation. Environ 14 lignes de donnees.
- `fund_nav_snapshot.csv` : historique de snapshots de valeur liquidative (`nav`) par fonds et par date. Environ 88 lignes.
- `portfolio_holdings.csv` : composition detaillee des portefeuilles par fonds, date, groupe d'actifs et instrument. Environ 1 013 lignes.
- `returns_navps.csv` : serie temporelle de performance cumulee par fonds. Environ 2 733 lignes.
- `cash_flow_daily.csv` : flux nets quotidiens, souscriptions et rachats. Environ 32 lignes.
- `corporate_payments.csv` : paiements et evenements sur titres, avec date d'ex-dividende et montant par unite. Environ 16 lignes.
- `drawdown.csv` : suivi du drawdown par fonds et par date. Environ 1 350 lignes.
- `dv01.csv` : mesures de sensibilite taux au format structure, avec details embarques en JSON. Environ 14 lignes.
- `bond_instruments.csv` : referentiel simplifie d'instruments obligataires, avec codes et maturites. Environ 67 lignes.
- `liquidity_by_horizon.csv` : projection de liquidite par horizon de temps exprimee en pourcentage de NAV. Environ 84 lignes.
- `stress_risk.csv` : resultats de stress tests par fonds, avec details de scenarios dans une colonne JSON. Environ 14 lignes.
- `transactions_summary.csv` : synthese des souscriptions, rachats, taxes et NAV sur une periode. Environ 14 lignes.
- `var_mask_configs.csv` : configuration des masques de VaR et parametres de calcul. 1 ligne.
- `external_debenture_data_raw.csv` : fichier present mais vide a la date du 12 aout 2026.

#### Sources complementaires

- `Fund-administration-database-Inteli/docs/Fund-administration-database.md` : description fonctionnelle de la base d'administration de fonds. Le document explique que les donnees proviennent d'INOA et couvrent notamment NAV, AUM, positions, provisions, transactions et vues agregees.
- `Fund-administration-database-Inteli/29-05-2026/` : extractions `PortfolioView` par fonds et par lot de collecte.
- `Fund-administration-database-peers-Inteli/comparativo_fundos_pares_FINAL.xlsx` : fichier Excel de comparaison entre fonds pairs.

## Lecture fonctionnelle des donnees

Les fichiers disponibles permettent de couvrir plusieurs axes d'analyse :

- performance : `returns_navps.csv`, `fund_nav_snapshot.csv`, `drawdown.csv` ;
- portefeuille : `portfolio_holdings.csv`, `bond_instruments.csv` ;
- flux investisseurs : `cash_flow_daily.csv`, `transactions_summary.csv` ;
- evenements de marche et de portefeuille : `corporate_payments.csv` ;
- risque : `stress_risk.csv`, `dv01.csv`, `liquidity_by_horizon.csv`, `var_mask_configs.csv` ;
- documentation source : fichiers `.docx`, fichier Markdown INOA, fichiers bruts `PortfolioView`, fichier pair-comparison Excel.

## Points de gouvernance et qualite

Les sources deja presentes dans le projet font apparaitre plusieurs regles importantes :

- certains identifiants ou noms de fonds semblent masques ou anonymises ;
- une partie des mesures de risque est stockee sous forme de JSON dans des colonnes CSV, ce qui demande un traitement specifique pour l'analyse ;
- les fichiers contiennent des caracteres accentues parfois mal encodes, ce qui suggere un point d'attention sur l'encodage ;
- `external_debenture_data_raw.csv` est vide et devra etre controle avant toute utilisation analytique ;
- le dossier `Sprint 1/` est vide a ce stade.

## Utilisation recommandee

Le depot peut servir de base pour :

- des analyses exploratoires en Python, R, Excel ou SQL ;
- la construction d'un pipeline de normalisation et de controle qualite ;
- la documentation d'un projet academique ou d'un cas d'usage en asset management ;
- des travaux de comparaison entre fonds, de mesure du risque et de suivi de portefeuille.

## Etat du depot au 12 aout 2026

Ce depot a ete remplace pour refleter le contenu du dossier local `C:\Users\thdub\OneDrive\Bureau\YvY`. Le contenu historise correspond donc desormais aux livrables et donnees presents dans ce dossier source, avec un nouveau `README.md` de synthese.
