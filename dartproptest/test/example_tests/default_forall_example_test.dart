import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Default forAll Examples', () {
    test('addition commutativity with default forAll', () {
      expect(
          () => forAll(
                (int a, int b) => a + b == b + a,
                [Gen.interval(0, 100), Gen.interval(0, 100)],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('mixed types with default forAll', () {
      expect(
          () => forAll(
                (String s, int length) => s.length == length,
                [
                  Gen.asciiString(minLength: 5, maxLength: 5),
                  Gen.interval(5, 5)
                ],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('complex nested types with default forAll', () {
      expect(
          () => forAll(
                (List<Map<String, int>> data) {
                  // Verify all values are non-negative
                  for (final map in data) {
                    for (final value in map.values) {
                      if (value < 0) return false;
                    }
                  }
                  return true;
                },
                [
                  Gen.array(
                    Gen.dictionary(
                      Gen.asciiString(minLength: 1, maxLength: 3),
                      Gen.interval(0, 10),
                      minSize: 1,
                      maxSize: 3,
                    ),
                    minLength: 1,
                    maxLength: 2,
                  )
                ],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('forAllSimple alternative', () {
      expect(
          () => forAllSimple(
                (int a, int b) => a + b == b + a,
                [Gen.interval(0, 100), Gen.interval(0, 100)],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('forAllLegacy for backward compatibility', () {
      expect(
          () => forAllLegacy(
                (List<dynamic> args) =>
                    (args[0] as int) + (args[1] as int) ==
                    (args[1] as int) + (args[0] as int),
                [Gen.interval(0, 100), Gen.interval(0, 100)],
              ),
          returnsNormally);
    });

    test('error handling with default forAll', () {
      expect(
          () => forAll(
                (int a) => a < 0, // This will fail for positive numbers
                [Gen.interval(0, 100)],
                numRuns: 10,
              ),
          throwsException);
    });

    test('argument count mismatch with default forAll', () {
      expect(
          () => forAll(
                (int a, int b) => a + b == b + a,
                [Gen.interval(0, 100)], // Only one generator for two parameters
                numRuns: 10,
              ),
          throwsException);
    });

    test('type mismatch with default forAll', () {
      expect(
          () => forAll(
                (int a, int b) => a + b == b + a,
                [
                  Gen.asciiString(minLength: 1, maxLength: 5),
                  Gen.interval(0, 100)
                ], // String instead of int
                numRuns: 10,
              ),
          throwsException);
    });
  });
}
