# Shrinking

When `forAll` detects a failing test case, it automatically tries to *shrink* the failing input to a simpler version that still causes the failure. This helps pinpoint the root cause without requiring manual test reduction.

- Shrinking is automatic — no configuration needed for standard use cases.
- The error message includes both the original failing input and the final shrunk input.
- All built-in generators and combinators support shrinking out of the box.

```typescript
it('fails and shrinks', () => {
    // Generator for pairs [a, b] where a <= b
    const pairGen = Gen.interval(0, 1000)
        .flatMap(a => Gen.tuple(Gen.just(a), Gen.interval(a, 1000)));

    expect(() =>
        forAll(
            (tup: [number, number]) => tup[1] - tup[0] <= 5,
            pairGen
        )
    ).toThrow();
    // Error will show a shrunk pair close to [0, 6] rather than e.g. [412, 987]
});
```

&nbsp;

## How Shrinking Works

Each generated value carries a *shrink tree*: a lazy tree of progressively simpler candidate values. When a property fails, `forAll` walks this tree depth-first, keeping the first candidate that still fails, until no simpler failing candidate exists.

The result is a locally-minimal counterexample — the smallest value reachable by the shrinker given the generator's shrink tree structure.

&nbsp;

## Shrinkability by Type

Each built-in generator defines what "simpler" means for its type:

