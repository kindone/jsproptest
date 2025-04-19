# Combinators

Combinators are higher-order functions that manipulate or combine existing generators (`Gen`) to create new, more sophisticated generators. They are the primary mechanism in `jsproptest` for building generators that produce complex data structures, implement specific constraints, or tailor data generation to the precise needs of your tests. Instead of just using basic generators like `Gen.number()` or `Gen.string()`, combinators allow you to compose these building blocks into generators for custom objects, arrays with specific properties, or data distributions that mimic real-world scenarios. Mastering combinators is key to unlocking the full potential of property-based testing.

## Combinator Summary Table

| Combinator                                   | Description                                                              | Key Parameters                       | Example Usage                                                                 |
| :------------------------------------------- | :----------------------------------------------------------------------- | :----------------------------------- | :---------------------------------------------------------------------------- |
| **Selection**                                |                                                                          |                                      |                                                                               |
| `Gen.oneOf(...gens)`                         | Randomly picks one generator from `gens` to produce a value. Use `weightedGen` to adjust probabilities. | `...generators` (can be `Weighted`)  | `Gen.oneOf(Gen.interval(0, 10), Gen.interval(20,30))` (Union of ranges)                           |
| `Gen.elementOf(...values)`                   | Randomly picks one value from the provided `values`. Use `weightedValue` to adjust probabilities. | `...values` (can be `Weighted`)      | `Gen.elementOf(2, 3, 5, 7)` (Prime numbers < 10)     |
| `Gen.weightedGen(gen, weight)`               | Wraps a generator with a `weight` for `Gen.oneOf`.                       | `generator`, `weight`                | `Gen.weightedGen(Gen.string(), 0.8)` (80% probability)               |
| `Gen.weightedValue(value, weight)`           | Wraps a value with a `weight` for `Gen.elementOf`.                       | `value`, `weight`                    | `Gen.weightedValue('a', 0.2)` (20% probability)                          |
| **Transformation**                           |                                                                          |                                      |                                                                               |
| `generator.map(f)`                           | Applies function `f` to each generated value.                            | `(value: T) => U`                    | `Gen.interval(1,100).map(n => n.toString())` (Stringified numbers within \[1,100\])                             |
| `generator.filter(predicate)`                | Only keeps values where `predicate(value)` is true.                      | `(value: T) => boolean`              | `Gen.integer().filter(n => n % 2 === 0)` (Even numbers)                       |
| `generator.flatMap(f)` / `generator.chain(f)` | Creates a dependent generator using `f(value)` which returns a new Gen. | `(value: T) => Arbitrary<U>`         | `Gen.inRange(1,5).flatMap(n => Gen.string(n))` (String of random length within \[1,5))   |
| **Sequence Building**                        |                                                                          |                                      |                                                                               |
| `generator.accumulate(nextGen, minL, maxL)`  | Builds array where `nextGen(lastValue)` creates the next element.        | `nextGen`, `minL`, `maxL`            | (Chess move based on previous configuration)                                  |
| `generator.aggregate(nextGen, minL, maxL)`   | Builds array where `nextGen(currentArray)` creates the *next array*.     | `nextGen`, `minL`, `maxL`            | (Chess moves aggregated each based on previous configuration)                 |
| **Tuple Chaining**                           |                                                                          |                                      |                                                                               |
| `Gen.chainTuple(tupleGen, nextGen)`          | Appends result of `nextGen(tuple)` to the tuple from `tupleGen`.         | `tupleGen`, `nextGen`                | `Gen.chainTuple(yearMonthTupleGen, ([y,m]) => dayGen(y,m))` \[Y,M,D\]           |
| `tupleGen.chainAsTuple(nextGen)`             | Method-chaining version of `Gen.chainTuple`.                             | `nextGen`                            | `yearTupleGen.chainAsTuple(([y]) => monthGen()).chainAsTuple(([y,m]) => dayGen(y,m))` \[Y,M,D\] |
| **Class Construction**                       |                                                                          |                                      |                                                                               |
| `Gen.construct(Class, ...argGens)`           | Creates class instances using `new Class(...args)` from `argGens`.       | `Constructor`, `...argumentGenerators` | `Gen.construct(Point, Gen.nat(), Gen.nat())` (Construct Point object)       |

