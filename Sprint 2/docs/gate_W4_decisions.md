# Gate de décision W4 — Sprint 2 → gel du scope

**Projet :** Inteli × YvY Capital — Pipeline data & DataApp
**Objet :** décisions demandées à YvY Capital à la revue de fin de Sprint 2. Le développement (Sprint 3) ne démarre que depuis la baseline approuvée ici. Toute fonctionnalité non approuvée bascule au backlog post-MVP.
**Format attendu de la réponse** (standard de feedback de la roadmap) : une réponse consolidée unique — *Approuvé* / *Approuvé avec changements bornés* / *Non approuvé avec motifs bloquants et corrections priorisées*.
**Version :** 0.9 · 20/08/2026 · Préparé par : Thomas (coordination), Viktor (UX), Adrien (data), Isiah (KPI), Raphael (app)

---

## Pièces présentées à l'appui

1. Maquette cliquable `wireframes_sprint2.html` (6 vues, données réelles aliasées, jeu figé du 29/05/2026).
2. Catalogue KPI et calculs (`catalogue_kpi.md`).
3. Audit de données et data-flow (`audit_donnees_dataflow.md`).
4. Architecture et backlog priorisé (`architecture_backlog.md`).

---

## D1 — Utilisateurs cibles et priorités d'écran

**Proposition :** trois profils au MVP — Direction (vue exécutive), Gérant (vue fonds + comparaison), Responsable data / Back Office (vue qualité). Les maintenances et l'IT consomment la documentation, pas l'application.
**À approuver :** la liste des profils, et le profil prioritaire en cas d'arbitrage (proposition : Gérant).
**Si non tranché :** la hiérarchie d'information des écrans reste celle de la maquette, au risque d'une refonte tardive.

## D2 — Jeu d'écrans du MVP

**Proposition :** 5 écrans engagés (vue exécutive, vue fonds avec drill-down, comparaison interne, vue qualité, états d'interaction transverses) + 1 écran conditionnel (pairs, Sprint 4).
**À approuver :** ce périmètre d'écrans ; toute demande d'écran supplémentaire passe au backlog post-MVP.

## D3 — Logique KPI

**Proposition :** périmètre K01–K16 (instantané) engagé Sprint 3 ; H01–H08 (historique) conditionné à la livraison des séries NAV. Tolérances proposées : identité NAV max(10 BRL ; 1 pb PL) ; staleness par classe d'actif.
**À approuver :** les définitions et formules du catalogue, les tolérances, et le décisionnaire des benchmarks / taux sans risque.
**Point dur :** les rendements officiels seront **recalculés** depuis la série NAV — les variations INOA ne servent que de contrôle. Confirmer cette règle.

## D4 — Univers de fonds actif

**Proposition :** les 7 fonds de l'échantillon (FUND_01–FUND_07) constituent l'univers du MVP, avec la structure master/feeder détectée (4 liens) portée en table bridge.
**À approuver :** (a) l'univers des 7 fonds ; (b) **la confirmation ou l'infirmation des relations fonds-dans-fonds** — c'est la décision qui transforme l'encours transparisé d'hypothèse en chiffre certifiable (aujourd'hui : 1 084,6 M brut vs ~555,6 M transparisé, ×1,95).
**Si non tranché :** la vue transparisée reste étiquetée HYPOTHÈSE À VALIDER jusqu'en Sprint 5 inclus.

## D5 — Sources de données prioritaires et accès

**À approuver / fournir :**
1. Canal de dépôt automatisé des exports INOA (P0-1) — sinon le MVP reste sur dossier contrôlé.
2. **Historique quotidien NAV/positions/flux (P0-4) — décision la plus urgente : conditionne tout le Sprint 4 analytique.** Date de livraison attendue : avant fin S6.
3. Sens de `Cota Congelada`, unité du champ `Duration`, règle de nommage des exports (P1-11/12).

## D6 — Traitement du peer benchmarking

**Proposition (conforme roadmap) :** adaptateur de données pairs construit au Sprint 4 ; intégration des données réelles si la remise ANBIMA arrive à temps, sinon vue simulée explicitement étiquetée, jamais présentée comme un classement.
**À approuver :** cette stratégie, la source officielle des pairs, et le processus de validation/versionnage des groupes par les gérants. L'univers FIP requiert nettoyage (5 CNPJ dupliqués, 8 valeurs extrêmes) avant tout usage.

## D7 — Gouvernance, confidentialité, environnement

**À approuver :** la politique de masquage au niveau des valeurs (instruments/émetteurs/dépositaires, pas seulement les noms de fonds), le scan de noms interdits en gate de publication, et l'espace de dépôt de code autorisé (restriction GitHub à clarifier — P0-6').

## D8 — Outil de restitution (non bloquant)

**Proposition :** décision reportable ; la couche Gold est indépendante de l'outil. Préférence et contraintes YvY IT (Power BI / Streamlit / web) attendues au plus tard au gate W6.

---

## Récapitulatif des réponses attendues

| # | Décision | Décisionnaire | Bloquant pour |
|---|---|---|---|
| D1 | Profils utilisateurs et priorité | YvY métier | Sprint 3 (écrans) |
| D2 | Jeu d'écrans MVP | YvY métier | Sprint 3 |
| D3 | KPI, tolérances, règle de recalcul | YvY gérants + Back Office | Sprint 3 |
| D4 | Univers + relations fonds-dans-fonds | YvY gérants | Vue consolidée certifiable |
| D5 | Accès sources + historique NAV | YvY data / IT | **Sprint 4 entier** |
| D6 | Stratégie pairs | YvY gérants | Sprint 4 (S4-02) |
| D7 | Gouvernance + dépôt autorisé | YvY sponsor + enseignant | Livraison continue |
| D8 | Outil BI | YvY IT | Sprint 5 (packaging) |

**Après le gate :** Thomas consigne chaque réponse dans le décision log (une ligne : décision, option retenue, décisionnaire, date, impact) ; les items non approuvés sont déplacés au backlog post-MVP le jour même.
