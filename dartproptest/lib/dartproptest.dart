/// A property-based testing framework for Dart
///
/// This library provides property-based testing capabilities inspired by
/// QuickCheck and Hypothesis. Instead of writing specific test cases,
/// you define properties that should hold for all inputs in a domain.
///
/// Example:
/// ```dart
/// import 'package:dartproptest/dartproptest.dart';
///
/// void main() {
///   // Test that addition is commutative
///   forAll((int a, int b) => a + b == b + a,
///          Gen.integers(), Gen.integers());
/// }
/// ```
library dartproptest;

// Core types
export 'src/random.dart';
export 'src/shrinkable.dart';
export 'src/stream.dart';
export 'src/try.dart';
export 'src/option.dart';
export 'src/either.dart';

// Generator and Property implementations
export 'src/generator.dart';
export 'src/generator_simple.dart';
export 'src/property.dart';
export 'src/property_simple.dart';
export 'src/property_typed.dart';
export 'src/property_variadic.dart';
export 'src/typed_function.dart';

// Combinators
export 'src/combinator/just.dart';
export 'src/combinator/lazy.dart';
export 'src/combinator/elementof.dart';
export 'src/combinator/oneof.dart';
export 'src/combinator/construct.dart';
export 'src/combinator/chaintuple.dart';

// Additional generators
export 'src/generator/integer.dart';
export 'src/generator/tuple.dart';
export 'src/generator/boolean.dart';
export 'src/generator/string.dart';
export 'src/generator/floating.dart';
export 'src/generator/array.dart';
export 'src/generator/set.dart';
export 'src/generator/dictionary.dart';

// Shrinkers
export 'src/shrinker/boolean.dart';
export 'src/shrinker/string.dart';
export 'src/shrinker/floating.dart';
export 'src/shrinker/array.dart';
export 'src/shrinker/advanced_array.dart';
export 'src/shrinker/set.dart';
export 'src/shrinker/tuple.dart';
export 'src/shrinker/integer.dart';
export 'src/shrinker/dictionary.dart';

// Stateful Testing
export 'src/stateful/stateful_base.dart';
export 'src/stateful/action_factory.dart';
export 'src/stateful/stateful_property.dart';

// Utilities
export 'src/util/assert.dart';
export 'src/util/error.dart';
export 'src/util/json.dart';

// Gen namespace for clean API
export 'src/gen.dart';