## Detailed Combinator Examples

While the table above provides a quick overview, let's explore some common combinators with more illustrative examples.

### `generator.map(f)`

Transforms the output of a generator using a provided function `f`.

```typescript
import { Gen } from 'jsproptest';

// Generate positive integers and map them to their string representation
const positiveIntGen = Gen.interval(1, 1000);
const positiveIntStringGen = positiveIntGen.map(num => String(num));
// Generates strings like "1", "5", "999"

// Generate user objects with an ID and a derived email
const userIdGen = Gen.interval(1, 100);
const userObjectGen = userIdGen.map(id => ({
  id: id,
  email: `user${id}@example.com`
}));
// Generates objects like { id: 42, email: 'user42@example.com' }
```

### `generator.filter(predicate)`

Selects only the values from a generator that satisfy a given `predicate` function. Be cautious: if the predicate is too restrictive, generation might become very slow or fail if it cannot find enough valid values within a reasonable number of attempts.

```typescript
import { Gen } from 'jsproptest';

// Generate only even numbers between 0 and 20
const intervalGen = Gen.interval(0, 20);
const evenNumberGen = intervalGen.filter(n => n % 2 === 0);
// Generates 0, 2, 4, ..., 20

// Generate non-empty strings
const possiblyEmptyStringGen = Gen.string(0, 5);
const nonEmptyStringGen = possiblyEmptyStringGen.filter(s => s.length > 0);
// Generates strings like "a", "hello", but never ""
```

### `generator.flatMap(f)` / `generator.chain(f)`

Creates a *dependent* generator. The function `f` takes a value produced by the initial generator and returns a *new generator*. This is powerful for scenarios where the generation of one value depends on another.

```typescript
import { Gen } from 'jsproptest';

// Generate an array whose length is also randomly generated
const lengthGen = Gen.interval(1, 5); // Generate a length first
const arrayWithRandomLengthGen = lengthGen.flatMap(len =>
  Gen.array(Gen.boolean(), len, len) // Use the generated length
);
// Generates arrays like [true], [false, true, false], [true, true, true, true] etc.

// Generate a pair [x, y] where y > x
const xGen = Gen.interval(0, 10);
const pairGen = xGen.flatMap(x =>
  Gen.interval(x + 1, 20).map(y => [x, y]) // Generate y based on x, then map to pair
);
// Generates pairs like [0, 1], [5, 15], [10, 11], etc.
```

### `Gen.oneOf(...gens)`

Randomly selects one of the provided generators to produce a value for each test case. To control the selection probability, you can wrap generators using `Gen.weightedGen` (see the dedicated section below).

```typescript
import { Gen } from 'jsproptest';

// Generate either a number or a boolean
const numOrBoolGen = Gen.oneOf(
  Gen.interval(-10, 10),
  Gen.boolean()
);
// Generates values like 5, true, -2, false, 0

// Generate specific string constants or a generic short string
const specificOrGeneralStringGen = Gen.oneOf(
  Gen.just(""),        // Empty string
  Gen.just("error"),   // Specific keyword
  Gen.string(1, 5)     // A short random string
);
// Generates "", "error", "abc", "test", etc.
```

### `Gen.elementOf(...values)`

Randomly selects one value from the provided list of literal values. To control the selection probability, you can wrap values using `Gen.weightedValue` (see the dedicated section below).

```typescript
import { Gen } from 'jsproptest';

// Pick a specific HTTP status code
const statusGen = Gen.elementOf(200, 201, 400, 404, 500);
// Generates 200, 404, 500, etc.

// Pick a predefined configuration option
const optionGen = Gen.elementOf('read', 'write', 'admin');
// Generates 'read', 'write', or 'admin'
```

### `Gen.weightedGen(gen, weight)` and `Gen.weightedValue(value, weight)`

Used within `Gen.oneOf` and `Gen.elementOf` respectively to influence the probability of selecting certain generators or values. The `weight` is a positive number between 0.0 and 1.0.

