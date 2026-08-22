# ADR-004 - Run de preuve deterministe

- **Statut :** Proposed - Pending partner validation
- **Contexte :** l'audit ne pouvait pas reproduire `SPRINT2-WF-001`.
- **Decision proposee :** pipeline Python sans dependance externe, configuration canonique, horodatage logique fixe pour les fixtures et serialisation JSON stable.
- **Consequences :** deux executions produisent les memes empreintes ; les horodatages reels restent dans les journaux locaux non partageables.
- **Alternative :** notebook manuel, refuse car difficile a rejouer et a tester.
