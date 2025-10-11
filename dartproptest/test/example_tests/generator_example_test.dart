import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Generator Examples', () {
    test('boolean generator - random and biased', () {
      final rand = Random('42');
      final boolGen = Gen.boolean();
      final boolGenBiased = Gen.boolean(0.8); // 80% chance of true

      // Test random boolean generator
      final result1 = boolGen.generate(rand);
      expect(result1.value, isA<bool>());

      // Test biased boolean generator
      final result2 = boolGenBiased.generate(rand);
      expect(result2.value, isA<bool>());
    });

    test('floating point generator', () {
      final rand = Random('42');
      final floatGen = Gen.float();

      final result = floatGen.generate(rand);
      expect(result.value, isA<double>());
    });

    test('string generators', () {
      final rand = Random('42');

      // ASCII string generator
      final asciiGen = Gen.asciiString(minLength: 1, maxLength: 5);
      final asciiResult = asciiGen.generate(rand);
      expect(asciiResult.value, isA<String>());
      expect(asciiResult.value.length, greaterThanOrEqualTo(1));
      expect(asciiResult.value.length, lessThanOrEqualTo(5));

      // Unicode string generator
      final unicodeGen = Gen.unicodeString(minLength: 1, maxLength: 5);
      final unicodeResult = unicodeGen.generate(rand);
      expect(unicodeResult.value, isA<String>());
      expect(unicodeResult.value.length, greaterThanOrEqualTo(1));
      expect(unicodeResult.value.length, lessThanOrEqualTo(5));

      // Printable ASCII string generator
      final printableGen = Gen.printableAsciiString(minLength: 1, maxLength: 5);
      final printableResult = printableGen.generate(rand);
      expect(printableResult.value, isA<String>());
      expect(printableResult.value.length, greaterThanOrEqualTo(1));
      expect(printableResult.value.length, lessThanOrEqualTo(5));
    });

    test('integer generators', () {
      final rand = Random('42');

      // Interval generator
      final intervalGen = Gen.interval(0, 100);
      final intervalResult = intervalGen.generate(rand);
      expect(intervalResult.value, isA<int>());
      expect(intervalResult.value, greaterThanOrEqualTo(0));
      expect(intervalResult.value, lessThanOrEqualTo(100));

      // InRange generator
      final inRangeGen = Gen.inRange(0, 100);
      final inRangeResult = inRangeGen.generate(rand);
      expect(inRangeResult.value, isA<int>());
      expect(inRangeResult.value, greaterThanOrEqualTo(0));
      expect(inRangeResult.value, lessThan(100));
    });

    test('character generators', () {
      final rand = Random('42');

      // ASCII character generator
      final asciiCharGen = Gen.ascii();
      final asciiCharResult = asciiCharGen.generate(rand);
      expect(asciiCharResult.value, isA<int>());
      expect(asciiCharResult.value, greaterThanOrEqualTo(0));
      expect(asciiCharResult.value, lessThanOrEqualTo(127));

      // Unicode character generator
      final unicodeCharGen = Gen.unicode();
      final unicodeCharResult = unicodeCharGen.generate(rand);
      expect(unicodeCharResult.value, isA<int>());

      // Printable ASCII character generator
      final printableCharGen = Gen.printableAscii();
      final printableCharResult = printableCharGen.generate(rand);
      expect(printableCharResult.value, isA<int>());
      expect(printableCharResult.value, greaterThanOrEqualTo(32));
      expect(printableCharResult.value, lessThanOrEqualTo(126));
    });

    test('array generators', () {
      final rand = Random('42');

      // Array generator
      final arrayGen = Gen.array(Gen.boolean(), minLength: 2, maxLength: 5);
      final arrayResult = arrayGen.generate(rand);
      expect(arrayResult.value, isA<List<bool>>());
      expect(arrayResult.value.length, greaterThanOrEqualTo(2));
      expect(arrayResult.value.length, lessThanOrEqualTo(5));

      // Unique array generator
      final uniqueArrayGen =
          Gen.uniqueArray(Gen.interval(1, 10), minLength: 3, maxLength: 3);
      final uniqueArrayResult = uniqueArrayGen.generate(rand);
      expect(uniqueArrayResult.value, isA<List<int>>());
      expect(uniqueArrayResult.value.length, equals(3));
      // All elements should be unique
      expect(uniqueArrayResult.value.toSet().length, equals(3));
    });

    test('set generator', () {
      final rand = Random('42');
      final setGen = Gen.set(Gen.interval(1, 5), minSize: 1, maxSize: 3);
      final setResult = setGen.generate(rand);
      expect(setResult.value, isA<Set<int>>());
      expect(setResult.value.length, greaterThanOrEqualTo(1));
      expect(setResult.value.length, lessThanOrEqualTo(3));
    });

    test('dictionary generator', () {
      final rand = Random('42');
      final dictGen = Gen.dictionary(
        Gen.asciiString(minLength: 1, maxLength: 3),
        Gen.interval(0, 10),
        minSize: 1,
        maxSize: 3,
      );
      final dictResult = dictGen.generate(rand);
      expect(dictResult.value, isA<Map<String, int>>());
      expect(dictResult.value.length, greaterThanOrEqualTo(1));
      expect(dictResult.value.length, lessThanOrEqualTo(3));
    });

    test('tuple generator', () {
      final rand = Random('42');
      final tupleGen = Gen.tuple([
        Gen.interval(0, 10),
        Gen.asciiString(minLength: 1, maxLength: 3),
        Gen.boolean(),
      ]);
      final tupleResult = tupleGen.generate(rand);
      expect(tupleResult.value, isA<List<dynamic>>());
      expect(tupleResult.value.length, equals(3));
      expect(tupleResult.value[0], isA<int>());
      expect(tupleResult.value[1], isA<String>());
      expect(tupleResult.value[2], isA<bool>());
    });
  });
}
