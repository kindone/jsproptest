# jsproptest

**Disclaimer:** This documentation is currently under development. Information may be incomplete or inaccurate.

`jsproptest` is a property-based testing (PBT) framework for JavaScript and TypeScript, drawing inspiration from libraries such as Haskell's QuickCheck and Python's Hypothesis. Property-based testing shifts the focus from example-based verification to defining universal *properties* or *invariants* that must hold true across a wide spectrum of generated inputs.

The core workflow involves:
1.  **Defining a property:** A function that takes generated inputs and asserts an expected invariant.
2.  **Specifying generators:** Mechanisms (`Gen`) for creating random data conforming to certain types or constraints, often built by composing simpler generators using **combinators**.
3.  **Execution:** `jsproptest` automatically runs the property function against numerous generated inputs (typically 100+).
4.  **Shrinking:** If a test case fails (the property returns `false` or throws), `jsproptest` attempts to find a minimal counterexample by simplifying the failing input.

Consider verifying the property that reversing an array twice restores the original array:

```typescript
import { forAll, Gen } from 'jsproptest'; // Assuming installation

it('should return the original array after double reversal', () => {
  // forAll executes a property check with generated inputs
  forAll(
    (arr: string[]) => {
      // The property assertion: must hold for any generated 'arr'
      expect([...arr].reverse().reverse()).toEqual(arr);
    },
    Gen.array(Gen.string(0, 10), 0, 10) // Generator producing arrays of strings
  );
  // jsproptest runs this property multiple times with diverse arrays.
});
```

This PBT approach facilitates the discovery of edge cases and intricate bugs that might be missed by traditional, example-driven testing methodologies.

## Core Concepts

Before diving deeper, let's understand the key components:

*   **Generators (`Gen`)**: Produce random data of various types (primitives, containers) according to specified constraints. Think `Gen.interval(0, 100)` for numbers or `Gen.array(Gen.boolean())` for arrays of booleans.
*   **Arbitrary (`Arbitrary`)**: A wrapper around a generator function that takes a `Random` instance and returns a `Shrinkable` value. `Gen` instances are typically subclasses of `Arbitrary`.
*   **Shrinkable**: Represents a generated value and holds logic for generating "smaller" or simpler versions of itself. This is crucial for finding the minimal failing test case when a property fails.
*   **Properties (`Property`, `forAll`)**: Express conditions or invariants that should hold true for generated data. `jsproptest` runs these properties against many generated examples using the `forAll` function or `Property` class methods.

## Generators (`Gen`)

Generators create the sample data used to test your properties.

### Generator Summary Table

| Generator                 | Description                                                     | Key Parameters                                     | Example Usage                                         |
| :------------------------ | :-------------------------------------------------------------- | :------------------------------------------------- | :---------------------------------------------------- |
| **Primitives**            |                                                                 |                                                    |                                                       |
| `Gen.boolean()`           | Generates `true` or `false`.                                    | -                                                  | `Gen.boolean()`                                       |
| `Gen.float()`             | Generates floating-point numbers (incl. `Infinity`, `NaN`).     | -                                                  | `Gen.float()`                                         |
| `Gen.interval(min, max)`  | Generates integers in the range `[min, max]`.                   | `min`, `max`                                       | `Gen.interval(0, 10)`                                 |
| `Gen.integers(min, max)`  | Alias for `Gen.interval`.                                       | `min`, `max`                                       | `Gen.integers(-5, 5)`                                 |
| `Gen.string(minL, maxL)`  | Generates ASCII strings.                                        | `minLength` (def: 0), `maxLength` (def: 10)        | `Gen.string(0, 5)`                                    |
| `Gen.unicodeString(...)`  | Generates Unicode strings.                                      | `minLength` (def: 0), `maxLength` (def: 10)        | `Gen.unicodeString(1, 8)`                             |
| **Containers**            |                                                                 |                                                    |                                                       |
| `Gen.array(elem, minL, maxL)` | Generates arrays with elements from `elem`.                   | `elementGen`, `minLength` (def: 0), `maxLength` (def: 10) | `Gen.array(Gen.boolean(), 2, 4)`                      |
| `Gen.set(elem, minS, maxS)`   | Generates `Set` objects with elements from `elem`.            | `elementGen`, `minSize` (def: 0), `maxSize` (def: 10)   | `Gen.set(Gen.interval(1, 3), 1, 3)`                   |
| `Gen.dictionary(val, minS, maxS)` | Generates objects with string keys and values from `val`. | `valueGen`, `minSize` (def: 0), `maxSize` (def: 10)   | `Gen.dictionary(Gen.string(1, 1), 2, 5)`              |
| `Gen.tuple(...gens)`      | Generates fixed-size arrays (tuples) from `gens`.             | `...elementGens`                                   | `Gen.tuple(Gen.number(), Gen.string())`             |
| **Special**               |                                                                 |                                                    |                                                       |
| `Gen.just(value)`         | Always generates the provided `value`.                          | `value`                                            | `Gen.just(null)`                                      |

