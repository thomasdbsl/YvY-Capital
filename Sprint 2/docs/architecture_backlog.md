# Architecture technique et backlog priorisé — Sprint 2

**Projet :** Inteli × YvY Capital — Pipeline data & DataApp
**Livrable Sprint 2 :** « Architecture and prioritized backlog » (leads : Raphael / Thomas · relecture : Viktor, Adrien)
**Version :** 0.9 · 20/08/2026 · Statut : Draft pour gate W4

---

## 1. Approche technique

Le produit principal est le **pipeline gouverné** ; la DataApp en est la couche de consommation. L'architecture suit les quatre couches validées au Sprint 1 (Raw/Bronze → Clean/Silver → Business/Gold → Serving), avec trois invariants :

1. **Idempotence** : le même fichier rejoué produit les mêmes sorties, sans doublon (hash + manifest + `run_id`).
2. **Traçabilité** : chaque chiffre d'écran remonte à `source_file` / `source_row` / `run_id` / `business_date`.
3. **Indépendance de la couche Gold** vis-à-vis de l'outil de restitution (Power BI, Streamlit ou web custom — décision D8, non bloquante).

| Composant | Proposition Sprint 3 | Alternative / à confirmer avec YvY |
|---|---|---|
| Ingestion | Dossier d'échantillons contrôlé + manifest | Canal INOA / boîte technique (P0-1) |
| Traitement | Python 3.11, parseur à machine à états, tests pytest sur fixtures 7/7 | Pandas retenu (volumes faibles) ; Polars si volumétrie |
| Stockage | CSV/Parquet locaux anonymisés (preuve) | PostgreSQL / entrepôt partenaire dès que l'environnement est ouvert |
| Transformation | Tables staging + règles DQ codées | dbt + orchestration (Prefect, puis Airflow si multi-sources) |
| Restitution | Maquette HTML validée W4 → application Sprint 3 | Power BI vs Streamlit vs web (D8, YvY IT) |
| Dépôt de code | Espace autorisé par l'enseignant/partenaire | GitHub interdit tant que la restriction n'est pas levée (P0-6') |
| Sécurité | Alias systématiques, scan de noms interdits en CI, RBAC par fonds au Serving | Coffre de secrets partenaire |

## 2. Périmètre par sprint (rappel roadmap)

- **Sprint 3 (S5-6)** — pipeline v1 (ingestion → Silver certifié → Gold minimal) + MVP alpha : sélection de fonds, NAV, portefeuille, comparaison interne. KPI K01–K16.
- **Sprint 4 (S7-8)** — analytics de risque (H01–H07, conditionné à l'historique), réconciliation visible, pairs (adaptateur + vue simulée si les données ANBIMA n'arrivent pas), gouvernance, UAT.
- **Sprint 5 (S9-10)** — stabilisation, pipeline production-ready, manuels, handover.

## 3. Backlog priorisé — user stories sprint-ready

Priorité MoSCoW ; « prêt » = critères d'acceptation testables. Les stories S3-x sont engagées au gate W4 ; les S4-x sont conditionnelles aux décisions/données listées.

### Sprint 3 — Must

| ID | User story | Critères d'acceptation | Dépend de |
|---|---|---|---|
| S3-01 | En tant que responsable data, je veux une ingestion idempotente des exports pour rejouer un lot sans doublon. | Hash + manifest ; 3 replays du même fichier → 0 doublon ; fichier invalide → quarantaine avec motif. | P0-1 (sinon dossier contrôlé) |
| S3-02 | En tant qu'analyste, je veux que le parseur transforme les 7 exports en tables staging typées. | 7/7 fichiers parsés ; sections classées ; comptage lignes lues/rejetées par section ; erreurs journalisées ; rejeu = sorties identiques. | Registre de sections v1 (fait Sprint 1) |
| S3-03 | En tant que responsable data, je veux les règles DQ bloquantes exécutées à chaque run. | DQ01/02/04/05/06/07/11 codées ; rapport par run avec sévérité, fichier, ligne ; lot certifié ou isolé. | S3-02 |
| S3-04 | En tant que steward, je veux les alias et le masquage appliqués dès Silver. | Zéro nom interdit dans Silver et sorties ; scan automatique en CI ; table d'alias en zone restreinte. | — |
| S3-05 | En tant que gérant, je veux consulter NAV, composition et provisions de mon fonds. | Écrans 1-2 conformes aux wireframes W4 ; drill-down fonds → classe → contrat ; lineage au survol. | S3-02, S3-03, gate W4 |
| S3-06 | En tant que direction, je veux la vue consolidée en double lecture juridique / transparisée. | Bridge fonds-dans-fonds alimenté ; bascule de vue ; label HYPOTHÈSE tant que P0-5 non validée ; jamais présentée comme certifiée. | S3-02, P0-5 |
| S3-07 | En tant que mainteneur, je veux retracer tout KPI jusqu'à la source. | `source_file`, `source_row`, `run_id`, `business_date` sur toutes les tables ; test lineage automatisé sur 3 chiffres. | S3-02 |

### Sprint 3 — Should

| ID | User story | Critères d'acceptation | Dépend de |
|---|---|---|---|
| S3-08 | En tant que responsable data, je veux la vue qualité dans l'application. | Écran 5 des wireframes ; anomalies cliquables vers fichier/ligne. | S3-03 |
| S3-09 | En tant qu'équipe, je veux un calcul KPI validé par un module indépendant. | Notebook de validation d'Isiah reproduit K01–K14 ; écarts vs pipeline = 0. | S3-02 |

### Sprint 4 — conditionnels

| ID | User story | Critères d'acceptation | Condition |
|---|---|---|---|
| S4-01 | En tant que gérant, je veux rendements et risque recalculés depuis la série NAV. | H01–H05 ; écart vs variations INOA expliqué ou alerté. | **Historique livré (P0-4)** |
| S4-02 | En tant que gérant, je veux comparer mon fonds à un groupe de pairs validé. | Univers dédupliqués (CNPJ), extrêmes en quarantaine ; groupe versionné ; méthode affichée. | Données ANBIMA + validation gérants (P1-8/9) ; sinon adaptateur + vue simulée étiquetée |
| S4-03 | En tant que risque, je veux les vues duration/DV01. | Conversion `duration_raw` documentée et testée. | Règle source Duration (P1-12) |
| S4-04 | En tant que Back Office, je veux la réconciliation automatisée visible. | K04/K13 avec tolérances validées ; exceptions listées avec lineage. | Tolérances Back Office (P1-10) |
| S4-05 | En tant que sponsor, je veux le pack gouvernance v1. | RACI données, classification des champs, journal d'accès, checklist LGPD. | P0-6 |

### Hors périmètre MVP (post-Sprint 5, backlog)
Attribution de performance, alertes SLA temps réel, ingestion temps réel INOA, application mobile, verticales/taxonomies étendues.

## 4. Definition of Done transverse (chaque story)

1. Testé (unitaire + fixture réelle), rejouable depuis un environnement propre.
2. Zéro nom interdit dans code, sorties, logs et captures.
3. Documenté : entrée, sortie, limites, propriétaire.
4. Revu par le binôme de contrôle désigné (règle Sprint 1 : relecteur hors fonction).

## 5. Risques de planning portés au gate

| Risque | Impact sprint | Parade |
|---|---|---|
| Historique NAV non livré en S6 | Sprint 4 analytique vidé | Bascule S4-01→simulé interdit ; re-priorisation réconciliation + gouvernance |
| Données ANBIMA pairs en retard | S4-02 | Adaptateur + vue simulée étiquetée (prévu roadmap) |
| Environnement/dépôt non clarifié | livraison continue | Espace autorisé provisoire + décision P0 au gate |
| Registre des fonds non confirmé | vue transparisée reste hypothèse | Label permanent + escalade sponsor |
