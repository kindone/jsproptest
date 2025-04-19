# Generators (`Gen`)

Generators are the foundation of property-based testing in `jsproptest`. They are responsible for creating the diverse range of random (or sometimes specific) input data that is fed into your properties during testing. By defining how data should be generated – its type, constraints, and structure – generators allow `jsproptest` to explore the input space of your functions effectively, searching for edge cases and potential bugs that manually chosen examples might miss. Generators can range from simple primitives like booleans and numbers to complex, nested data structures built by combining other generators.

## Generator Summary Table

| Generator                 | Description                                                     | Key Parameters                                     | Example Usage                                         |
| :------------------------ | :-------------------------------------------------------------- | :------------------------------------------------- | :---------------------------------------------------- |
| **Primitives**            |                                                                 |                                                    |                                                       |
| `Gen.boolean()`           | Generates `true` or `false`.                                    | -                                                  | `Gen.boolean()`                                       |
| `Gen.float()`             | Generates floating-point numbers (incl. `Infinity`, `NaN`).     | -                                                  | `Gen.float()`                                         |
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
| `Gen.array(elem, minL, maxL)` | Generates arrays with elements from `elem`.                   | `elementGen`, `minLength` (def: 0), `maxLength` (def: 10) | `Gen.array(Gen.boolean(), 2, 4)`                      |
| `Gen.uniqueArray(elem, minL, maxL)` | Generates arrays with unique elements from `elem`.    | `elementGen`, `minLength` (def: 0), `maxLength` (def: 10) | `Gen.uniqueArray(Gen.interval(1, 10), 3, 3)`          |
| `Gen.set(elem, minS, maxS)`   | Generates `Set` objects with elements from `elem`.            | `elementGen`, `minSize` (def: 0), `maxSize` (def: 10)   | `Gen.set(Gen.interval(1, 3), 1, 3)`                   |
| `Gen.dictionary(val, minS, maxS)` | Generates objects with string keys and values from `val`. | `valueGen`, `minSize` (def: 0), `maxSize` (def: 10)   | `Gen.dictionary(Gen.string(1, 1), 2, 5)`              |
| `Gen.tuple(...gens)`      | Generates fixed-size arrays (tuples) from `gens`.             | `...elementGens`                                   | `Gen.tuple(Gen.number(), Gen.string())`             |
| **Special**               |                                                                 |                                                    |                                                       |
| `Gen.just(value)`         | Always generates the provided `value`.                          | `value`                                            | `Gen.just(null)`                                      |
| **Advanced**              |                                                                 |                                                    |                                                       |
| `Gen.lazy(() => gen)`     | Defers creation of a generator until needed.                    | `generatorFactory`                                 | `Gen.lazy(() => Gen.interval(0, 5))`                  |

*(Defaults for length/size are typically 0 and 10, but check implementation for specifics)*

## Examples

Here are some more detailed examples illustrating how to use various generators:

**`Gen.float()`**

Generates standard floating-point numbers, but also includes special values crucial for testing numerical robustness:

```typescript
// Can produce: 3.14, -0.0, Infinity, -Infinity, NaN
Gen.float();
```

**`Gen.string()`**

Generates strings. You can control the character set and length.

```typescript
// Generates ASCII strings of length 5 to 10
Gen.string(5, 10); // Default character set is printable ASCII

// Generates Unicode strings of exactly length 3
Gen.unicodeString(3, 3);

// Generates printable ASCII strings of length 0 to 5
Gen.printableAsciiString(0, 5);
```

**`Gen.array()`**

Generates arrays where each element is created by the provided element generator.

```typescript
// Generates arrays of 2 to 5 booleans
// e.g., [true, false], [false, false, true, true]
Gen.array(Gen.boolean(), 2, 5);

// Generates arrays of 0 to 10 strings, each 1-3 chars long
Gen.array(Gen.string(1, 3), 0, 10);
```

**`Gen.dictionary()`**

Generates objects (dictionaries) with string keys and values generated by the provided value generator.

```typescript
// Generates objects with 1 to 3 key-value pairs,
// where keys are strings (default from dictionary) and values are floats.
// e.g., { "a": 1.2, "b": -Infinity }, { "key": 10.0 }
Gen.dictionary(Gen.float(), 1, 3);
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

**`Gen.lazy(() => gen)`**

Defers the creation of a generator. This is essential for defining recursive data structures where a generator might need to refer to itself indirectly.

```typescript
// Example: Generating a simple JSON-like structure
const jsonValueGen: Gen<any> = Gen.lazy(() => Gen.oneOf(
  Gen.boolean(),
  Gen.float(),
  Gen.string(0, 5),
  Gen.just(null),
  Gen.array(jsonValueGen, 0, 3), // Recursive use
  Gen.dictionary(jsonValueGen, 0, 3) // Recursive use
));

// Now jsonValueGen can generate nested structures like:
// [true, {"key": null, "nested": [1.0]}]
```

Beyond the built-in generators, `jsproptest` provides **combinators**: functions that transform or combine existing generators to create new, more complex ones. This is how you build generators for your specific data types and constraints.

For instance, the `Gen.lazy` example above uses the `Gen.oneOf` combinator to randomly select one generator from a list (booleans, floats, strings, null, arrays, or dictionaries) to produce a value. Other powerful combinators include `map` (to transform generated values), `chain` (to create dependent generators), and `filter` (to restrict generated values).

These combinators are essential tools for tailoring data generation precisely to your testing needs. For a comprehensive guide on how to use them, see the [Combinators](./combinators.md) documentation. 