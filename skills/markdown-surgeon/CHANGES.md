# Changes — markdown-surgeon

| Start | End | Reference |
|-------|-----|-----------|
| 2026-01-19 | 2026-01-20 | - |

> CLI `md` pour manipuler des fichiers Markdown par section, optimisé pour les agents LLM

---

## Functional Changes

### Commandes de base
- `outline` : liste les sections avec ID, niveau et ligne
- `read` : lit le contenu d'une section par ID
- `write` : remplace le contenu d'une section
- `append` : ajoute du contenu à une section (ou au fichier si pas d'ID)
- `empty` : vide une section (garde le header)
- `remove` : supprime une section et ses sous-sections
- `search` : recherche un pattern, retourne les lignes matchées
- `concat` : concatène plusieurs fichiers markdown

### Commandes meta/create
- `meta` : lit/écrit le frontmatter YAML avec notation pointée (`author.name`)
- `meta --h1` : retourne le titre h1 du fichier
- `create` : crée un nouveau fichier avec frontmatter et/ou titre optionnels

### Options globales
- `--deep` : inclut les sous-sections dans l'opération
- `--before` : insère avant (au lieu d'après)
- `--json` : sortie JSON structurée au lieu de texte
- `--after ID --last --count` : filtre les sous-sections dans `outline`

### Magic expressions
Expansées dans `write`, `append`, `meta --set`, `create` :
- `{datetime}` / `{dt}` → ISO 8601 avec TZ locale
- `{datetime:short}` / `{dt:short}` → `YYYY-MM-DD HH:mm`
- `{date}` → `YYYY-MM-DD`
- `{time}` → `HH:MM:SS`
- `{meta:key}` → valeur du frontmatter (supporte nested)

### Section IDs
- Hash SHA-256 de `${level}:${title.toLowerCase().trim()}:${occurrence}` tronqué à 8 chars
- Occurrence index pour gérer les titres dupliqués

## Architecture

**Structure modulaire TypeScript/Deno** :
- `md` : point d'entrée avec shebang Deno
- `src/mod.ts` : CLI et orchestration des commandes
- `src/core/parser.ts` : parsing markdown, gestion des sections
- `src/core/yaml.ts` : parsing/serialisation YAML minimal
- `src/core/magic.ts` : expansion des expressions magiques
- `src/core/hash.ts` : calcul des IDs de section
- `src/core/types.ts` : types partagés

**Version Python alternative** :
- `md.py` : implémentation single-file (866 lignes)
- Même interface CLI, même comportement
- Zero dépendance externe

**Documentation à 3 niveaux** :
- `SKILL.md` : exemples pour agents (~75 lignes)
- `reference.md` : edge cases uniquement (~25 lignes)
- `reference-api.md` : doc complète CLI + API TS (~280 lignes)

## Technical

- Runtime : Deno avec `--allow-read --allow-write`
- Alternative Python 3.10+ (stdlib uniquement)
- Sortie texte compacte par défaut (optimisée tokens)
- Sortie JSON optionnelle (`--json`)
- Erreurs sur stderr au format `error: <code>\n<message>`

---

*Last updated: 2026-01-20 12:30*
