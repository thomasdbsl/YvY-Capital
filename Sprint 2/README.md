# Sprint 2 — Paquet de livrables (Semaines 3-4)

**Projet :** Inteli × YvY Capital — Pipeline de gouvernance des données et DataApp
**Objectif du sprint :** convertir le cadrage et les données sources en une direction produit approuvée avant le début du développement réel (gate W4 — gel du scope).
**Version :** 0.9 · 20/08/2026 · Statut : Draft pour revue partenaire
**Équipe :** Thomas (coordination), Viktor (UX/UI), Adrien (data), Isiah (KPI/analytics), Raphael (application)

## Contenu

| Fichier | Livrable roadmap | Lead |
|---|---|---|
| `wireframes/wireframes_sprint2.html` | Maquette cliquable + inventaire d'écrans + états d'interaction (6 vues) | Viktor |
| `wireframes/mockup_data.json` | Jeu de données figé alimentant la maquette (aliasé, masqué, traçable — run SPRINT2-WF-001) | Viktor |
| `docs/catalogue_kpi.md` | Catalogue KPI et règles de calcul (K01–K16 instantané ; H01–H08 historique) | Isiah |
| `docs/audit_donnees_dataflow.md` | Audit des données + proposition de masquage + data-flow Raw/Silver/Gold/Serving | Adrien |
| `docs/architecture_backlog.md` | Approche technique + backlog priorisé sprint-ready (S3/S4) | Raphael / Thomas |
| `docs/gate_W4_decisions.md` | Set de décisions D1–D8 demandé à YvY Capital au gate W4 | Thomas |

## Comment ouvrir la maquette

Double-cliquer `wireframes/wireframes_sprint2.html` — fichier autonome, aucune connexion réseau requise, testé sans erreur depuis un profil navigateur vierge. Navigation par onglets ; le drill-down (clic sur le donut d'allocation) filtre le tableau des positions ; le survol des chiffres affiche la piste de lineage.

## Règles de confidentialité appliquées

Fonds aliasés FUND_01–FUND_07 ; instruments privés, ISIN privés, émetteurs et dépositaires masqués ; aucune courbe historique (une seule date métier disponible) ; l'encours transparisé et la classification MASTER/FEEDER portent le label HYPOTHÈSE À VALIDER. Scan zéro-occurrence des noms interdits exécuté sur les sorties partageables (HTML + JSON) le 20/08/2026.

## Ce que ce paquet ne prétend pas

Pas de rendements/risques certifiés (historique absent), pas de consolidation économique validée (registre des fonds non confirmé), pas de groupes de pairs définitifs (validation gérants et données ANBIMA en attente), pas de choix d'outil BI arrêté.
