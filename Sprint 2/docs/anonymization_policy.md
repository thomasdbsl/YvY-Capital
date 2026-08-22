# Politique d'anonymisation et d'identifiants

## Decision appliquee aux sorties partageables

Les ISIN, CNPJ et identifiants internes sont classes `private_identifier`. Ils ne sont jamais conserves dans le code, les fixtures, les captures, les logs partageables, les tables Serving de demonstration ou les exports Git. Cette regle remplace toute indication anterieure suggerant qu'un ISIN prive pouvait etre conserve.

## Traitement par zone

| Zone | Noms | Identifiants prives | Valeurs source | Acces |
|---|---|---|---|---|
| Raw local | originaux autorises | autorises si necessaires | originales | espace restreint, jamais Git |
| Silver local | alias `FUND_XX`, `EMET_XX`, `CUSTO_XX` | token irreversible local | normalisees | equipe data autorisee |
| Gold local | alias stables | exclus sauf besoin documente et zone restreinte | agregats metier | role metier autorise |
| Serving prototype | alias synthetiques | interdits | synthetiques | demonstration locale |
| Logs partageables | alias seulement | interdits | compteurs uniquement | depot de code autorise |

## Exigences automatisables

- Le denylist scan est bloquant avant publication.
- Les motifs d'identifiants prives et le marqueur de test `PRIVATE_ID_TEST_001` doivent produire une anomalie bloquante.
- La table de correspondance d'alias ne doit pas etre commitee.
- Les logs n'enregistrent jamais une ligne source complete.
- Les erreurs indiquent un `source_record_id` opaque, pas la valeur fautive.
- Toute exception exige un besoin metier, une duree, un responsable de zone et une validation formelle.

## Statut des points ouverts

La politique de sortie partageable ci-dessus est appliquee techniquement. La duree de retention, le chiffrement de la table d'alias et les roles de production restent `Pending partner validation`.
