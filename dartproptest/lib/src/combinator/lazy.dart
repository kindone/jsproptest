import '../generator.dart';
import '../shrinkable.dart';

/// Creates a generator that delays the evaluation of the provided function until the generator is sampled.
/// This is particularly useful for defining recursive generators or generators that depend on expensive computations.
///
/// [func] A function that returns the value to be generated.
/// Returns a Generator that produces the value returned by `func` upon generation.
Generator<T> lazy<T>(T Function() func) {
  return Arbitrary<T>((rand) => Shrinkable<T>(func()));
}
