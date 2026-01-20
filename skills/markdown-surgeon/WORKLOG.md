# Worklog

## 2026-01-20 11:00

- Reprise de session après compaction du contexte
- État : magic expressions implémentées, à tester
- Tests magic expressions : `{datetime}`, `{dt}`, `{dt:short}`, `{date}`, `{time}`, `{meta:key}` — tous fonctionnels

## 2026-01-20 11:15

- Implémentation de `outline --after ID --last --count` pour lister les sous-sections
- Test OK : `./md outline /tmp/test-subs.md --after f26a78fa --last` retourne bien la dernière sous-section

## 2026-01-20 11:20

- Ajout de `meta --h1` pour récupérer le titre h1 d'un fichier
- Test OK : `./md meta /tmp/test-meta.md --h1` retourne "Main Content"

## 2026-01-20 11:30

- Nouvelles fonctionnalités demandées par l'utilisateur :
  1. `create` avec contenu initial
  2. `append --before/--after` sans ID (début/fin de fichier)
  3. Alias magic `{dt}`, `{datetime:short}`, `{dt:short}`
  4. `--format=json` pour toutes les commandes
  5. Séparer reference.md en deux fichiers (light pour agents, full pour devs)

## 2026-01-20 11:35

- Implémentation `create` avec contenu initial via argument positional
- Modification de `cmdCreate` pour accepter `content: string | null`

## 2026-01-20 11:40

- Implémentation `append` sans ID :
  - `--before` sans ID → insère après frontmatter
  - Sans `--before` et sans ID → insère à la fin du fichier
- Modification de `cmdAppend` pour accepter `id: string | null`
- Détection automatique : si le 2e argument n'est pas un ID valide (8 hex), c'est du contenu

## 2026-01-20 11:45

- Ajout des alias magic dans `magic.ts` :
  - `{dt}` = `{datetime}`
  - `{dt:short}` et `{datetime:short}` → `YYYY-MM-DD HH:mm`
- Nouvelle fonction `getShortDateTime()`

## 2026-01-20 11:50

- Implémentation `--json` / `--format=json` :
  - Ajout de formatters JSON : `jsonOutline`, `jsonRead`, `jsonMutation`, `jsonSearchMatches`, `jsonSearchSummary`
  - Propagation du flag `json: boolean` à toutes les commandes
  - Tests OK : `./md outline /tmp/test-meta.md --json` retourne du JSON propre

## 2026-01-20 12:00

- Création de la nouvelle structure de documentation :
  - `SKILL.md` : condensé, exemples essentiels (~75 lignes)
  - `reference.md` : quick reference pour agents (~25 lignes, edge cases uniquement)
  - `reference-api.md` : doc complète CLI + API TypeScript pour développeurs (~280 lignes)

## 2026-01-20 12:15

- Demande bonus : créer `md.py`, version Python single-file
- Implémentation complète en 866 lignes :
  - Toutes les commandes
  - Tous les flags
  - Magic expressions
  - YAML parser/serializer minimal intégré
  - Zero dépendance externe
- `chmod +x md.py`
- Tests OK : mêmes résultats que la version Deno
- `uvx pyright md.py` : 0 erreurs, 0 warnings
