import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Typed Examples', () {
    test('addition commutativity with type safety', () {
      expect(
          () => forAll(
                (int a, int b) => a + b == b + a,
                [Gen.interval(0, 100), Gen.interval(0, 100)],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('string concatenation with type safety', () {
      expect(
          () => forAll(
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

    test('mixed types with type safety', () {
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

    test('array operations with type safety', () {
      expect(
          () => forAll(
                (List<int> list, int item) {
                  final newList = [...list, item];
                  return newList.length == list.length + 1;
                },
                [
                  Gen.array(Gen.interval(0, 10), minLength: 0, maxLength: 5),
                  Gen.interval(0, 10)
                ],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('set operations with type safety', () {
      expect(
          () => forAll(
                (Set<int> set, int item) {
                  final newSet = {...set, item};
                  return newSet.length >= set.length;
                },
                [
                  Gen.set(Gen.interval(0, 10), minSize: 0, maxSize: 5),
                  Gen.interval(0, 10)
                ],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('dictionary operations with type safety', () {
      expect(
          () => forAll(
                (Map<String, int> map, String key, int value) {
                  final newMap = {...map, key: value};
                  return newMap.length >= map.length;
                },
                [
                  Gen.dictionary(
                    Gen.asciiString(minLength: 1, maxLength: 3),
                    Gen.interval(0, 10),
                    minSize: 0,
                    maxSize: 3,
                  ),
                  Gen.asciiString(minLength: 1, maxLength: 3),
                  Gen.interval(0, 10)
                ],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('tuple operations with type safety', () {
      expect(
          () => forAll(
                (List<dynamic> tuple) {
                  return tuple.length >= 0;
                },
                [
                  Gen.tuple([
                    Gen.interval(0, 10),
                    Gen.asciiString(minLength: 1, maxLength: 3),
                    Gen.boolean()
                  ])
                ],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('floating point operations with type safety', () {
      expect(
          () => forAll(
                (double a, double b) =>
                    (a + b).isFinite || a.isInfinite || b.isInfinite,
                [Gen.float(), Gen.float()],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('boolean operations with type safety', () {
      expect(
          () => forAll(
                (bool a, bool b) => (a && b) == (b && a),
                [Gen.boolean(), Gen.boolean()],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('complex nested operations with type safety', () {
      expect(
          () => forAll(
                (List<Map<String, List<int>>> data) {
                  // Verify structure
                  for (final map in data) {
                    for (final list in map.values) {
                      if (list.any((int i) => i < 0)) {
                        return false;
                      }
                    }
                  }
                  return true;
                },
                [
                  Gen.array(
                    Gen.dictionary(
                      Gen.asciiString(minLength: 1, maxLength: 2),
                      Gen.array(Gen.interval(0, 10),
                          minLength: 0, maxLength: 3),
                      minSize: 0,
                      maxSize: 2,
                    ),
                    minLength: 0,
                    maxLength: 2,
                  )
                ],
                numRuns: 50,
              ),
          returnsNormally);
    });
  });
}
