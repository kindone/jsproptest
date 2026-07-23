# Generators

Generators are the foundation of property-based testing in `jsproptest`. They are responsible for creating the diverse range of random (or sometimes specific) input data that is fed into your properties during testing. By defining how data should be generated – its type, constraints, and structure – generators allow `jsproptest` to explore the input space of your functions effectively, searching for edge cases and potential bugs that manually chosen examples might miss. Generators can range from simple primitives like booleans and numbers to complex, nested data structures built by combining other generators.

## Generator Summary Table

| Generator                 | Description                                                     | Key Parameters                                     | Example Usage                                         |
| :------------------------ | :-------------------------------------------------------------- | :------------------------------------------------- | :---------------------------------------------------- |
| **Primitives**            |                                                                 |                                                    |                                                       |
| `Gen.boolean()`           | Generates `true` or `false`.                                    | `trueProb` (def: 0.5)                              | `Gen.boolean()`                                       |
| `Gen.float()`             | Generates finite IEEE-754 floating-point numbers by default.    | `{ nanProb, posInfProb, negInfProb }`              | `Gen.float()`                                         |
| `Gen.interval(min, max)`  | Generates integers in the range `[min, max]`.                   | `min`, `max`                                       | `Gen.interval(0, 10)`                                 |
| `Gen.inRange(min, max)`  | Generates integers in the range `[min, max)`.                                       | `min`, `max`                                       | `Gen.inRange(0, 10)`                                 |
| `Gen.ascii()`             | Generates single ASCII characters (code 0-127).                 | -                                                  | `Gen.ascii()`                                         |
| `Gen.unicode()`           | Generates single Unicode characters.                            | -                                                  | `Gen.unicode()`                                       |
| `Gen.printableAscii()`    | Generates single printable ASCII characters.                    | -                                                  | `Gen.printableAscii()`                                |
| `Gen.string(minL, maxL)`  | Generates strings (defaults to ASCII).                          | `minLength` (def: 0), `maxLength` (def: 10)        | `Gen.string(0, 5)`                                    |
| `Gen.asciiString(...)`    | Generates strings containing only ASCII chars (0-127).          | `minLength` (def: 0), `maxLength` (def: 10)        | `Gen.asciiString(1, 8)`                               |
| `Gen.unicodeString(...)`  | Generates strings containing Unicode chars.                     | `minLength` (def: 0), `maxLength` (def: 10)        | `Gen.unicodeString(1, 8)`                             |
| `Gen.printableAsciiString(...)` | Generates strings containing only printable ASCII chars.  | `minLength` (def: 0), `maxLength` (def: 10)        | `Gen.printableAsciiString(5, 5)`                      |
| **Containers**            |                                                                 |                                                    |                                                       |
| `Gen.array(elem, minL, maxL)` | Generates arrays with elements from `elem` (positional form). | `elementGen`, `minLength` (def: 0), `maxLength` (def: 20) | `Gen.array(Gen.boolean(), 2, 4)`                      |
| `Gen.array({ elemGen, minSize?, maxSize? })` | Config-object form of `Gen.array`.              | `ArrayGenConfig<T>`                                | `Gen.array({ elemGen: Gen.interval(0, 9), maxSize: 5 })` |
| `Gen.uniqueArray(elem, minL, maxL)` | Generates sorted arrays with unique elements (positional). | `elementGen`, `minLength` (def: 0), `maxLength` (def: 20) | `Gen.uniqueArray(Gen.interval(1, 10), 3, 3)`          |
| `Gen.uniqueArray({ elemGen, minSize?, maxSize? })` | Config-object form of `Gen.uniqueArray`.    | `ArrayGenConfig<T>`                                | `Gen.uniqueArray({ elemGen: Gen.interval(0, 99), minSize: 2 })` |
| `Gen.set(elem, minS, maxS)`   | Generates `Set` objects (positional form).                | `elementGen`, `minSize` (def: 0), `maxSize` (def: 20)   | `Gen.set(Gen.interval(1, 3), 1, 3)`                   |
| `Gen.set({ elemGen, minSize?, maxSize? })` | Config-object form of `Gen.set`.                  | `SetGenConfig<T>`                                  | `Gen.set({ elemGen: Gen.interval(0, 99), maxSize: 5 })` |
| `Gen.string(minL, maxL, charGen?)` | Generates strings (positional form, defaults to ASCII).  | `minLength` (def: 0), `maxLength` (def: 20), `charGen?` | `Gen.string(0, 5)`                                    |
| `Gen.string({ minSize?, maxSize?, charGen? })` | Config-object form of `Gen.string`.             | `StringGenConfig`                                  | `Gen.string({ minSize: 2, maxSize: 8 })`              |
| `Gen.dict(keyGen, valGen, minS, maxS)` | Generates objects (positional form, alias `Gen.dictionary`). | `keyGen`, `elemGen`, `minSize` (def: 0), `maxSize` (def: 20) | `Gen.dict(Gen.string(1, 2), Gen.interval(0, 5), 2, 5)` |
| `Gen.dict({ keyGen, elemGen, minSize?, maxSize? })` | Config-object form of `Gen.dict`.              | `DictGenConfig<T>`                                 | `Gen.dict({ keyGen: Gen.string(1,4), elemGen: Gen.boolean() })` |
| `Gen.tuple(...gens)`      | Generates fixed-size arrays (tuples) from `gens`.             | `...elementGens`                                   | `Gen.tuple(Gen.number(), Gen.string())`             |
| **Special**               |                                                                 |                                                    |                                                       |
| `Gen.just(value)`         | Always generates the provided `value`.                          | `value`                                            | `Gen.just(null)`                                      |
| `Gen.lazy(() => value)`   | Defers execution of a function to produce `value` until needed. | `valueFactory: () => T`                            | `Gen.lazy(() => expensiveCalculation())`              |