*(Defaults for length/size are typically 0 and 10, but check implementation for specifics)*

Beyond the built-in generators, `jsproptest` offers powerful **combinators** that allow you to transform and combine existing generators, enabling the creation of highly specific and complex data structures for your tests.

## Combinators

Combinators modify or combine existing generators to create new ones.

### Combinator Summary Table

| Combinator                                   | Description                                                              | Key Parameters                       | Example Usage                                                                 |
| :------------------------------------------- | :----------------------------------------------------------------------- | :----------------------------------- | :---------------------------------------------------------------------------- |
| **Selection**                                |                                                                          |                                      |                                                                               |
| `Gen.oneOf(...gens)`                         | Randomly picks one generator from `gens` to produce a value.             | `...generators` (can be `Weighted`)  | `Gen.oneOf(Gen.interval(0, 5), Gen.string())`                                 |
| `Gen.elementOf(...values)`                   | Randomly picks one value from the provided `values`.                     | `...values` (can be `Weighted`)      | `Gen.elementOf(1, 2, 3)`                                                      |
| `Gen.weightedGen(gen, weight)`               | Wraps a generator with a `weight` for `Gen.oneOf`.                       | `generator`, `weight`                | `Gen.weightedGen(Gen.boolean(), 0.8)`                                         |
| `Gen.weightedValue(value, weight)`           | Wraps a value with a `weight` for `Gen.elementOf`.                       | `value`, `weight`                    | `Gen.weightedValue('a', 0.9)`                                                 |
| **Transformation**                           |                                                                          |                                      |                                                                               |
| `generator.map(f)`                           | Applies function `f` to each generated value.                            | `(value: T) => U`                    | `Gen.interval(1, 3).map(n => n * n)`                                          |
| `generator.filter(predicate)`                | Only keeps values where `predicate(value)` is true.                      | `(value: T) => boolean`              | `Gen.interval(0, 10).filter(n => n % 2 === 0)`                                |
| `generator.flatMap(f)` / `generator.chain(f)` | Creates a dependent generator using `f(value)` which returns a new Gen. | `(value: T) => Arbitrary<U>`         | `Gen.interval(1, 4).flatMap(n => Gen.string(n, n))`                           |
| **Sequence Building**                        |                                                                          |                                      |                                                                               |
| `generator.accumulate(nextGen, minL, maxL)`  | Builds array where `nextGen(lastValue)` creates the next element.        | `nextGen`, `minL`, `maxL`            | `Gen.nat().accumulate(last => Gen.interval(last, last+1), 2, 5)`              |
| `generator.aggregate(nextGen, minL, maxL)`   | Builds array where `nextGen(currentArray)` creates the *next array*.     | `nextGen`, `minL`, `maxL`            | `Gen.int().map(n=>[n]).aggregate(arr => Gen.just([...arr, arr.length]), 3, 6)` |
| **Tuple Chaining**                           |                                                                          |                                      |                                                                               |
| `Gen.chainTuple(tupleGen, nextGen)`          | Appends result of `nextGen(tuple)` to the tuple from `tupleGen`.         | `tupleGen`, `nextGen`                | `Gen.chainTuple(pairGen, p => Gen.just(p[0]+p[1]))`                           |
| `tupleGen.chainAsTuple(nextGen)`             | Method-chaining version of `Gen.chainTuple`.                             | `nextGen`                            | `pairGen.chainAsTuple(p => Gen.just(p[0]+p[1]))`                              |
| **Class Construction**                       |                                                                          |                                      |                                                                               |
| `Gen.construct(Class, ...argGens)`           | Creates class instances using `new Class(...args)` from `argGens`.       | `Constructor`, `...argumentGenerators` | `Gen.construct(Date, Gen.interval(0, 1e12))`                                  |

## Properties

Properties define the expected behavior of your code over a range of inputs.

### Defining Properties with `new Property(...)`

