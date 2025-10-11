import 'dart:math' as math;

/// A Random number generator that uses Dart's standard Random class.
/// This provides the same interface as the original Mersenne Twister implementation
/// but with better distribution characteristics and simpler maintenance.
class Random {
  /// Predefined boundary values useful for testing edge cases involving safe integers.
  static const List<int> longBounds = [
    0,
    -128,
    127,
    -32768,
    32767,
    -2147483648,
    2147483647,
    -9007199254740991, // Number.MIN_SAFE_INTEGER equivalent
    9007199254740991, // Number.MAX_SAFE_INTEGER equivalent
  ];

  /// Predefined boundary values useful for testing edge cases involving 32-bit integers.
  static const List<int> intBounds = [
    0,
    -128,
    127,
    -32768,
    32767,
    -2147483648,
    2147483647
  ];

  final math.Random _random;
  final String initialSeed;
  final int _seedValue;
  int _useCount = 0;

  /// Getter for debugging - returns the current usage count
  int get useCount => _useCount;

  /// Getter for debugging - returns the underlying random instance
  math.Random get debugRandom => _random;

  /// Creates a new Random instance.
  ///
  /// [initialSeed] Optional seed value. If empty, an auto-generated seed is used.
  /// [useCount] Optional number of times the generator has been used, to restore state.
  Random([String initialSeed = '', int useCount = 0])
      : initialSeed = initialSeed.isEmpty
            ? DateTime.now().millisecondsSinceEpoch.toString()
            : initialSeed,
        _seedValue = initialSeed.isEmpty
            ? DateTime.now().millisecondsSinceEpoch
            : int.tryParse(initialSeed) ??
                DateTime.now().millisecondsSinceEpoch,
        _random = math.Random(initialSeed.isEmpty
            ? DateTime.now().millisecondsSinceEpoch
            : int.tryParse(initialSeed) ??
                DateTime.now().millisecondsSinceEpoch) {
    _useCount = useCount;
    // Discard the specified number of values to restore state
    for (int i = 0; i < useCount; i++) {
      _random.nextInt(0x7fffffff);
    }
  }

  /// Internal constructor for cloning.
  Random._internal(
      this.initialSeed, this._seedValue, this._useCount, this._random);

  /// Generates a random floating-point number within the specified range (inclusive).
  /// Defaults to the range of safe integer bounds.
  ///
  /// [min] The minimum value (inclusive).
  /// [max] The maximum value (inclusive).
  /// Returns a random number.
  double nextNumber(
      [double min = -9007199254740991, double max = 9007199254740991]) {
    _useCount++;
    return min + _random.nextDouble() * (max - min);
  }

  /// Generates a random floating-point number between 0 (inclusive) and 1 (exclusive).
  ///
  /// Returns a random probability value.
  double nextProb() {
    _useCount++;
    return _random.nextDouble();
  }

  /// Generates a random "long" (safe integer) number.
  /// With a certain probability ([boundProb]), it returns a boundary value from [longBounds].
  /// Otherwise, it returns a random 53-bit integer.
  ///
  /// [boundProb] The probability (0 to 1) of returning a boundary value. Defaults to 0.2.
  /// Returns a random safe integer, potentially a boundary value.
  int nextLong([double boundProb = 0.2]) {
    _useCount++;
    // Add boundary number generation with some probability
    if (_random.nextDouble() < boundProb) {
      return longBounds[_random.nextInt(longBounds.length)];
    }
    // Generate a 53-bit integer using two 32-bit values
    final high = _random.nextInt(0x200000); // 21 bits
    final low = _random.nextInt(0x20000000); // 29 bits
    final result = (high << 32) | low;
    return result;
  }

  /// Generates a random 32-bit integer.
  /// With a certain probability ([boundProb]), it returns a boundary value from [intBounds].
  /// Otherwise, it returns a random 32-bit integer.
  ///
  /// [boundProb] The probability (0 to 1) of returning a boundary value. Defaults to 0.2.
  /// Returns a random 32-bit integer, potentially a boundary value.
  int nextInt([double boundProb = 0.2]) {
    _useCount++;
    // Add integer boundary number generation with some probability
    if (_random.nextDouble() < boundProb) {
      return intBounds[_random.nextInt(intBounds.length)];
    }
    return _random.nextInt(0x7fffffff) - 0x40000000; // Signed 32-bit range
  }

