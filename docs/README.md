<p align="center">
  <img src="jsproptest.svg" alt="jsproptest logo" width="200"/>
</p>

# jsproptest

**Disclaimer:** This documentation is currently under development. Information may be incomplete or inaccurate.

**Current Version:** 0.5.0

`jsproptest` is a property-based testing (PBT) framework for JavaScript and TypeScript, drawing inspiration from libraries such as Haskell's QuickCheck and Python's Hypothesis. Property-based testing shifts the focus from example-based verification to defining universal *properties* or *invariants* that must hold true across a wide spectrum of generated inputs.

Instead of manually crafting test cases for specific inputs (e.g., testing an add function with `add(2, 3)`), PBT allows you to describe the *kind* of inputs your function expects (e.g., any two integers) and the *general characteristics* of the output (e.g., `add(a, b)` should always be greater than or equal to `a` and `b` if they are non-negative). `jsproptest` then generates hundreds or thousands of varied inputs, searching for edge cases or unexpected behaviors that violate your defined properties. This approach significantly increases test coverage and the likelihood of finding subtle bugs.

The core workflow involves:
1.  **Defining a property:** A function that takes generated inputs and asserts an expected invariant. See [Properties](./properties.md).
2.  **Specifying generators:** Mechanisms (`Gen`) for creating random data conforming to certain types or constraints, often built by composing simpler generators using **combinators**. See [Generators](./generators.md) and [Combinators](./combinators.md).
3.  **Execution:** `jsproptest` automatically runs the property function against numerous generated inputs (typically 100+).
4.  **Shrinking:** If a test case fails (the property returns `false` or throws), `jsproptest` attempts to find a minimal counterexample by simplifying the failing input. See [Shrinking](./shrinking.md).

Consider verifying the property that reversing an array twice restores the original array:

```typescript
import { forAll, Gen } from 'jsproptest';

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

## Getting Started

### Installation

To add `jsproptest` to your project, run the following command:

```bash
npm install jsproptest --save-dev
# or using yarn:
# yarn add jsproptest --dev
```

This will install the package and add it to your `devDependencies`.

## Core Concepts

Before diving deeper, let's understand the key components:

*   **[Generators (`Gen`)](./generators.md)**: Produce random data of various types (primitives, containers) according to specified constraints. Think `Gen.interval(0, 100)` for numbers or `Gen.array(Gen.boolean())` for arrays of booleans.

*   **Arbitrary (`Arbitrary`)**: A wrapper around a generator function that takes a `Random` instance and returns a `Shrinkable` value. `Gen` instances are typically subclasses of `Arbitrary`.

*   **[Shrinkable](./shrinking.md)**: Represents a generated value and holds logic for generating "smaller" or simpler versions of itself. This is crucial for finding the minimal failing test case when a property fails.

*   **[Properties (`Property`, `forAll`)](./properties.md)**: Express conditions or invariants that should hold true for generated data. `jsproptest` runs these properties against many generated examples using the `forAll` function or `Property` class methods.

*   **[Combinators](./combinators.md)**: Modify or combine existing generators to create new ones.

Dive deeper into each concept:

*   **[Generators](./generators.md)**: Learn how to create the basic building blocks of your test data.

*   **[Combinators](./combinators.md)**: Discover techniques to combine and transform generators for complex data structures.

*   **[Properties](./properties.md)**: Understand how to define the invariants your code should satisfy and how to run tests.

*   **[Shrinking](./shrinking.md)**: See how `jsproptest` helps pinpoint failures by simplifying counterexamples.

*   **[Stateful Testing](./stateful-testing.md)**: Learn how to test systems with internal state across sequences of operations.