*(Defaults for length/size are typically 0 and 10, but check implementation for specifics)*

## Examples

Here are some more detailed examples illustrating how to use various generators:

**`Gen.float()`**

Generates finite IEEE-754 floating-point numbers, including very large values and subnormals. Special values are opt-in through probability configuration:

```typescript
Gen.float(); // finite only
Gen.float({ nanProb: 0.05, posInfProb: 0.02, negInfProb: 0.02 });
```

**`Gen.string()`**

Generates strings. You can control the character set and length using either positional arguments or a config object.

```typescript
// Positional form
Gen.string(5, 10);            // ASCII strings of length 5–10
Gen.unicodeString(3, 3);      // Unicode strings of exactly length 3
Gen.printableAsciiString(0, 5);

// Config-object form (all fields optional, defaults: minSize=0, maxSize=20, charGen=ASCII)
Gen.string({});                         // 0–20 ASCII chars
Gen.string({ minSize: 2, maxSize: 8 }); // 2–8 ASCII chars
Gen.string({ maxSize: 5, charGen: Gen.printableAscii }); // printable ASCII, 0–5 chars
```

**`Gen.array()`**

Generates arrays where each element is created by the provided element generator. Both a positional form and a config-object form are supported; the positional form is unchanged for backward compatibility.

```typescript
// Positional form
Gen.array(Gen.boolean(), 2, 5);
Gen.array(Gen.string(1, 3), 0, 10);

// Config-object form (minSize defaults to 0, maxSize defaults to 20)
Gen.array({ elemGen: Gen.boolean() });                        // 0–20 elements
Gen.array({ elemGen: Gen.interval(0, 9), minSize: 2, maxSize: 5 });
Gen.array({ elemGen: Gen.string(1, 4), maxSize: 3 });         // minSize defaults to 0
```

**`Gen.set()`** and **`Gen.uniqueArray()`**

Same dual-form API as `Gen.array()`:

```typescript
Gen.set({ elemGen: Gen.interval(0, 99), minSize: 1, maxSize: 5 });
Gen.uniqueArray({ elemGen: Gen.interval(0, 99), minSize: 2 });  // maxSize defaults to 20
```

**`Gen.dict()`** (alias: `Gen.dictionary()`)

Generates objects (dictionaries) with string keys generated by `keyGen` and values generated by `elemGen`. Supports both positional and config-object forms.

```typescript
// Positional form
Gen.dict(Gen.string(1, 2), Gen.interval(0, 5), 2, 5);

// Config-object form (minSize defaults to 0, maxSize defaults to 20)
Gen.dict({ keyGen: Gen.string(1, 4), elemGen: Gen.boolean() });
Gen.dict({ keyGen: Gen.string(1, 2), elemGen: Gen.interval(0, 99), minSize: 1, maxSize: 5 });

// Config interfaces are exported for TypeScript users
import type { ArrayGenConfig, SetGenConfig, StringGenConfig, DictGenConfig } from 'jsproptest';
```

**`Gen.tuple()`**

Generates fixed-size arrays (tuples) with elements of potentially different types, determined by the sequence of generators provided.

```typescript
// Generates pairs of [boolean, number]
// e.g., [true, 15], [false, -3.1]
Gen.tuple(Gen.boolean(), Gen.float());

// Generates triples of [string, integer, string]
// e.g., ["hello", 5, "world"], ["", -100, "test"]
Gen.tuple(Gen.string(0, 5), Gen.interval(-100, 100), Gen.string(1, 4));
```

**`Gen.just(value)`**

A generator that *always* produces the exact `value` provided. Useful for including specific edge cases or constants in your generated data mix (often used with `Gen.oneOf`).

```typescript
// Always generates the number 42
Gen.just(42);

// Always generates null
Gen.just(null);
```

**`Gen.lazy(() => value)`**

Defers the execution of a function that produces a value `T`. The function is only called when the generator's `generate` method is invoked. This is useful for delaying expensive computations or breaking simple circular dependencies in definitions, **but note that the provided function `() => T` does not receive a `Random` instance, making this unsuitable for defining randomly generated recursive structures.**

```typescript
// Example: Deferring an expensive calculation
function expensiveCalculation(): number {
  // ... imagine complex logic here ...
  return result;
}

const lazyResultGen = Gen.lazy(expensiveCalculation);
```

Beyond the built-in generators, `jsproptest` provides **combinators**: functions that transform or combine existing generators to create new, more complex ones. This is how you build generators for your specific data types and constraints.

These combinators are essential tools for tailoring data generation precisely to your testing needs. For a comprehensive guide on how to use them, see the [Combinators](./combinators.md) documentation.
