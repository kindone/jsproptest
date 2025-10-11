import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Variadic forAll Examples', () {
    test('single argument function - square is always non-negative', () {
      expect(
          () => forAll(
                (int a) => a * a >= 0,
                [Gen.interval(-100, 100)],
                numRuns: 50, // Reduced for faster testing
              ),
          returnsNormally);
    });

    test('two argument function - addition is commutative', () {
      expect(
          () => forAll(
                (int a, int b) => a + b == b + a,
                [Gen.interval(0, 100), Gen.interval(0, 100)],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('three argument function - addition is associative', () {
      expect(
          () => forAll(
                (int a, int b, int c) => (a + b) + c == a + (b + c),
                [Gen.interval(0, 50), Gen.interval(0, 50), Gen.interval(0, 50)],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('mixed types - string length and integer properties', () {
      expect(
          () => forAll(
                (int a, String s, bool flag) =>
                    flag ? a.toString().length >= 1 : a >= 0,
                [
                  Gen.interval(0, 100),
                  Gen.asciiString(minLength: 1, maxLength: 5),
                  Gen.boolean()
                ],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('forAllSimple - string concatenation length', () {
      expect(
          () => forAllSimple(
                (String s1, String s2) =>
                    (s1 + s2).length == s1.length + s2.length,
                [
                  Gen.asciiString(minLength: 0, maxLength: 10),
                  Gen.asciiString(minLength: 0, maxLength: 10)
                ],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('numbered approach - forAll2 with two arguments', () {
      expect(
          () => forAll2(
                (int a, int b) => a + b == b + a,
                Gen.interval(0, 100),
                Gen.interval(0, 100),
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('numbered approach - forAll3 with three arguments', () {
      expect(
          () => forAll3(
                (int a, int b, int c) => (a + b) + c == a + (b + c),
                Gen.interval(0, 50),
                Gen.interval(0, 50),
                Gen.interval(0, 50),
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('typed function approach - complex validation', () {
      final typedFunc = TypedFunction.threeArgs((int a, String s, bool flag) {
        // Simple property that should always hold
        return a >= 0 && s.length >= 0;
      });

      expect(
          () => forAllTyped(
                typedFunc,
                [
                  Gen.interval(0, 100),
                  Gen.asciiString(minLength: 1, maxLength: 3),
                  Gen.boolean()
                ],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('error handling - should fail when property is false', () {
      expect(
          () => forAll(
                (int a) => a < 0, // This will fail for positive numbers
                [Gen.interval(0, 100)],
                numRuns: 10,
              ),
          throwsException);
    });

    test('error handling - should fail with mismatched generator count', () {
      expect(
          () => forAll(
                (int a, int b) => a + b == b + a,
                [Gen.interval(0, 100)], // Only one generator for two parameters
                numRuns: 10,
              ),
          throwsException);
    });

    test('error handling - should fail with type mismatch', () {
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
