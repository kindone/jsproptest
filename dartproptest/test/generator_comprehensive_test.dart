import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Comprehensive Generator Tests', () {
    test('booleanGen generates boolean values', () {
      final rand = Random('42');
      final boolGen = booleanGen();

      final results = <bool>[];
      for (int i = 0; i < 10; i++) {
        final result = boolGen.generate(rand);
        results.add(result.value);
      }

      // Should generate both true and false values
      expect(results.any((b) => b == true), isTrue);
      expect(results.any((b) => b == false), isTrue);
    });

    test('booleanGen with custom probability', () {
      final rand = Random('42');
      final boolGen = booleanGen(0.8); // 80% chance of true

      final results = <bool>[];
      for (int i = 0; i < 20; i++) {
        final result = boolGen.generate(rand);
        results.add(result.value);
      }

      // Should generate both true and false values
      expect(results.any((b) => b == true), isTrue);
      expect(results.any((b) => b == false), isTrue);
    });

    test('floatingGen generates floating point numbers', () {
      final rand = Random('42');
      final floatGen = floatingGen();

      final results = <double>[];
      for (int i = 0; i < 10; i++) {
        final result = floatGen.generate(rand);
        results.add(result.value);
      }

      // All values should be between 0 and 1
      for (final value in results) {
        expect(value, greaterThanOrEqualTo(0.0));
        expect(value, lessThan(1.0));
      }
    });

    test('asciiStringGen generates ASCII strings', () {
      final rand = Random('42');
      final stringGen = asciiStringGen(3, 8);

      final results = <String>[];
      for (int i = 0; i < 5; i++) {
        final result = stringGen.generate(rand);
        results.add(result.value);
      }

      for (final str in results) {
        expect(str.length, greaterThanOrEqualTo(3));
        expect(str.length, lessThanOrEqualTo(8));
        // Check that all characters are ASCII
        for (final char in str.codeUnits) {
          expect(char, greaterThanOrEqualTo(1));
          expect(char, lessThanOrEqualTo(127));
        }
      }
    });

    test('printableAsciiStringGen generates printable ASCII strings', () {
      final rand = Random('42');
      final stringGen = printableAsciiStringGen(2, 5);

      final results = <String>[];
      for (int i = 0; i < 5; i++) {
        final result = stringGen.generate(rand);
        results.add(result.value);
      }

      for (final str in results) {
        expect(str.length, greaterThanOrEqualTo(2));
        expect(str.length, lessThanOrEqualTo(5));
        // Check that all characters are printable ASCII
        for (final char in str.codeUnits) {
          expect(char, greaterThanOrEqualTo(32));
          expect(char, lessThanOrEqualTo(127));
        }
      }
    });

    test('unicodeStringGen generates Unicode strings', () {
      final rand = Random('42');
      final stringGen = unicodeStringGen(1, 3);

      final results = <String>[];
      for (int i = 0; i < 5; i++) {
        final result = stringGen.generate(rand);
        results.add(result.value);
      }

      for (final str in results) {
        expect(str.length, greaterThanOrEqualTo(1));
        expect(str.length, lessThanOrEqualTo(3));
        // Should be able to generate Unicode characters
        expect(str.isNotEmpty, isTrue);
      }
    });

    test('arrayGen generates arrays', () {
      final rand = Random('42');
      final intGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 10)));
      final arrayGenerator = arrayGen(intGen, 2, 5);

      final results = <List<int>>[];
      for (int i = 0; i < 5; i++) {
        final result = arrayGenerator.generate(rand);
        results.add(result.value);
      }

      for (final arr in results) {
        expect(arr.length, greaterThanOrEqualTo(2));
        expect(arr.length, lessThanOrEqualTo(5));
        for (final value in arr) {
          expect(value, greaterThanOrEqualTo(1));
          expect(value, lessThanOrEqualTo(10));
        }
      }
    });

    test('uniqueArrayGen generates unique arrays', () {
      final rand = Random('42');
      final intGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 5)));
      final uniqueArrayGenerator = uniqueArrayGen(intGen, 2, 4);

      final results = <List<int>>[];
      for (int i = 0; i < 5; i++) {
        final result = uniqueArrayGenerator.generate(rand);
        results.add(result.value);
      }

      for (final arr in results) {
        expect(arr.length, greaterThanOrEqualTo(2));
        expect(arr.length, lessThanOrEqualTo(4));
        // Check uniqueness
        final uniqueValues = arr.toSet();
        expect(uniqueValues.length, equals(arr.length));
        // Check sorting
        for (int i = 1; i < arr.length; i++) {
          expect(arr[i], greaterThanOrEqualTo(arr[i - 1]));
        }
      }
    });

    test('setGen generates sets', () {
      final rand = Random('42');
      final intGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 10)));
      final setGenerator = setGen(intGen, 2, 5);

      final results = <Set<int>>[];
      for (int i = 0; i < 5; i++) {
        final result = setGenerator.generate(rand);
        results.add(result.value);
      }

      for (final set in results) {
        expect(set.length, greaterThanOrEqualTo(2));
        expect(set.length, lessThanOrEqualTo(5));
        for (final value in set) {
          expect(value, greaterThanOrEqualTo(1));
          expect(value, lessThanOrEqualTo(10));
        }
      }
    });

    test('dictionaryGen generates dictionaries', () {
      final rand = Random('42');
      final keyGen = asciiStringGen(1, 3);
      final valueGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 10)));
      final dictGen = dictionaryGen(keyGen, valueGen, 2, 4);

      final results = <Map<String, int>>[];
      for (int i = 0; i < 5; i++) {
        final result = dictGen.generate(rand);
        results.add(result.value);
      }

      for (final dict in results) {
        expect(dict.length, greaterThanOrEqualTo(2));
        expect(dict.length, lessThanOrEqualTo(4));
        for (final entry in dict.entries) {
          expect(entry.key.length, greaterThanOrEqualTo(1));
          expect(entry.key.length, lessThanOrEqualTo(3));
          expect(entry.value, greaterThanOrEqualTo(1));
          expect(entry.value, lessThanOrEqualTo(10));
        }
      }
    });

    test('character generators work correctly', () {
      final rand = Random('42');

      // Test ASCII character generator
      final asciiResults = <int>[];
      for (int i = 0; i < 10; i++) {
        final result = asciiCharGen.generate(rand);
        asciiResults.add(result.value);
      }
      for (final code in asciiResults) {
        expect(code, greaterThanOrEqualTo(1));
        expect(code, lessThanOrEqualTo(127));
      }

      // Test printable ASCII character generator
      final printableResults = <int>[];
      for (int i = 0; i < 10; i++) {
        final result = printableAsciiCharGen.generate(rand);
        printableResults.add(result.value);
      }
      for (final code in printableResults) {
        expect(code, greaterThanOrEqualTo(32));
        expect(code, lessThanOrEqualTo(127));
      }

      // Test Unicode character generator
      final unicodeResults = <int>[];
      for (int i = 0; i < 10; i++) {
        final result = unicodeCharGen.generate(rand);
        unicodeResults.add(result.value);
      }
      for (final code in unicodeResults) {
        expect(code, greaterThanOrEqualTo(1));
        expect(code, lessThanOrEqualTo(0x10ffff));
        // Should not be in surrogate pair range
        expect(code < 0xd800 || code > 0xdfff, isTrue);
      }
    });
  });
}
