import '../generator.dart';
import '../shrinkable.dart';

/// Creates a generator that always produces the same given value.
///
/// [value] The constant value to be generated.
/// Returns a generator that yields the provided value.
Generator<T> just<T>(T value) {
  return Arbitrary<T>((rand) => Shrinkable<T>(value));
}
