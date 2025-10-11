# Generators

Generators are the foundation of property-based testing in `dartproptest`. They are responsible for creating the diverse range of random (or sometimes specific) input data that is fed into your properties during testing. By defining how data should be generated – its type, constraints, and structure – generators allow `dartproptest` to explore the input space of your functions effectively, searching for edge cases and potential bugs that manually chosen examples might miss. Generators can range from simple primitives like booleans and numbers to complex, nested data structures built by combining other generators.

## Generator Summary Table

| Generator                 | Description                                                     | Key Parameters                                     | Example Usage                                         |
| :------------------------ | :-------------------------------------------------------------- | :------------------------------------------------- | :---------------------------------------------------- |
| **Primitives**            |                                                                 |                                                    |                                                       |
| `Gen.boolean()`           | Generates `true` or `false`.                                    | `trueProb` (def: 0.5)                              | `Gen.boolean()`                                       |
| `Gen.float()`             | Generates floating-point numbers (incl. `Infinity`, `NaN`).     | -                                                  | `Gen.float()`                                       |
| `Gen.interval(min, max)`  | Generates integers in the range `[min, max]`.                   | `min`, `max`                                       | `Gen.interval(0, 10)`                                 |
| `Gen.inRange(min, max)`  | Generates integers in the range `[min, max)`.                                       | `min`, `max`                                       | `Gen.inRange(0, 10)`                                 |
| `Gen.ascii()`             | Generates single ASCII characters (code 0-127).                 | -                                                  | `Gen.ascii()`                                       |
| `Gen.unicode()`           | Generates single Unicode characters.                            | -                                                  | `Gen.unicode()`                                       |
| `Gen.printableAscii()`    | Generates single printable ASCII characters.                    | -                                                  | `Gen.printableAscii()`                                |
| `Gen.asciiString(minL, maxL)`  | Generates strings containing only ASCII chars (0-127).                          | `minLength` (def: 0), `maxLength` (def: 10)        | `Gen.asciiString(minLength: 0, maxLength: 5)`                                    |
| `Gen.unicodeString(minL, maxL)`    | Generates strings containing Unicode chars.          | `minLength` (def: 0), `maxLength` (def: 10)        | `Gen.unicodeString(minLength: 1, maxLength: 8)`                               |
| `Gen.printableAsciiString(minL, maxL)`  | Generates strings containing only printable ASCII chars.                     | `minLength` (def: 0), `maxLength` (def: 10)        | `Gen.printableAsciiString(minLength: 1, maxLength: 8)`                             |
| **Containers**            |                                                                 |                                                    |                                                       |
| `Gen.array(elem, minL, maxL)` | Generates arrays with elements from `elem`.                   | `elementGen`, `minLength` (def: 0), `maxLength` (def: 10) | `Gen.array(Gen.boolean(), minLength: 2, maxLength: 4)`                      |
| `Gen.uniqueArray(elem, minL, maxL)` | Generates arrays with unique elements from `elem`.    | `elementGen`, `minLength` (def: 0), `maxLength` (def: 10) | `Gen.uniqueArray(Gen.interval(1, 10), minLength: 3, maxLength: 3)`          |
| `Gen.set(elem, minS, maxS)`   | Generates `Set` objects with elements from `elem`.            | `elementGen`, `minSize` (def: 0), `maxSize` (def: 10)   | `Gen.set(Gen.interval(1, 3), minSize: 1, maxSize: 3)`                   |
| `Gen.dictionary(keyGen, valGen, minS, maxS)` | Generates objects with keys from `keyGen` and values from `valGen`. | `keyGen`, `valueGen`, `minSize` (def: 0), `maxSize` (def: 10)   | `Gen.dictionary(Gen.asciiString(minLength: 1, maxLength: 2), Gen.interval(0, 5), minSize: 2, maxSize: 5)` |
| `Gen.tuple(...gens)`      | Generates fixed-size arrays (tuples) from `gens`.             | `...elementGens`                                   | `Gen.tuple([Gen.float(), Gen.asciiString(minLength: 0, maxLength: 10)])`             |
| **Special**               |                                                                 |                                                    |                                                       |
| `Gen.just(value)`         | Always generates the provided `value`.                          | `value`                                            | `Gen.just(null)`                                      |
| `Gen.lazy(() => value)`   | Defers execution of a function to produce `value` until needed. | `valueFactory: () => T`                            | `Gen.lazy(() => expensiveCalculation())`              |

