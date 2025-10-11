import '../generator.dart';
import '../shrinker/boolean.dart';

/// Creates a generator for boolean values.
///
/// [trueProb] The probability of generating `true`. Must be between 0 and 1. Defaults to 0.5.
/// Returns a generator that produces shrinkable boolean values.
Generator<bool> booleanGen([double trueProb = 0.5]) {
  return Arbitrary<bool>((random) {
    final value = random.nextBoolean(trueProb);
    return shrinkableBoolean(value);
  });
}