*   **`new Property<TArgs extends any[]>(predicate: (...args: TArgs) => boolean | void)`**: Creates a property object explicitly. The `predicate` function receives arguments generated according to the generators passed to `forAll`.
    *   If the predicate returns `false` or throws an error, the property fails.
    *   If the predicate returns `true` or `void` (implicitly returns `undefined`), the property passes for that input.

    ```typescript
    // Property: The sum of two non-negative numbers is non-negative
    const sumProperty = new Property((a: number, b: number) => {
        expect(a + b).toBeGreaterThanOrEqual(0); // Using jest assertions
        // Or: return a + b >= 0;
    });

    // Running the property
    sumProperty.setNumRuns(200).forAll(Gen.interval(0, 100), Gen.interval(0, 100));
    ```

*   **`property.setNumRuns(n: number)`**: Configures the number of random test cases to execute when `forAll` is called on a `Property` instance. Returns the `Property` instance for chaining.

*   **`property.example(...args: any[])`**: Runs the property's predicate *once* with the explicitly provided `args`. Useful for debugging specific edge cases.

    ```typescript
    const prop = new Property((a: number, b: number) => a > b);
    prop.example(5, 3); // Runs the predicate with a=5, b=3
    prop.example(3, 5); // returns false
    ```

### Defining and Running Properties with `forAll(...)` (Standalone Function)

*   **`forAll<TArgs extends any[]>(predicate: (...args: TArgs) => boolean | void, ...gens: { [K in keyof TArgs]: Arbitrary<TArgs[K]> })`**: This is the most common and concise way to define and immediately check a property. It implicitly creates and runs the property. You don't need to manually create a `Property` object.

    ```typescript
    // Property: Reversing an array twice yields the original array
    it('should return original array after double reverse', () => {
        forAll(
            (arr: string[]) => {
                // Predicate using Jest assertions
                expect([...arr].reverse().reverse()).toEqual(arr);
            },
            Gen.array(Gen.string(0, 5), 0, 10) // Generator for the 'arr' argument
        ); // Runs the test immediately (default 100 times)
    });

    // Property: String concatenation length
    it('should have correct length after concatenation', () => {
        forAll(
            (s1: string, s2: string) => {
                // Predicate returning a boolean
                return (s1 + s2).length === s1.length + s2.length;
            },
            Gen.string(0, 20), // Generator for s1
            Gen.string(0, 20)  // Generator for s2
        );
    });

    // Property: Absolute value is non-negative
    it('should have non-negative absolute value', () => {
        forAll(
            (num: number) => {
                expect(Math.abs(num)).toBeGreaterThanOrEqual(0);
            },
            Gen.float() // Use float generator
        );
    });

    // Property: Tuple elements follow constraints
    it('should generate tuples with correct constraints', () => {
        forAll(
            ([num, bool]: [number, boolean]) => {
                expect(num).toBeGreaterThanOrEqual(0);
                expect(num).toBeLessThanOrEqual(10);
                expect(typeof bool).toBe('boolean');
            },
            Gen.tuple(Gen.interval(0, 10), Gen.boolean()) // Tuple generator
        );
    });

    // Property: Nested forAll (less common, but possible)
    it('should handle nested properties', () => {
        expect(() =>
            forAll((a: number) => { // Outer property
                forAll((b: number) => { // Inner property
                    // This property fails for large 'a' and small 'b'
                    expect(a > 80 || b < 40).toBe(true)
                }, Gen.interval(0, 1000)) // Generator for 'b'
            }, Gen.interval(0, 1000)) // Generator for 'a'
        ).toThrow(); // We expect this nested structure to fail and throw
    });
    ```
    *Note: The standalone `forAll` runs a default number of times (e.g., 100). To configure the number of runs, you need to use the `new Property(...).setNumRuns(...).forAll(...)` approach.*

### Shrinking

When `forAll` (either standalone or called on a `Property` instance) detects a failing test case, it automatically tries to "shrink" the failing input to a simpler version that still causes the failure. This helps pinpoint the root cause.

*   Shrinking explores smaller integers, shorter strings/arrays, subsets of sets, and simpler structures based on how the generators were defined and combined.
*   The error message thrown by `forAll` on failure typically includes the original failing input and the final, shrunk failing input.

```typescript
// Example where shrinking is useful (using standalone forAll)
it('fails and shrinks with standalone forAll', () => {
    // Generator for pairs [a, b] where a <= b
    const pairGen = Gen.interval(0, 1000)
        .flatMap(a => Gen.tuple(Gen.just(a), Gen.interval(a, 1000)));

    expect(() =>
        forAll(
            (tup: [number, number]) => {
                // This property fails if the difference is large
                return tup[1] - tup[0] <= 5;
            },
            pairGen
        )
    ).toThrow(
        // The error message will likely show a shrunk example,
        // e.g., "property failed (simplest args found by shrinking): ..."
    );
});
```
