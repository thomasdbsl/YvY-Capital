# Decision log W4

Ce journal est pret a recevoir les validations officielles. Aucune ligne n'est marquee approuvee sans preuve formelle.

| ID | Sujet | Option proposee | Statut | Decisionnaire | Date | Conditions / preuve attendue | Impact backlog | Baseline |
|---|---|---|---|---|---|---|---|---|
| D1 | Profils et priorite | Direction, gestion et Analyste data ; priorite a confirmer | Pending partner validation | A valider | A valider | compte rendu de gate | S3-06, S3-07 | branche de remediation, commit final a renseigner |
| D2 | Ecrans MVP | inventaire consolide en navigation simple | Pending partner validation | A valider | A valider | prototype revu et observations bornees | S3-06, S3-07 | branche de remediation, commit final a renseigner |
| D3 | KPI et tolerances | K01-K16 MVP ; H01-H08 avec controles/dependances | Pending partner validation | A valider | A valider | catalogue et seuils signes | S3-03, S3-08, S3-09 | `data/contracts/kpi_catalog.json` |
| D4 | Univers et bridge | 7 fonds snapshot, 14 historiques ; bridge reste hypothese | Pending partner validation | A valider | A valider | registre autorise | S3-06 | `source_matrix.md` |
| D5 | Sources et acces | dossier controle en preuve ; canal cible a confirmer | Pending partner validation | A valider | A valider | matrice d'acces et source owner | S3-01, S3-02 | `data_manifest.example.json` |
| D6 | Pairs | adaptateur synthetique si source non certifiee | Pending partner validation | A valider | A valider | univers versionne et nettoye | S3-09 / Sprint 4 | contrat H07 |
| D7 | Confidentialite et depot | sorties synthetiques ; migration GitLab autorisee | Pending partner validation | A valider | A valider | depot prive, droits et branche protegee | toutes stories | `security_incident_response.md` |
| D8 | Outil Serving | architecture decouplee ; outil final reporte | Pending partner validation | A valider | A valider | contraintes IT | Sprint 4-5 | ADR-002 |

## Mode de mise a jour

Lors du gate, completer uniquement a partir d'une preuve officielle : option retenue, statut, role decisionnaire, date, lien interne vers le compte rendu, conditions et commit baseline dans l'espace autorise. Une non-decision ne bloque pas les travaux techniques independants ; elle maintient l'etat `hypothesis` ou `unavailable` dans l'application.
