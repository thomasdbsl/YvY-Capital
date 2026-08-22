# Catalogue KPI et règles de calcul — Sprint 2

**Projet :** Inteli × YvY Capital — Pipeline data & DataApp
**Livrable Sprint 2 :** « KPI and calculation catalog » (lead : Isiah · relecture : Viktor, Thomas)
**Version :** 0.9 · 20/08/2026 · Statut : Draft pour gate W4
**Sources :** 7 exports PortfolioView du 29/05/2026 · classeur des pairs · dictionnaire Markdown · Rapport v1.0

---

## 1. Conventions générales

- **Alias obligatoires** : `FUND_01` à `FUND_07` dans tout code, sortie et démonstration. Aucun nom réel de fonds, d'émetteur privé ou de dépositaire dans les sorties partageables.
- **Types** : montants `decimal(20,2)` BRL ; valeurs de part `decimal(20,8)` ; fractions de variation stockées telles quelles (`0,010874` = 1,0874 %) et converties uniquement à l'affichage.
- **Recalcul des rendements** : les variations INOA (`Variacao Diaria/Mensal/Anual/6 Meses/12 Meses`) sont **pré-calculées** et servent de contrôle. Les rendements officiels sont recalculés dans le pipeline depuis la série des valeurs de part (règle du dictionnaire de données). Tout écart au-delà de la tolérance déclenche une alerte, pas une correction silencieuse.
- **Double lecture systématique** : tout agrégat multi-fonds existe en **vue juridique** (somme brute) et en **vue transparisée** (après élimination des participations internes via `bridge_fund_of_fund`). La vue transparisée porte le label `HYPOTHÈSE À VALIDER` tant que le registre des fonds n'est pas confirmé (question P0-5).

## 2. KPI calculables sur l'instantané (livrables Sprint 3)

| ID | KPI | Définition | Formule | Colonnes sources (Silver) | Hypothèses / limites |
|---|---|---|---|---|---|
| K01 | Patrimoine (PL) | Valeur nette du fonds au jour J | champ direct | `stg_fund_daily_summary.net_asset_value_brl` ← `Patrimonio Liquido` | Inclut provisions et flux ; contrôle K13 |
| K02 | Valeur de part nette / brute | NAV par part | champ direct | `nav_per_share_net` ← `Valor da Cota Liquida` ; `nav_per_share_gross` ← `Valor da Cota Bruta` | Nette = brute sur l'échantillon (frais déjà provisionnés ?) — à confirmer |
| K03 | Nombre de parts | Parts en circulation | champ direct | `share_count` ← `Quantidade de Cotas` | Décimales possibles (43 878,77) |
| K04 | Identité NAV | Cohérence PL vs part×parts | `PL − nav_net × parts` | K01, K02, K03 | Tolérance : max(10 BRL ; 1 pb PL) — écarts observés −167,79 à +597,88 BRL (règle DQ09, seuil à valider Back Office) |
| K05 | Allocation par classe | Poids de chaque classe d'actif | `Σ valeur_liquide(classe) / PL` | `stg_position.net_value_brl`, `section_label` | Sans look-through ; sections observées : Titulos Publicos/Privados, Cotas de Fundos, Acoes e Recibos, Futuros, Caixa |
| K06 | Poids d'une position | Part d'une ligne dans le fonds | `net_value_brl / PL` | `stg_position` | Contrats répétés d'un même ISIN agrégés en vue instrument avant lecture « par actif » |
| K07 | Concentration Top N | Poids cumulé des N premières positions | tri décroissant sur vue instrument agrégée | `stg_position` agrégée | Grain contrat ≠ grain instrument : toujours calculer sur la vue agrégée |
| K08 | HHI | Indice de concentration | `Σ (poids_i)²` | vue instrument agrégée | À produire en double lecture juridique / transparisée |
| K09 | Exposition par indexeur | Sensibilité taux/inflation | `Σ exposure_brl` par indexeur | `stg_position.exposure_brl`, indexeur extrait de `Tipo (RF)` / libellé | Indexeur parfois dérivé du nom — marquer la provenance |
| K10 | Concentration émetteur / secteur | Risque de crédit | `Σ valeur par émetteur / PL` | `stg_position.issuer_masked`, `sector` | Colonne Setor uniformément « Financeiro » sur le crédit privé : taxonomie trop grossière, enrichissement à valider |
| K11 | Buckets de maturité | Profil d'échéances | `Σ valeur par tranche de Data Vencimento` | `stg_position.maturity_date` | Dates manquantes sur certains instruments |
| K12 | Caisse et provisions | Liquidité et ajustements hors performance | `Σ` par type | `stg_cash.net_value_brl`, `stg_provision.amount_brl` | 12 catégories de provisions observées ; total FUND_06 : +305 153,64 BRL dominé par l'ajustement de futures |
| K13 | Rapprochement PL | Positions + caisse + provisions ≈ PL | `Σ positions + caisse + provisions − PL` | K01, K05, K12 | Tolérance à valider ; écarts feeder liés aux provisions non rattachées |
| K14 | Encours brut vs transparisé | Somme juridique vs économique | `Σ PL` vs `Σ PL − Σ bridge.value_brl` | `fact_fund_daily_summary`, `bridge_fund_of_fund` | Au 29/05/2026 : 1 084 593 077,84 vs 555 603 469,48 BRL (×1,95) — HYPOTHÈSE À VALIDER |
| K15 | Fraîcheur des prix (staleness) | Ancienneté du prix par position | `business_date − price_date` | `stg_position.price_date` | Seuil par classe ; cas observé : action non cotée à 59 jours (FUND_04) |
| K16 | Complétude / erreurs de run | Santé du pipeline | compteurs par run | tables de run (`run_id`, lignes lues/rejetées, sections) | Alimente la vue qualité |

