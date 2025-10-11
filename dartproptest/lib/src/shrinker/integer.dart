import '../random.dart';
import '../shrinkable.dart';
import '../stream.dart';

/// Generates a shrinkable integer within the specified range with shrinking capabilities.
///
/// [random] The random number generator.
/// [min] The minimum value (inclusive).
/// [max] The maximum value (inclusive).
/// Returns a Shrinkable containing the generated integer and its shrinks.
Shrinkable<int> generateInteger(Random random, int min, int max) {
  final value = random.interval(min, max);
  return Shrinkable<int>(value, () => _shrinkInteger(value, min, max));
}

/// Generates shrinks for an integer value.
///
/// [value] The integer value to shrink.
/// [min] The minimum allowed value.
/// [max] The maximum allowed value.
/// Returns a stream of smaller integer values.
LazyStream<Shrinkable<int>> _shrinkInteger(int value, int min, int max) {
  if (value == min) {
    return LazyStream<Shrinkable<int>>(null);
  }

  // Generate shrinks by halving the distance to min
  final List<Shrinkable<int>> shrinks = [];

  // Try shrinking towards zero first
  if (value > 0 && min <= 0) {
    shrinks.add(Shrinkable<int>(0));
  }

  // Try shrinking towards min
  if (value > min) {
    final newValue = min + (value - min) ~/ 2;
    if (newValue != value && newValue >= min) {
      shrinks.add(
          Shrinkable<int>(newValue, () => _shrinkInteger(newValue, min, max)));
    }
  }

  // Try shrinking by removing the last digit (for positive numbers)
  if (value > 0) {
    final newValue = value ~/ 10;
    if (newValue != value && newValue >= min) {
      shrinks.add(
          Shrinkable<int>(newValue, () => _shrinkInteger(newValue, min, max)));
    }
  }

  // Try shrinking by removing the last digit (for negative numbers)
  if (value < 0) {
    final newValue = value ~/ 10;
    if (newValue != value && newValue <= max) {
      shrinks.add(
          Shrinkable<int>(newValue, () => _shrinkInteger(newValue, min, max)));
    }
  }

  // Convert list to stream
  if (shrinks.isEmpty) {
    return LazyStream<Shrinkable<int>>(null);
  }

  return LazyStream<Shrinkable<int>>(shrinks.first, () {
    if (shrinks.length == 1) {
      return LazyStream<Shrinkable<int>>(null);
    }
    return LazyStream<Shrinkable<int>>(shrinks[1], () {
      if (shrinks.length == 2) {
        return LazyStream<Shrinkable<int>>(null);
      }
      return LazyStream<Shrinkable<int>>(shrinks[2]);
    });
  });
}

/// Creates a shrinkable that uses binary search to shrink a range.
/// This is useful for shrinking array lengths and other range-based values.
///
/// [range] The range to shrink (e.g., array length - minSize).
/// Returns a Shrinkable that shrinks the range using binary search.
Shrinkable<int> binarySearchShrinkable(int range) {
  if (range <= 0) {
    return Shrinkable<int>(0);
  }

  return Shrinkable<int>(range, () => _binarySearchShrinks(range));
}

/// Generates binary search shrinks for a range.
LazyStream<Shrinkable<int>> _binarySearchShrinks(int range) {
  if (range <= 0) {
    return LazyStream<Shrinkable<int>>(null);
  }

  final half = range ~/ 2;
  if (half == 0) {
    return LazyStream<Shrinkable<int>>(null);
  }

  return LazyStream<Shrinkable<int>>(
      Shrinkable<int>(half, () => _binarySearchShrinks(half)));
}