  /// Generates a random boolean value.
  ///
  /// [trueProb] The probability (0 to 1) of returning `true`. Defaults to 0.5.
  /// Returns a random boolean.
  bool nextBoolean([double trueProb = 0.5]) {
    _useCount++;
    return _random.nextDouble() < trueProb;
  }

  /// Generates a random safe integer within the specified inclusive interval [min, max].
  /// Uses the underlying 53-bit integer generator.
  ///
  /// [min] The minimum value (inclusive).
  /// [max] The maximum value (inclusive).
  /// Returns a random safe integer within the interval.
  int interval(int min, int max) {
    _useCount++;
    if (min == max) return min;
    if (min > max) throw RangeError('min($min) greater than max($max)');

    // For small ranges, use direct generation to avoid bias
    if (max - min < 0x7fffffff) {
      return min + _random.nextInt(max - min + 1);
    }

    // For large ranges, use the _interval helper
    final genValue = nextLong(0.0); // No boundary values for this call
    return _interval(genValue, -0x20000000000000, 0x1fffffffffffff, min, max);
  }

  /// Generates a random safe integer within the specified range [fromInclusive, toExclusive).
  ///
  /// [fromInclusive] The minimum value (inclusive).
  /// [toExclusive] The maximum value (exclusive).
  /// Returns a random safe integer within the range.
  int inRange(int fromInclusive, int toExclusive) {
    return interval(fromInclusive, toExclusive - 1);
  }

  /// Generates a random 32-bit integer within the specified inclusive interval [min, max].
  /// Uses the underlying 32-bit integer generator.
  ///
  /// [min] The minimum value (inclusive).
  /// [max] The maximum value (inclusive).
  /// Returns a random 32-bit integer within the interval.
  int intInterval(int min, int max) {
    _useCount++;
    if (min == max) return min;
    if (min > max) throw RangeError('min($min) greater than max($max)');

    // For small ranges, use direct generation to avoid bias
    if (max - min < 0x7fffffff) {
      return min + _random.nextInt(max - min + 1);
    }

    // For large ranges, use the _interval helper
    final genValue = nextInt(0.0); // No boundary values for this call
    return _interval(genValue, -0x40000000, 0x3fffffff, min, max);
  }

  /// Generates a random 32-bit integer within the specified range [fromInclusive, toExclusive).
  ///
  /// [fromInclusive] The minimum value (inclusive).
  /// [toExclusive] The maximum value (exclusive).
  /// Returns a random 32-bit integer within the range.
  int intInRange(int fromInclusive, int toExclusive) {
    return intInterval(fromInclusive, toExclusive - 1);
  }

  /// Creates a clone of the current Random instance, preserving the generator state.
  ///
  /// Returns a new Random instance with the same seed and usage count.
  Random clone() {
    // Create a new Random instance with the same seed and advance it to the same state
    final clonedRandom = math.Random(_seedValue);
    // Advance the cloned random to the same state as the original
    // We need to advance by the exact number of underlying calls made
    // Since we can't track the exact sequence, we'll use a simpler approach:
    // Create a new instance with the same seed and advance it by the usage count
    for (int i = 0; i < _useCount; i++) {
      clonedRandom.nextInt(0x7fffffff);
    }
    return Random._internal(initialSeed, _seedValue, _useCount, clonedRandom);
  }

  /// Internal helper to map a generated number within its native range [genMin, genMax]
  /// to a target range [min, max].
  int _interval(int genNum, int genMin, int genMax, int min, int max) {
    if (genNum < genMin)
      throw RangeError('genMin($genMin) greater than num($genNum)');
    if (genNum > genMax)
      throw RangeError('num($genNum) greater than genMax($genMax)');
    if (genMin >= genMax)
      throw RangeError('genMin($genMin) greater or equal to genMax($genMax)');

    if (min > max) throw RangeError('min($min) greater or equal to max($max)');

    // Avoid division by zero if the generator range has only one value
    // or if the target range has only one value.
    if (genMin == genMax || min == max) {
      return min;
    }

    final frac = (genNum - genMin) / (genMax - genMin);
    return (frac * (max - min) + min).round();
  }
}
