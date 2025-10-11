# Properties

Properties define the expected behavior of your code over a range of inputs.

## Type-Safe Property Testing (Recommended)

`dartproptest` provides type-safe alternatives to the traditional `forAll` function that eliminate the need to manually unpack arguments from a list. These functions provide compile-time type safety and runtime type checking.

### Main Type-Safe Function

- `forAll<T>(func, generators)` - **Main function for any number of arguments** (Flutter-compatible, works everywhere)
- `forAllSimple<T>(func, generators)` - **Alternative function for any number of arguments** (simplified version without shrinking)

### Numbered Type-Safe Functions

- `forAll1<A>(func, genA)` - For functions with 1 argument
- `forAll2<A, B>(func, genA, genB)` - For functions with 2 arguments  
- `forAll3<A, B, C>(func, genA, genB, genC)` - For functions with 3 arguments
- `forAll4<A, B, C, D>(func, genA, genB, genC, genD)` - For functions with 4 arguments
- `forAll5<A, B, C, D, E>(func, genA, genB, genC, genD, genE)` - For functions with 5 arguments
- `forAllTyped<T>(typedFunc, gens)` - For custom TypedFunction instances

### Examples

```dart
// Main approach (single function for any number of arguments)
forAll(
  (int a, int b) => a + b == b + a,
  [Gen.interval(0, 100), Gen.interval(0, 100)],
);

// Works with any number of arguments
forAll(
  (int a, int b, int c) => (a + b) + c == a + (b + c),
  [Gen.interval(0, 50), Gen.interval(0, 50), Gen.interval(0, 50)],
);

// Mixed types work too
forAll(
  (int a, String s, bool flag) => flag ? a.toString().length >= 1 : a >= 0,
  [Gen.interval(0, 100), Gen.asciiString(minLength: 1, maxLength: 5), Gen.boolean()],
);

// Alternative: forAllSimple (simplified version without shrinking)
forAllSimple(
  (String s1, String s2) => (s1 + s2).length == s1.length + s2.length,
  [Gen.asciiString(minLength: 0, maxLength: 10), Gen.asciiString(minLength: 0, maxLength: 10)],
);

// Numbered approach (still available)
forAll2(
  (int a, int b) => a + b == b + a,
  Gen.interval(0, 100),
  Gen.interval(0, 100),
);

// Using TypedFunction for complex scenarios
final typedFunc = TypedFunction.threeArgs((int a, String s, bool flag) {
  return flag ? a.toString().length == s.length : a >= 0;
});

forAllTyped(
  typedFunc,
  [Gen.interval(0, 100), Gen.asciiString(minLength: 1, maxLength: 3), Gen.boolean()],
);
```

## Flutter Compatibility

`dartproptest` is fully compatible with Flutter and works across all Dart platforms:

- **✅ Flutter Web**: All functions work without issues
- **✅ Flutter Mobile**: Full compatibility on iOS and Android
- **✅ Flutter Desktop**: Works on Windows, macOS, and Linux
- **✅ Dart VM**: Full compatibility in command-line applications

The main `forAll` function is designed to be Flutter-compatible by default, using `Function.apply` instead of reflection for maximum compatibility.

### Error Handling in Flutter

When using `forAll` in Flutter environments, argument count and type mismatches will result in `NoSuchMethodError` wrapped in an `Exception`, rather than custom validation errors. This is the expected behavior and provides clear error messages for debugging.

## Legacy Property Testing

The legacy approach uses `forAllLegacy` with a function that takes a `List<dynamic>` and requires manual argument unpacking. This approach is deprecated in favor of the new `forAll` function.

## Defining Properties with `Property(...)`

