# YvY Capital

Ce depot contient les donnees, la documentation et les livrables du projet YvY Capital.

## Structure du depot

- `data_YvY/` : jeux de donnees principaux du projet
- `docs/` : documentation et livrables PDF/Word
- `Sprint 1/` : dossier de sprint
- `data_YvY.zip` : archive des donnees

## Contenu des donnees

Le dossier `data_YvY/` regroupe des fichiers de suivi et d'analyse autour de fonds d'investissement :

- `funds.csv` : referentiel des fonds
- `fund_nav_snapshot.csv` : snapshots de NAV par fonds et par date
- `portfolio_holdings.csv` : composition detaillee des portefeuilles
- `returns_navps.csv` : historique de performance
- `cash_flow_daily.csv` : flux quotidiens
- `corporate_payments.csv` : paiements et evenements corporate
- `drawdown.csv` : historique des drawdowns
- `dv01.csv` : sensibilite taux
- `liquidity_by_horizon.csv` : projections de liquidite
- `stress_risk.csv` : resultats de stress tests
- `transactions_summary.csv` : synthese des souscriptions et rachats
- `bond_instruments.csv` : informations sur les instruments obligataires
- `var_mask_configs.csv` : configuration des scenarios VaR
- `external_debenture_data_raw.csv` : fichier brut actuellement vide

Le dossier contient aussi :

- `Fund-administration-database-Inteli/` : extractions et documentation source
- `Fund-administration-database-peers-Inteli/` : comparaison de fonds pairs

## Documentation

Le dossier `docs/` contient :

- `2026_TAPI_YvY_Capital_Inteli_ENGLISH.docx`
- `Special Projects -4o year.docx`
- `FEATURE_GUIDE.pdf`
- `DATA_DICTIONARY.pdf`

## Usage

Ce depot sert de base de travail pour :

- l'analyse de portefeuille
- le suivi de performance
- l'etude des flux et de la liquidite
- l'analyse de risque
- la centralisation de la documentation projet

## Synchronisation locale

Le depot local est configure pour recopier automatiquement le contenu du repo vers le dossier `C:\Users\thdub\OneDrive\Bureau\YvY` avant chaque `git push`.