| Type | Simpler means | Strategy |
|------|---------------|----------|
| **boolean** | `false` is simpler than `true` | `false` → `true` |
| **integer** (`Gen.interval`) | Smaller absolute value | Binary search toward `0`, or toward the bound if both bounds share a sign |
| **float** (`Gen.float`) | Smaller magnitude, fewer significant digits, closer to an integer | Shrink exponent, then fraction, then integerify |
| **string** (`Gen.string`) | Fewer characters, lower codepoints | Length binary-search first, then per-codepoint shrinking |
| **array** (`Gen.array`) | Fewer elements, simpler element values | Membership shrinking (front-first removal) then element-wise shrinking |
| **set** (`Gen.set`) | Fewer elements | Membership shrinking only; element values do not shrink (see [note below](#genset-element-values)) |
| **tuple** (`Gen.tuple`) | Simpler elements | Each element shrinks independently, explored sequentially by position |
| **constructed** (`Gen.construct`) | Simpler constructor arguments | Same as tuple applied to constructor args |

&nbsp;

## Combinator Shrink Behavior

How a combinator is written determines what shrink axes exist and in what order they are explored. Understanding this is important when building generators for complex types.

### `map`

Preserves the source generator's shrink tree exactly, projecting each node through the transform function. No new shrink axes are introduced.

```typescript
const gen = Gen.interval(0, 100).map(n => n * 2)
// Shrinks: 200 → 100 → 50 → ... (same binary-search tree, values doubled)
```

### `flatMap` and `chain`

Two shrink axes exist: the **T-axis** (shrink the input value, regenerate the dependent output) and the **U-axis** (hold the input fixed, shrink the output in place).

**T-axis first, both axes reachable.** T-axis shrinks appear first (try simpler contexts before refining the result), and U-axis shrinks are appended at every T-axis node — including the root. Both axes are fully reachable from the initial failing value.

```typescript
const gen = Gen.interval(1, 5)              // T = size
    .flatMap(n => Gen.array(Gen.interval(0, 9), n, n))  // U = array of that size

// Root (T=5, U=[7,3,1,9,2]): children include
//   T-axis: T=3,[...], T=4,[...]  (T shrinks, U regenerated)
//   U-axis: T=5,[3,3,1,9,2], T=5,[0,3,1,9,2], ...  (T fixed, U elements shrink)
```

**Controlling the strategy with `Gen.noShrink`:**

```typescript
// Suppress T shrinking → only U axis remains
// Useful when T is a configuration that should stay fixed
const gen = Gen.noShrink(Gen.interval(1, 5))
    .flatMap(n => Gen.array(Gen.interval(0, 9), n, n))
// All shrinks reduce the array contents, T stays at generated value
```

### `filter`

Prunes the shrink tree: any candidate that fails the predicate is removed. This is correct by definition, but it means a simpler valid value that is only reachable through an invalid intermediate will be missed.

```typescript
const gen = Gen.interval(0, 100).filter(n => n % 7 === 0)
// Shrinks toward 0, but only steps that are multiples of 7 are kept
// Values reachable only via non-multiples of 7 are silently skipped
```

### `aggregate`

Implemented as `interval(minSize, maxSize).flatMap(size → chain of size steps)`.
The **size** is T and the **final generated value** is U. Both axes are reachable from the root: size shrinks first (T-axis) with the final value's own shrinks appended at every size node (U-axis).

### `accumulate`

Builds an array of all intermediate values. Array **length** shrinks first (binary-search toward `minSize`); the **last element's** own shrinks are appended at every length node — not just the minimum.

```typescript
const gen = Gen.interval(1, 10).accumulate(n => Gen.interval(n, n + 5), 1, 5)
// Root [a,b,c,d,e] children include:
//   Length-axis: [a,b,c,d], [a,b,c], [a,b], [a]    (T = length shrinks)
//   Element-axis: [a,b,c,d,shrunk_e], ...           (same length, last elem shrinks)
// Element shrinks are reachable at every array length, not just minimum
```

The prefix is always preserved: when length shrinks from N to K, the first K elements are identical to those generated in the original run (no regeneration).

### `noShrink`

Strips all shrinks from a generator. The generated distribution is unchanged; shrink candidates are removed entirely.

```typescript
const seedGen = Gen.noShrink(Gen.interval(0, 1000))
// seedGen always produces the same value as Gen.interval(0, 1000) would,
// but the Shrinkable carries no shrink children.
```

**Composition with `flatMap`:** when T has no shrinks, all of the resulting generator's shrinks come from the U-axis.

```typescript
// Only U (array elements) will shrink; the size T is locked
const gen = Gen.noShrink(Gen.interval(1, 5))
    .flatMap(n => Gen.array(Gen.interval(0, 9), n, n))
```

This is useful when the outer context (T) should not change during shrinking — for example, when T is a seed, a schema version, or a structural parameter whose value is already known to be relevant.

### `Gen.tuple` and `Gen.construct`

All element axes are reachable. They are explored sequentially by index: the first element's shrinks are tried before the second's, and so on.

```typescript
const gen = Gen.tuple(Gen.interval(0, 10), Gen.string())
// First: shrink the number. Then: shrink the string.
```

&nbsp;

## Known Limitations

### `Gen.set`: element values

`Gen.set` only shrinks by **removing elements** (membership shrinking). The *values* of remaining elements are not shrunk, because shrinking an element's value could produce a duplicate that already exists in the set, collapsing the set size and violating the uniqueness invariant.

```typescript
const gen = Gen.set(Gen.interval(0, 100), 1, 5)
// {73, 41, 88} → {73, 41} → {73} — set size shrinks ✓
// Element values 73, 41, 88 are never reduced — by design
```

`Gen.array` does not have this constraint and shrinks both membership and element values.

### `filter`: path pruning

Simpler values that are only reachable through intermediate values which fail the predicate will not be found. For better shrinking with constraints, consider building a generator that naturally produces constrained values rather than filtering after the fact.

&nbsp;

## Shrink Behavior Summary

The table below summarizes shrink axis coverage for all combinators:

| Combinator | Axes present | All axes reachable from root? | Notes |
|---|---|---|---|
| `map` | T-axis only | ✅ | Preserves tree, no new axes |
| `filter` | T-axis (pruned) | ⚠️ | Valid values behind invalid intermediates are missed |
| `flatMap` / `chain` | T-axis + U-axis | ✅ | T-first; U-axis appended at every T node including root |
| `aggregate` | Size-axis + final-value-axis | ✅ | Inherits flatMap fix |
| `accumulate` | Length-axis + last-element-axis | ✅ | Element shrinks at every length node; prefix preserved by slicing |
| `noShrink` | None | ✅ | No shrinks by design; use to suppress context shrinking in `flatMap` |
| `just` | None | ✅ | No shrinking by design |
| `oneOf` | Selected generator's axes | ✅ | No cross-generator shrinking |
| `Gen.array` | Membership + element-wise | ✅ | Both axes active |
| `Gen.set` | Membership only | ⚠️ | Element values don't shrink — uniqueness invariant prevents it |
| `Gen.string` | Length + codepoints | ✅ | Both axes active by default |
| `Gen.tuple` | Per-element axes | ✅ | Sequential by index; all eventually reachable |
| `Gen.construct` | Per-arg axes | ✅ | Same as tuple applied to constructor args |

&nbsp;

## Stateful Test Shrinking

Stateful tests (sequences of actions applied to a stateful object) have their own three-phase shrink strategy — sequence length → initial object → last action parameters. See [Stateful Testing — Shrinking](stateful-testing.md#shrinking) for details.

&nbsp;

## Related Topics

- [Generators](generators.md) — Built-in generators and their shrink strategies
- [Combinators](combinators.md) — Generator combinators
- [Properties](properties.md) — Using `forAll` and property configuration
- [Stateful Testing](stateful-testing.md) — Stateful shrink phases and ordering