```typescript
import { Gen } from 'jsproptest';

// Generate numbers, but make 0 appear much more often
const weightedNumberGen = Gen.oneOf(
  Gen.weightedGen(Gen.just(0), 0.8),          // 80% chance of getting 0
  Gen.weightedGen(Gen.interval(1, 100), 0.2) // 20% chance of getting 1-100
);
// Generates 0, 0, 5, 0, 42, 0, 0, ...

// Pick a character, biasing heavily towards 'a'
const weightedCharGen = Gen.elementOf(
  Gen.weightedValue('a', 0.8), // 80%
  Gen.weightedValue('b', 0.1), // 10%
  Gen.weightedValue('c', 0.1)  // 10%
);
// Generates 'a' roughly 9 out of 11 times
```

### `Gen.construct(Class, ...argGens)`

Constructs instances of a `Class` by generating arguments for its constructor using the provided `argGens`.

```typescript
import { Gen } from 'jsproptest';

class Point {
  constructor(public x: number, public y: number) {}
}

// Generate Point objects with coordinates between -10 and 10
const pointGen = Gen.construct(
  Point,
  Gen.interval(-10, 10), // Generator for the 'x' argument
  Gen.interval(-10, 10)  // Generator for the 'y' argument
);
// Generates Point instances like new Point(3, -5), new Point(0, 0)
```

### `generator.accumulate(nextGen, minL, maxL)`

Builds an array incrementally. Starts with a value from the initial `generator`, then uses the `nextGen` function, which takes the *last generated value*, to produce the generator for the *next* element. This continues until the array length is between `minL` and `maxL`.

```typescript
import { Gen } from 'jsproptest';

// Generate an array of numbers where each number is >= the previous one
const increasingNumbersGen = Gen.interval(0, 10) // Start with a number 0-10
  .accumulate(
    lastNum => Gen.interval(lastNum, lastNum + 5), // Next number >= last
    3, // Minimum length 3
    6  // Maximum length 6
  );
// Generates arrays like [2, 2, 5], [8, 10, 10, 13], [0, 1, 2, 3, 4, 4]
```

### `generator.aggregate(nextGen, minL, maxL)`

Similar to `accumulate`, but `nextGen` takes the *entire array generated so far* and returns a generator for the *next complete array state*. This is less common but useful for state transformations.

```typescript
import { Gen } from 'jsproptest';

// Generate an array where each element is the sum of the previous two
// (Fibonacci-like sequence, starting with [0, 1])
const fibLikeGen = Gen.just([0, 1]) // Start with the initial array [0, 1]
  .aggregate(
    currentArray => {
      const nextVal = currentArray[currentArray.length - 1] +
                      currentArray[currentArray.length - 2];
      return Gen.just([...currentArray, nextVal]); // Return gen for the next array state
    },
    3, // Minimum length 3
    7  // Maximum length 7
  );
// Generates arrays like [0, 1, 1], [0, 1, 1, 2, 3, 5], [0, 1, 1, 2, 3, 5, 8]
```

### `Gen.chainTuple(tupleGen, nextGen)` / `tupleGen.chainAsTuple(nextGen)`

Appends a new value to a tuple generated by `tupleGen`. The `nextGen` function receives the generated tuple and returns a generator for the value to append. `chainAsTuple` is the method-chaining equivalent.

```typescript
import { Gen } from 'jsproptest';

// Generate a pair [number, string]
const baseTupleGen = Gen.tuple(Gen.interval(1, 5), Gen.string(1, 3));

// Generate a triple [number, string, boolean] where the boolean depends on the number
const extendedTupleGen = Gen.chainTuple(
  baseTupleGen, // Starts with [number, string]
  ([num, str]) => Gen.just(num % 2 === 0) // Appends boolean based on num
);
// Generates tuples like [2, "a", true], [5, "xyz", false]

// Equivalent using method chaining:
const extendedTupleGenMethod = baseTupleGen.chainAsTuple(
  ([num, str]) => Gen.just(num % 2 === 0)
);
// Generates the same kind of tuples: [4, "b", true], [1, "qq", false]
```