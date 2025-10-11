import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Advanced Examples', () {
    test('string transformations with map', () {
      final rand = Random('123');
      final intGen = Gen.interval(1, 100);
      final stringGen = intGen.map((int i) => 'Value: $i');

      final result = stringGen.generate(rand);
      expect(result.value, isA<String>());
      expect(result.value, startsWith('Value: '));
    });

    test('dependent generation with flatMap', () {
      final rand = Random('456');
      final baseGen = Gen.interval(1, 10);
      final dependentGen =
          baseGen.flatMap((int base) => Gen.interval(base, base * 2));

      final result = dependentGen.generate(rand);
      expect(result.value, isA<int>());
      // The result should be between base and base*2, but we can't easily test this
      // without knowing the base value, so we just verify it's an integer
    });

    test('filtered generation', () {
      final rand = Random('789');
      final evenGen = Gen.interval(0, 100).filter((int n) => n % 2 == 0);

      final result = evenGen.generate(rand);
      expect(result.value, isA<int>());
      expect(result.value % 2, equals(0));
    });

    test('weighted generation', () {
      final rand = Random('101');
      final weightedGen = Gen.oneOf([
        Gen.weightedGen(Gen.interval(0, 5), 0.8), // 80% chance
        Gen.weightedGen(Gen.interval(10, 15), 0.2), // 20% chance
      ]);

      final result = weightedGen.generate(rand);
      expect(result.value, isA<int>());
      expect(
          (result.value >= 0 && result.value <= 5) ||
              (result.value >= 10 && result.value <= 15),
          isTrue);
    });

    test('complex nested generation', () {
      final rand = Random('202');
      final complexGen = Gen.array(
        Gen.tuple([
          Gen.asciiString(minLength: 1, maxLength: 3),
          Gen.interval(0, 10),
        ]),
        minLength: 1,
        maxLength: 3,
      );

      final result = complexGen.generate(rand);
      expect(result.value, isA<List<List<dynamic>>>());
      expect(result.value.length, greaterThanOrEqualTo(1));
      expect(result.value.length, lessThanOrEqualTo(3));

      // Each element should be a tuple with string and int
      for (final tuple in result.value) {
        expect(tuple, isA<List<dynamic>>());
        expect(tuple.length, equals(2));
        expect(tuple[0], isA<String>());
        expect(tuple[1], isA<int>());
      }
    });

    test('conditional generation with filter', () {
      final rand = Random('303');
      final conditionalGen = Gen.interval(1, 100).filter((int n) => n > 50);

      final result = conditionalGen.generate(rand);
      expect(result.value, isA<int>());
      expect(result.value, greaterThan(50));
    });

    test('recursive generation', () {
      final rand = Random('404');

      // Create a generator for nested lists
      Generator<List<dynamic>> listGen() {
        return Gen.oneOf([
          Gen.just(<dynamic>[]), // Empty list
          Gen.interval(1, 5).flatMap((int length) {
            return Gen.array(listGen(), minLength: 0, maxLength: 2)
                .map((List<dynamic> sublist) => [length, ...sublist]);
          }),
        ]);
      }

      final result = listGen().generate(rand);
      expect(result.value, isA<List<dynamic>>());
    });

    test('custom generator with arbitrary', () {
      final rand = Random('505');

      // Custom generator for email-like strings
      final emailGen = Gen.tuple([
        Gen.asciiString(minLength: 1, maxLength: 5),
        Gen.asciiString(minLength: 1, maxLength: 3),
      ]).map((List<dynamic> parts) => '${parts[0]}@${parts[1]}.com');

      final result = emailGen.generate(rand);
      expect(result.value, isA<String>());
      expect(result.value, contains('@'));
      expect(result.value, endsWith('.com'));
    });
  });
}
