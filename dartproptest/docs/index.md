<p align="center">
  <img src="jsproptest.svg" alt="dartproptest logo" width="200"/>
</p>

# dartproptest

`dartproptest` is a property-based testing (PBT) framework for Dart, drawing inspiration from libraries such as Haskell's QuickCheck and Python's Hypothesis. This is a port of the TypeScript `jsproptest` library to Dart. Property-based testing shifts the focus from example-based verification to defining universal *properties* or *invariants* that must hold true for an input domain.

Instead of manually crafting test cases for specific inputs, PBT allows you to describe the *domain* of inputs your function expects and the *general characteristics* of the output (e.g., `add(a, b)` should always be greater than or equal to `a` and `b` if they are non-negative). PBT then generates hundreds or thousands of varied inputs, searching for edge cases or unexpected behaviors that violate your defined properties. This approach significantly increases test coverage and the likelihood of finding subtle bugs.

The core workflow involves:

1.  **Defining a property:** A function that takes generated inputs and asserts an expected invariant. See [Properties](properties.md).
2.  **Specifying generators:** Mechanisms for creating random data conforming to certain types or constraints, often built by composing simpler generators using **combinators**. See [Generators](generators.md) and [Combinators](combinators.md).
3.  **Execution:** `dartproptest` automatically runs the property function against numerous generated inputs (typically 100+).
4.  **Shrinking:** If a test case fails (the property returns `false` or throws), `dartproptest` attempts to find a minimal counterexample by simplifying the failing input. See [Shrinking](shrinking.md).

Consider verifying a round-trip property for a custom parser/serializer:

```dart
import 'package:dartproptest/dartproptest.dart';

void main() {
  test('should preserve data after serializing and parsing', () {
    // Generator for keys (non-empty strings without '&' or '=')
    final keyGen = Gen.asciiString(minLength: 1, maxLength: 10).filter((s) => 
        s.isNotEmpty && !s.contains('&') && !s.contains('='));
    // Generator for arbitrary string values
    final valueGen = Gen.asciiString(minLength: 0, maxLength: 10);
    // Generator for objects (dictionaries) with our specific keys and values
    final dataObjectGen = Gen.dictionary(keyGen, valueGen, minSize: 0, maxSize: 10);

// forAll executes the property check with generated data objects (main approach)
forAll(
  (Map<String, String> originalData) {
    // Perform the round trip: serialize then parse
    final serialized = serializeMyDataFormat(originalData);
    final parsedData = parseMyDataFormat(serialized);

    // Property: The parsed data must deep-equal the original data object.
    expect(parsedData, equals(originalData));
    return true; // Property passed
  },
  [dataObjectGen], // Use the dictionary generator
);
    // dartproptest runs this property multiple times with diverse data objects.
  });
}
```

This PBT approach facilitates the discovery of edge cases and intricate bugs that might be neglected by traditional, example-driven testing methodologies.

## Getting Started

### Installation

To add `dartproptest` to your project, add it to your `pubspec.yaml`:

```yaml
dev_dependencies:
  dartproptest:
    path: ../dartproptest  # Adjust path as needed
```

Then run:

```bash
dart pub get
```

## Core Concepts and Features

Understanding these key components will help you use `dartproptest` effectively:

*   **[Generators](generators.md)**: Produce random data of various types (primitives, containers) according to specified constraints (e.g., `generateInteger()`, `arrayGen(...)`). Learn how to create the basic building blocks of your test data.

*   **[Combinators](combinators.md)**: Modify or combine existing generators to create new ones. Discover techniques to constraint, combine, and transform generators for complex data structures.

*   **[Properties (`Property`, `forAll`)](properties.md)**: Express conditions or invariants that should hold true for generated data. `dartproptest` runs these properties against many generated examples using the `forAll` function or `Property` class methods. Understand how to define the invariants your code should satisfy and how to run tests.

*   **[Shrinking](shrinking.md)**: When a property fails, `dartproptest` attempts to find a minimal counterexample by simplifying the failing input using logic associated with the generated value (often via a `Shrinkable` structure). See how `dartproptest` helps pinpoint failures.

*   **[Stateful Testing](stateful-testing.md)**: Go beyond simple input-output functions and test systems with internal state by generating sequences of operations or commands. Learn how to model and verify stateful behaviors.
