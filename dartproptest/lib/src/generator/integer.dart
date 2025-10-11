import '../generator.dart';
import '../shrinker/integer.dart';

/// Generates integers within the specified inclusive range [min, max].
///
/// [min] The minimum value of the range (inclusive). Defaults to safe integer bounds.
/// [max] The maximum value of the range (inclusive). Defaults to safe integer bounds.
/// Returns a generator for integers within the specified range.
/// Throws If min is greater than max.
Generator<int> interval([int? min, int? max]) {
  final minVal = min ?? -9007199254740991; // Number.MIN_SAFE_INTEGER equivalent
  final maxVal = max ?? 9007199254740991; // Number.MAX_SAFE_INTEGER equivalent

  if (minVal > maxVal)
    throw Exception('invalid range: min ($minVal) > max ($maxVal)');
  return Arbitrary((random) {
    return generateInteger(random, minVal, maxVal);
  });
}

/// Generates integers within the specified range [fromInclusive, toExclusive).
///
/// [fromInclusive] The minimum value of the range (inclusive).
/// [toExclusive] The maximum value of the range (exclusive).
/// Returns a generator for integers within the specified range.
/// Throws If fromInclusive is greater than or equal to toExclusive.
Generator<int> inRange(int fromInclusive, int toExclusive) {
  if (fromInclusive >= toExclusive) {
    throw Exception(
        'invalid range: from ($fromInclusive) >= to ($toExclusive)');
  }
  return interval(fromInclusive, toExclusive - 1);
}

/// Generates a sequence of [count] integers starting from [start].
/// Equivalent to `inRange(start, start + count)`.
///
/// @deprecated Use `interval` or `inRange` instead.
/// [start] The starting integer (inclusive).
/// [count] The number of integers to generate.
/// Returns a generator for the sequence of integers.
Generator<int> integers(int start, int count) {
  return inRange(start, start + count);
}

/// Generates a random integer.
/// Returns a generator for a random integer.
Generator<int> integer() {
  return interval();
}