*   **`Property<TArgs extends List<dynamic>>(predicate: (List<dynamic> args) => bool | void)`**: Creates a property object explicitly. The `predicate` function receives arguments generated according to the generators passed to `forAll`.
    *   If the predicate returns `false` or throws an error, the property fails.
    *   If the predicate returns `true` or `void` (implicitly returns `null`), the property passes for that input.

    ```dart
    // Property: The sum of two non-negative numbers is non-negative
    final sumProperty = Property((List<dynamic> args) {
        final a = args[0] as int;
        final b = args[1] as int;
        expect(a + b, greaterThanOrEqualTo(0)); // Using test assertions
        // Or: return a + b >= 0;
    });

    // Running the property
    sumProperty.setNumRuns(200).forAll([Gen.interval(0, 100), Gen.interval(0, 100)]);
    ```

*   **`property.setNumRuns(n: int)`**: Configures the number of random test cases to execute when `forAll` is called on a `Property` instance. Returns the `Property` instance for chaining.

*   **`property.example(...args: List<dynamic>)`**: Runs the property's predicate *once* with the explicitly provided `args`. Useful for debugging specific edge cases.

    ```dart
    final prop = Property((List<dynamic> args) {
        final a = args[0] as int;
        final b = args[1] as int;
        return a > b;
    });
    prop.example([5, 3]); // Runs the predicate with a=5, b=3
    prop.example([3, 5]); // returns false
    ```

## Defining and Running Properties with `forAll(...)` (Standalone Function)

*   **`forAll<TArgs extends List<dynamic>>(predicate: (List<dynamic> args) => bool | void, gens: List<Arbitrary<dynamic>>)`**: This is the most common and concise way to define and immediately check a property. It implicitly creates and runs the property. You don't need to manually create a `Property` object.

    ```dart
    // Property: Reversing an array twice yields the original array
    test('should return original array after double reverse', () {
        forAll(
            (List<dynamic> args) {
                final arr = args[0] as List<String>;
                // Predicate using test assertions
                expect([...arr].reversed.toList().reversed.toList(), equals(arr));
            },
            [Gen.array(Gen.asciiString(minLength: 0, maxLength: 5), minLength: 0, maxLength: 10)] // Generator for the 'arr' argument
        ); // Runs the test immediately (default 100 times)
    });

    // Property: String concatenation length
    test('should have correct length after concatenation', () {
        forAll(
            (List<dynamic> args) {
                final s1 = args[0] as String;
                final s2 = args[1] as String;
                // Predicate returning a boolean
                return (s1 + s2).length == s1.length + s2.length;
            },
            [Gen.asciiString(minLength: 0, maxLength: 20), // Generator for s1
             Gen.asciiString(minLength: 0, maxLength: 20)]  // Generator for s2
        );
    });

    // Property: Absolute value is non-negative
    test('should have non-negative absolute value', () {
        forAll(
            (List<dynamic> args) {
                final num = args[0] as double;
                expect(num.abs(), greaterThanOrEqualTo(0));
            },
            [Gen.float()] // Use float generator
        );
    });

    // Property: Tuple elements follow constraints
    test('should generate tuples with correct constraints', () {
        forAll(
            (List<dynamic> args) {
                final tuple = args[0] as List<dynamic>;
                final num = tuple[0] as int;
                final bool = tuple[1] as bool;
                expect(num, greaterThanOrEqualTo(0));
                expect(num, lessThanOrEqualTo(10));
                expect(bool, isA<bool>());
            },
            [Gen.tuple([Gen.interval(0, 10), Gen.boolean()])] // Tuple generator
        );
    });

    // Property: Nested forAll (less common, but possible)
    test('should handle nested properties', () {
        expect(() =>
            forAll((List<dynamic> args) { // Outer property
                final a = args[0] as int;
                forAll((List<dynamic> args) { // Inner property
                    final b = args[0] as int;
                    // This property fails for large 'a' and small 'b'
                    expect(a > 80 || b < 40, isTrue);
                }, [Gen.interval(0, 1000)]); // Generator for 'b'
            }, [Gen.interval(0, 1000)]) // Generator for 'a'
        , throwsException); // We expect this nested structure to fail and throw
    });
    ```
    *Note: The standalone `forAll` runs a default number of times (e.g., 100). To configure the number of runs, you need to use the `Property(...).setNumRuns(...).forAll(...)` approach.*