*(Defaults for length/size are typically 0 and 10, but check implementation for specifics)*

## Examples

Here are some more detailed examples illustrating how to use various generators:

**`floatingGen()`**

Generates standard floating-point numbers, but also includes special values crucial for testing numerical robustness:

```dart
// Can produce: 3.14, -0.0, Infinity, -Infinity, NaN
Gen.float();
```

**String Generators**

Generates strings. You can control the character set and length.

```dart
// Generates ASCII strings of length 5 to 10
Gen.asciiString(minLength: 5, maxLength: 10);

// Generates Unicode strings of exactly length 3
Gen.unicodeString(minLength: 3, maxLength: 3);

// Generates printable ASCII strings of length 0 to 5
Gen.printableAsciiString(minLength: 0, maxLength: 5);
```

**`Gen.array()`**

Generates arrays where each element is created by the provided element generator.

```dart
// Generates arrays of 2 to 5 booleans
// e.g., [true, false], [false, false, true, true]
Gen.array(Gen.boolean(), minLength: 2, maxLength: 5);

// Generates arrays of 0 to 10 strings, each 1-3 chars long
Gen.array(Gen.asciiString(minLength: 1, maxLength: 3), minLength: 0, maxLength: 10);
```

**`Gen.dictionary()`**

Generates objects (dictionaries) with string keys generated by `keyGen` and values generated by the provided `valueGen`.

```dart
// Generates objects with 1 to 3 key-value pairs,
// where keys are 1-char strings (a-z) and values are floats.
// e.g., { "a": 1.2, "b": -Infinity }, { "z": 10.0 }
final keyGen = Gen.asciiString(minLength: 1, maxLength: 1).map((s) => 
    String.fromCharCode(97 + (s.codeUnitAt(0) % 26))); // Generate a-z keys
Gen.dictionary(keyGen, Gen.float(), minSize: 1, maxSize: 3);
```

**`Gen.tuple()`**

Generates fixed-size arrays (tuples) with elements of potentially different types, determined by the sequence of generators provided.

```dart
// Generates pairs of [boolean, number]
// e.g., [true, 15.0], [false, -3.1]
Gen.tuple([Gen.boolean(), Gen.float()]);

// Generates triples of [string, integer, string]
// e.g., ["hello", 5, "world"], ["", -100, "test"]
Gen.tuple([Gen.asciiString(minLength: 0, maxLength: 5), Gen.interval(-100, 100), Gen.asciiString(minLength: 1, maxLength: 4)]);
```

**`Gen.just(value)`**

A generator that *always* produces the exact `value` provided. Useful for including specific edge cases or constants in your generated data mix (often used with `Gen.oneOf`).

```dart
// Always generates the number 42
Gen.just(42);

// Always generates null
Gen.just(null);
```

**`Gen.lazy(() => value)`**

Defers the execution of a function that produces a value `T`. The function is only called when the generator's `generate` method is invoked. This is useful for delaying expensive computations or breaking simple circular dependencies in definitions.

```dart
// Example: Deferring an expensive calculation
int expensiveCalculation() {
  // ... imagine complex logic here ...
  return result;
}

final lazyResultGen = Gen.lazy(expensiveCalculation);
```

Beyond the built-in generators, `dartproptest` provides **combinators**: functions that transform or combine existing generators to create new, more complex ones. This is how you build generators for your specific data types and constraints.

These combinators are essential tools for tailoring data generation precisely to your testing needs. For a comprehensive guide on how to use them, see the [Combinators](./combinators.md) documentation.
