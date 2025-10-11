import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Basic Property-Based Testing Examples', () {
    test('addition is commutative', () {
      expect(
          () => simpleForAll(
                (int a, int b) => a + b == b + a,
                [simpleInterval(0, 100), simpleInterval(0, 100)],
              ),
          returnsNormally);
    });

    test('multiplication is associative', () {
      expect(
          () => simpleForAll(
                (int a, int b, int c) => (a * b) * c == a * (b * c),
                [
                  simpleInterval(0, 10),
                  simpleInterval(0, 10),
                  simpleInterval(0, 10)
                ],
              ),
          returnsNormally);
    });

    test('should fail when property is false', () {
      expect(
          () => simpleForAll(
                (int a) => a < 0, // This will fail for positive numbers
                [simpleInterval(0, 100)],
              ),
          throwsException);
    });
  });
}
