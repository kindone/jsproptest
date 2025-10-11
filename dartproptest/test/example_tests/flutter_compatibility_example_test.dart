import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Flutter Compatibility Examples', () {
    test('forAllSimple - Flutter-compatible addition commutativity', () {
      expect(
          () => forAllSimple(
                (int a, int b) => a + b == b + a,
                [Gen.interval(0, 100), Gen.interval(0, 100)],
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('numbered variants - forAll2 Flutter-compatible', () {
      expect(
          () => forAll2(
                (String s1, String s2) =>
                    (s1 + s2).length == s1.length + s2.length,
                Gen.asciiString(minLength: 0, maxLength: 10),
                Gen.asciiString(minLength: 0, maxLength: 10),
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('numbered variants - forAll3 Flutter-compatible', () {
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

    test('numbered variants - forAll4 Flutter-compatible', () {
      expect(
          () => forAll4(
                (int a, int b, int c, int d) =>
                    (a + b) + (c + d) == (a + c) + (b + d),
                Gen.interval(0, 25),
                Gen.interval(0, 25),
                Gen.interval(0, 25),
                Gen.interval(0, 25),
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('numbered variants - forAll5 Flutter-compatible', () {
      expect(
          () => forAll5(
                (int a, int b, int c, int d, int e) =>
                    a + b + c + d + e == e + d + c + b + a,
                Gen.interval(0, 20),
                Gen.interval(0, 20),
                Gen.interval(0, 20),
                Gen.interval(0, 20),
                Gen.interval(0, 20),
                numRuns: 50,
              ),
          returnsNormally);
    });

    test('forAllLegacy - Flutter-compatible with Property class', () {
      final property = Property((List<dynamic> args) {
        final a = args[0] as int;
        final b = args[1] as int;
        return a + b == b + a;
      });

      expect(
          () => property.setNumRuns(50).forAllLegacy([
                Gen.interval(0, 100),
                Gen.interval(0, 100),
              ]),
          returnsNormally);
    });

    test('mixed types with forAllSimple', () {
      expect(
          () => forAllSimple(
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

    test('array operations with forAllSimple', () {
      expect(
          () => forAllSimple(
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

    test('error handling with forAllSimple', () {
      expect(
          () => forAllSimple(
                (int a) => a < 0, // This will fail for positive numbers
                [Gen.interval(0, 100)],
                numRuns: 10,
              ),
          throwsException);
    });

    test('Flutter-compatible generator usage', () {
      final rand = Random('flutter_test');

      // Test various generators work in Flutter environment
      final boolGen = Gen.boolean();
      final intGen = Gen.interval(0, 100);
      final stringGen = Gen.asciiString(minLength: 1, maxLength: 5);
      final arrayGen = Gen.array(Gen.boolean(), minLength: 1, maxLength: 3);

      expect(boolGen.generate(rand).value, isA<bool>());
      expect(intGen.generate(rand).value, isA<int>());
      expect(stringGen.generate(rand).value, isA<String>());
      expect(arrayGen.generate(rand).value, isA<List<bool>>());
    });
  });
}
