import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Documentation Examples', () {
    group('README Examples', () {
      test('should preserve data after serializing and parsing', () {
        // Assume we have functions to parse and serialize a simple key-value format
        // (In a real scenario, these would be imported from your code)
        Map<String, String> parseMyDataFormat(String str) {
          final result = <String, String>{};
          if (str == '') return result;
          str.split('&').forEach((pair) {
            final parts = pair.split('='); // Split into max 2 parts
            if (parts.length >= 2 && parts[0].length > 0) {
              // Basic parsing, handling URL encoding
              try {
                result[Uri.decodeComponent(parts[0])] =
                    Uri.decodeComponent(parts[1]);
              } catch (e) {
                // Handle potential FormatException during decoding, maybe skip malformed pairs
                print(
                    'Skipping malformed pair during parsing: $pair, error: $e');
              }
            }
          });
          return result;
        }

        String serializeMyDataFormat(Map<String, String> data) {
          // Sort keys for consistent output order, crucial for round-trip testing
          final sortedKeys = data.keys.toList()..sort();
          return sortedKeys
              .map((key) {
                // Basic serialization, handling URL encoding
                try {
                  return '${Uri.encodeComponent(key)}=${Uri.encodeComponent(data[key]!)}';
                } catch (e) {
                  // Handle potential FormatException during encoding (unlikely for typical strings)
                  print(
                      'Error encoding key/value: $key=${data[key]}, error: $e');
                  return ''; // Or throw, depending on desired behavior
                }
              })
              .where((pair) => pair != '') // Remove pairs that failed encoding
              .join('&');
        }

        // Generator for keys (non-empty strings without '&' or '=')
        final keyGen = Gen.asciiString(minLength: 1, maxLength: 10).filter(
            (s) => s.length > 0 && !s.contains('&') && !s.contains('='));
        // Generator for arbitrary string values
        final valueGen = Gen.asciiString(minLength: 0, maxLength: 10);

        // Property: parsing and then serializing should preserve the data
        expect(
            () => forAll(
                  (Map<String, String> data) {
                    final serialized = serializeMyDataFormat(data);
                    final parsed = parseMyDataFormat(serialized);
                    return parsed.length == data.length &&
                        data.entries
                            .every((entry) => parsed[entry.key] == entry.value);
                  },
                  [Gen.dictionary(keyGen, valueGen, minSize: 0, maxSize: 5)],
                  numRuns: 50,
                ),
            returnsNormally);
      });
    });

    group('Properties Documentation Examples', () {
      test('main forAll function - addition is commutative', () {
        expect(
            () => forAll(
                  (int a, int b) => a + b == b + a,
                  [Gen.interval(0, 100), Gen.interval(0, 100)],
                  numRuns: 50,
                ),
            returnsNormally);
      });

      test('main forAll function - addition is associative', () {
        expect(
            () => forAll(
                  (int a, int b, int c) => (a + b) + c == a + (b + c),
                  [
                    Gen.interval(0, 50),
                    Gen.interval(0, 50),
                    Gen.interval(0, 50)
                  ],
                  numRuns: 50,
                ),
            returnsNormally);
      });

      test('main forAll function - mixed types', () {
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

      test('numbered approach - forAll2', () {
        expect(
            () => forAll2(
                  (int a, int b) => a + b == b + a,
                  Gen.interval(0, 100),
                  Gen.interval(0, 100),
                  numRuns: 50,
                ),
            returnsNormally);
      });

      test('numbered approach - forAll3', () {
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

      test('typed function approach', () {
        final typedFunc =
            TypedFunction.twoArgs((int a, int b) => a + b == b + a);
        expect(
            () => forAllTyped(
                  typedFunc,
                  [Gen.interval(0, 100), Gen.interval(0, 100)],
                  numRuns: 50,
                ),
            returnsNormally);
      });

      test('legacy forAll approach', () {
        expect(
            () => forAllLegacy(
                  (List<dynamic> args) =>
                      (args[0] as int) + (args[1] as int) ==
                      (args[1] as int) + (args[0] as int),
                  [Gen.interval(0, 100), Gen.interval(0, 100)],
                ),
            returnsNormally);
      });
    });

    group('Generators Documentation Examples', () {
      test('boolean generator', () {
        final rand = Random('test');
        final boolGen = Gen.boolean();
        final result = boolGen.generate(rand);
        expect(result.value, isA<bool>());
      });

      test('float generator includes special values', () {
        final rand = Random('test');
        final floatGen = Gen.float();
        final result = floatGen.generate(rand);
        expect(result.value, isA<double>());
      });

      test('interval generator', () {
        final rand = Random('test');
        final intervalGen = Gen.interval(0, 10);
        final result = intervalGen.generate(rand);
        expect(result.value, isA<int>());
        expect(result.value, greaterThanOrEqualTo(0));
        expect(result.value, lessThanOrEqualTo(10));
      });

      test('inRange generator', () {
        final rand = Random('test');
        final inRangeGen = Gen.inRange(0, 10);
        final result = inRangeGen.generate(rand);
        expect(result.value, isA<int>());
        expect(result.value, greaterThanOrEqualTo(0));
        expect(result.value, lessThan(10));
      });

      test('ascii string generator', () {
        final rand = Random('test');
        final asciiGen = Gen.asciiString(minLength: 1, maxLength: 5);
        final result = asciiGen.generate(rand);
        expect(result.value, isA<String>());
        expect(result.value.length, greaterThanOrEqualTo(1));
        expect(result.value.length, lessThanOrEqualTo(5));
      });

      test('unicode string generator', () {
        final rand = Random('test');
        final unicodeGen = Gen.unicodeString(minLength: 1, maxLength: 5);
        final result = unicodeGen.generate(rand);
        expect(result.value, isA<String>());
        expect(result.value.length, greaterThanOrEqualTo(1));
        expect(result.value.length, lessThanOrEqualTo(5));
      });

      test('array generator', () {
        final rand = Random('test');
        final arrayGen = Gen.array(Gen.boolean(), minLength: 2, maxLength: 4);
        final result = arrayGen.generate(rand);
        expect(result.value, isA<List<bool>>());
        expect(result.value.length, greaterThanOrEqualTo(2));
        expect(result.value.length, lessThanOrEqualTo(4));
      });

      test('unique array generator', () {
        final rand = Random('test');
        final uniqueArrayGen =
            Gen.uniqueArray(Gen.interval(1, 10), minLength: 3, maxLength: 3);
        final result = uniqueArrayGen.generate(rand);
        expect(result.value, isA<List<int>>());
        expect(result.value.length, equals(3));
        // All elements should be unique
        expect(result.value.toSet().length, equals(3));
      });

      test('set generator', () {
        final rand = Random('test');
        final setGen = Gen.set(Gen.interval(1, 3), minSize: 1, maxSize: 3);
        final result = setGen.generate(rand);
        expect(result.value, isA<Set<int>>());
        expect(result.value.length, greaterThanOrEqualTo(1));
        expect(result.value.length, lessThanOrEqualTo(3));
      });

      test('dictionary generator', () {
        final rand = Random('test');
        final dictGen = Gen.dictionary(
          Gen.asciiString(minLength: 1, maxLength: 2),
          Gen.interval(0, 5),
          minSize: 2,
          maxSize: 5,
        );
        final result = dictGen.generate(rand);
        expect(result.value, isA<Map<String, int>>());
        expect(result.value.length, greaterThanOrEqualTo(2));
        expect(result.value.length, lessThanOrEqualTo(5));
      });

      test('tuple generator', () {
        final rand = Random('test');
        final tupleGen = Gen.tuple(
            [Gen.float(), Gen.asciiString(minLength: 0, maxLength: 10)]);
        final result = tupleGen.generate(rand);
        expect(result.value, isA<List<dynamic>>());
        expect(result.value.length, equals(2));
        expect(result.value[0], isA<double>());
        expect(result.value[1], isA<String>());
      });

      test('just generator', () {
        final rand = Random('test');
        final justGen = Gen.just('Hello World');
        final result = justGen.generate(rand);
        expect(result.value, equals('Hello World'));
      });

      test('lazy generator', () {
        final rand = Random('test');
        int counter = 0;
        final lazyGen = Gen.lazy(() => 'Generated: ${++counter}');
        final result1 = lazyGen.generate(rand);
        final result2 = lazyGen.generate(rand);
        expect(result1.value, equals('Generated: 1'));
        expect(result2.value, equals('Generated: 2'));
      });
    });

    group('Combinators Documentation Examples', () {
      test('just combinator', () {
        final rand = Random('test');
        final constGen = Gen.just('Hello World');
        final result = constGen.generate(rand);
        expect(result.value, equals('Hello World'));
      });

      test('lazy combinator', () {
        final rand = Random('test');
        int counter = 0;
        final lazyGen = Gen.lazy(() => 'Generated: ${++counter}');
        final result = lazyGen.generate(rand);
        expect(result.value, startsWith('Generated: '));
      });

      test('elementOf combinator', () {
        final rand = Random('test');
        final elementGen = Gen.elementOf([2, 3, 5, 7]);
        final result = elementGen.generate(rand);
        expect([2, 3, 5, 7], contains(result.value));
      });

      test('oneOf combinator', () {
        final rand = Random('test');
        final oneOfGen = Gen.oneOf([
          Gen.interval(0, 10),
          Gen.interval(20, 30),
        ]);
        final result = oneOfGen.generate(rand);
        expect(result.value, isA<int>());
        expect(
            (result.value >= 0 && result.value <= 10) ||
                (result.value >= 20 && result.value <= 30),
            isTrue);
      });

      test('map combinator', () {
        final rand = Random('test');
        final mappedGen = Gen.interval(1, 100).map((n) => n.toString());
        final result = mappedGen.generate(rand);
        expect(result.value, isA<String>());
        expect(int.tryParse(result.value), isNotNull);
      });

      test('filter combinator', () {
        final rand = Random('test');
        final filteredGen = Gen.interval(0, 100).filter((n) => n % 2 == 0);
        final result = filteredGen.generate(rand);
        expect(result.value, isA<int>());
        expect(result.value % 2, equals(0));
      });

      test('flatMap combinator', () {
        final rand = Random('test');
        final flatMappedGen = Gen.interval(1, 5)
            .flatMap((n) => Gen.asciiString(minLength: n, maxLength: n));
        final result = flatMappedGen.generate(rand);
        expect(result.value, isA<String>());
        expect(result.value.length, greaterThanOrEqualTo(1));
        expect(result.value.length, lessThanOrEqualTo(5));
      });
    });

    group('Shrinking Documentation Examples', () {
      test('integer shrinking', () {
        final rand = Random('test');
        final intGen = Gen.interval(0, 100);
        final result = intGen.generate(rand);
        expect(result.value, isA<int>());
        expect(result.shrinks, isNotNull);
      });

      test('string shrinking', () {
        final rand = Random('test');
        final stringGen = Gen.asciiString(minLength: 1, maxLength: 10);
        final result = stringGen.generate(rand);
        expect(result.value, isA<String>());
        expect(result.shrinks, isNotNull);
      });

      test('array shrinking', () {
        final rand = Random('test');
        final arrayGen =
            Gen.array(Gen.interval(0, 10), minLength: 1, maxLength: 5);
        final result = arrayGen.generate(rand);
        expect(result.value, isA<List<int>>());
        expect(result.shrinks, isNotNull);
      });
    });

    // Note: Stateful testing examples temporarily removed due to complex type requirements
    // These can be added back once the stateful testing API is better understood
  });
}
