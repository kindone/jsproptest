import '../generator.dart';
import '../shrinker/floating.dart';

/// Generates arbitrary floating-point numbers between 0 (inclusive) and 1 (exclusive).
/// The generated values are shrinkable towards 0.
///
/// Returns a Generator for floating-point numbers.
Generator<double> floatingGen() {
  return Arbitrary<double>((random) {
    // Uses the PRNG's default method to get a number in [0, 1).
    final value = random.nextProb();
    // Creates a Shrinkable representation of the float, enabling shrinking towards 0.
    return shrinkableFloat(value);
  });
}