## 3. KPI nécessitant l'historique — ÉTAT FUTUR (Sprint 4, conditionné à P0-4)

| ID | KPI | Formule de référence | Prérequis | Décision YvY nécessaire |
|---|---|---|---|---|
| H01 | Rendement quotidien | `r_t = NAV_t / NAV_{t−1} − 1` (ajusté amortissements/splits) | Série NAV quotidienne complète | Profondeur d'historique disponible (P0-4) |
| H02 | Rendement cumulé / fenêtres | `Π(1+r_t) − 1` sur J/M/YTD/6m/12m | H01 | Calendrier ouvré BR à valider |
| H03 | Volatilité annualisée | `σ = écart-type(r_t) × √252` | ≥ 12 mois d'historique | Convention 252 jours à confirmer |
| H04 | Sharpe / Sortino | `(R_ann − rf_ann) / σ_ann` | H01–H03 + taux sans risque | Benchmark et taux sans risque par fonds (P1-9) |
| H05 | Drawdown max | min du ratio au plus-haut courant | H01 | — |
| H06 | DV01 / stress de taux | sensibilité par choc de courbe | Durations interprétables | Unité du champ Duration (P1-12) — conversion bloquée d'ici là |
| H07 | Comparaison aux pairs | métriques harmonisées vs groupe versionné | Univers validés + données ANBIMA | Sélection et versionnage des groupes (P1-8/9) |
| H08 | Attribution / flux | décomposition de la variation de PL | Historique flux + provisions | Accès aux souscriptions/rachats (LGPD) |

**Règle d'affichage** : un KPI de la famille H n'apparaît jamais avec une valeur simulée. Il est grisé, étiqueté `ÉTAT FUTUR`, avec sa condition de déblocage.

## 4. Garde-fous transverses

1. Les fenêtres YTD/6m/12m **identiques** sur 4 fonds indiquent un historique incomplet : aucune métrique 12 m n'est certifiable sur l'instantané.
2. `Cota Congelada = true` sur les 7 fonds : sens métier non confirmé (P1-11) — le drapeau est propagé tel quel en Silver, jamais interprété.
3. Le champ `Duration` reste `duration_raw` (texte) tant que la règle source n'est pas documentée — 23 positions au format illisible.
4. Toute valeur affichée doit être traçable : `source_file`, `source_row`, `run_id`, `business_date` portés par toutes les tables Silver.

## 5. Validation demandée au gate W4

- Confirmer la liste K01–K16 comme périmètre Sprint 3 et la liste H01–H08 comme périmètre Sprint 4 conditionnel.
- Valider les tolérances K04 et K13, le seuil de staleness K15 et la convention d'annualisation H03.
- Nommer le décisionnaire des benchmarks / taux sans risque (H04) et du registre des fonds (K14).
