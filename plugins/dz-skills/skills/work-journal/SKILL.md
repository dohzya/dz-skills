---
name: work-journal
description: Automatically maintain work documentation during project tasks. Creates and updates two files - WORKLOG.md (chronological append-only log of attempts, tests, and iterations) and CHANGES.md (curated living document of validated changes). Triggers when starting work that may involve multiple attempts or iterations.
---

# Work Journal

Maintain work documentation during project tasks through two complementary
files.

## Files

| File         | Purpose                                      | Update style                 |
| ------------ | -------------------------------------------- | ---------------------------- |
| `WORKLOG.md` | Chronological trace of what was tried/tested | Append-only                  |
| `CHANGES.md` | Clean summary of validated changes           | Maintained (add/edit/remove) |

## Behavior

### Initialization

When starting work on a project:

1. Check if `WORKLOG.md` and `CHANGES.md` exist at project root
2. **If neither exists**: Ask once whether to track changes (adapt question to
   user's language)
3. **If files exist**: Use them directly

If user declines, don't create files and don't ask again this session.

### Language

Adapt file content to the user's working language. If unclear, ask once at
initialization.

### During Work

**WORKLOG.md** — Append when:

- Testing something
- Trying an approach
- Running into an error or blocker
- Iterating on a solution
- Any notable step, even failures

Keep it lightweight. Can get long, that's expected.

**CHANGES.md** — Update when:

- User validates a change ("ok", "good", "let's keep this", "perfect", "next")
- A functional rule is confirmed
- An architectural decision is locked in

CHANGES.md reflects only validated changes. Edit or remove content if changes
are reverted or superseded.

## WORKLOG.md Format

```markdown
# Worklog

## YYYY-MM-DD HH:mm

- [what was tried/tested/observed]
- [next step, error encountered, iteration...]

## YYYY-MM-DD HH:mm

- [continuing work...]
```

### Guidelines

- **Timestamps reflect when work was done**, not when the file is updated
  - If user asks to update the worklog the next morning for work done the
    previous evening, use the previous evening's time
  - This is a historical trace — accuracy matters
- New H2 header for each significant moment or session
- Bullet points under each header
- **Explain the "why"** — especially for failures and abandoned approaches
- Include errors, dead ends, iterations with enough context to understand later
- No need to be polished, it's a trace — but don't sacrifice clarity for brevity

### Example

```markdown
# Worklog

## 2025-01-14 09:15

- Goal: add multi-currency support on orders
- Checked current Order model — single `total` field, no currency tracking per
  line
- Need to understand how totals are calculated before changing the model

## 2025-01-14 09:35

- First attempt: add `currency` field on OrderLine + group at calculation time
- Problem: OrderValidator expects single total, breaks 12 tests
- Root cause: `OrderValidator.validateTotal()` sums all lines regardless of
  currency, then compares to a single expected total
- Could patch the validator, but it would be fragile — validation logic
  scattered across multiple places

## 2025-01-14 10:01

- New approach: introduce CurrencyBucket to aggregate lines by currency before
  validation
- Rationale: keeps validation logic centralized, each bucket validates
  independently
- Implemented CurrencyBucket + updated OrderValidator to iterate buckets
- All tests pass, validator logic cleaner than before
- User validated the approach

## 2025-01-14 10:45

- Added rule: total per currency must be > 0
- Edge case found: order with lines canceling out in one currency (e.g., +100
  EUR, -100 EUR)
- Discussed with user: this should be an error, not silently accepted
- New error code: MIXED_CURRENCY_ZERO_BALANCE
- User approved the behavior
```

## CHANGES.md Format

```markdown
# Changes — [Feature/Context Name]

| Start      | End        | Reference               |
| ---------- | ---------- | ----------------------- |
| YYYY-MM-DD | YYYY-MM-DD | [ticket/issue if known] |

> [Optional: one-line summary]

---

## Functional Changes

[Detailed list of business rule changes, validation rules, user-facing
behavior...]

## Architecture

[New concepts, patterns, major restructuring with rationale...]

## Technical

- [Concise bullets for refactors, dependencies, config...]

---

_Last updated: YYYY-MM-DD HH:mm_
```

### Guidelines

- **"Last updated" uses current time** (when the file is modified), unlike
  WORKLOG timestamps

**Functional Changes** (detailed):

- Validation rules with the actual rule stated
- Behavior changes with before/after if useful
- New error cases, edge cases handled
- Business flow modifications

**Architecture** (detailed for new concepts):

- New patterns with their purpose
- Restructuring with rationale
- Component responsibilities
- Keep it conceptual, not a file list

**Technical** (bullets):

- Significant refactors (name the component)
- Notable dependencies
- Important config changes
- Omit section if nothing notable

### Updating Strategy

This is a living document, not an append-only log:

- **Add** new points when changes are validated
- **Modify** existing points if behavior evolves
- **Remove** points that were reverted or superseded
- **Restructure** if content becomes unclear

### Example

```markdown
# Changes — Multi-currency order validation

| Start      | End        | Reference |
| ---------- | ---------- | --------- |
| 2025-01-14 | 2025-01-14 | PROJ-1234 |

> Support for orders mixing multiple currencies with per-bucket validation

---

## Functional Changes

- Orders can now mix multiple currencies across line items
- Validation per currency: total per currency must be strictly positive
  - Before: validation only on global total
  - Now: validation per currency "bucket"
- New error case `MIXED_CURRENCY_ZERO_BALANCE` when a currency nets to zero
- Single-currency orders unaffected (same validation path)

## Architecture

Introduced **CurrencyBucket** concept:

- Aggregates order lines by currency before validation
- Enables currency-specific validation rules
- `OrderValidator` delegates to `CurrencyValidationPolicy` for multi-currency
  rules

## Technical

- Refactored `OrderService.validate()`
- Added `currency-utils` package
- New error codes in `error-codes.ts`

---

_Last updated: 2025-01-14 11:30_
```

## Integration Notes

- **Location**: Both files at project root
- **Encoding**: UTF-8
- **On completion**: CHANGES.md serves as base for PR description, changelog, or
  documentation
- **WORKLOG.md**: Can be deleted after completion or kept for reference.
  Consider generating a REX before discarding
