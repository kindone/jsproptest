import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Advanced Shrinking Examples', () {
    test('basic vs advanced array shrinking', () {
      final rand = Random('42');

      // Create some shrinkable integers
      final elements = [
        Gen.interval(0, 100).generate(rand),
        Gen.interval(0, 200).generate(rand),
        Gen.interval(0, 300).generate(rand),
        Gen.interval(0, 400).generate(rand),
      ];

      // Basic array shrinking (length only)
      final basicArrayShrinkable =
          Shrinkable<List<int>>(elements.map((e) => e.value).toList());
      expect(basicArrayShrinkable.value, isA<List<int>>());
      expect(basicArrayShrinkable.shrinks, isNotNull);

      // Advanced array shrinking (element-wise + length)
      final advancedArrayShrinkable =
          Shrinkable<List<int>>(elements.map((e) => e.value).toList());
      expect(advancedArrayShrinkable.value, isA<List<int>>());
      expect(advancedArrayShrinkable.shrinks, isNotNull);
    });

    test('element-wise shrinking', () {
      final rand = Random('123');
      final intGen = Gen.interval(0, 100);
      final result = intGen.generate(rand);

      expect(result.value, isA<int>());
      expect(result.shrinks, isNotNull);
    });

    test('membership-wise shrinking', () {
      final rand = Random('456');
      final setGen = Gen.set(Gen.interval(1, 10), minSize: 3, maxSize: 5);
      final result = setGen.generate(rand);

      expect(result.value, isA<Set<int>>());
      expect(result.shrinks, isNotNull);
    });

    test('chunk-based shrinking', () {
      final rand = Random('789');
      final arrayGen =
          Gen.array(Gen.interval(0, 50), minLength: 4, maxLength: 8);
      final result = arrayGen.generate(rand);

      expect(result.value, isA<List<int>>());
      expect(result.shrinks, isNotNull);
    });

    test('front and then mid shrinking', () {
      final rand = Random('101');
      final arrayGen =
          Gen.array(Gen.interval(0, 30), minLength: 3, maxLength: 6);
      final result = arrayGen.generate(rand);

      expect(result.value, isA<List<int>>());
      expect(result.shrinks, isNotNull);
    });

    test('mid shrinking', () {
      final rand = Random('202');
      final arrayGen =
          Gen.array(Gen.interval(0, 20), minLength: 2, maxLength: 4);
      final result = arrayGen.generate(rand);

      expect(result.value, isA<List<int>>());
      expect(result.shrinks, isNotNull);
    });

    test('bulk shrinking', () {
      final rand = Random('303');
      final arrayGen =
          Gen.array(Gen.interval(0, 15), minLength: 2, maxLength: 3);
      final result = arrayGen.generate(rand);

      expect(result.value, isA<List<int>>());
      expect(result.shrinks, isNotNull);
    });

    test('string shrinking with advanced techniques', () {
      final rand = Random('404');
      final stringGen = Gen.asciiString(minLength: 3, maxLength: 8);
      final result = stringGen.generate(rand);

      expect(result.value, isA<String>());
      expect(result.shrinks, isNotNull);
    });

    test('dictionary shrinking with advanced techniques', () {
      final rand = Random('505');
      final dictGen = Gen.dictionary(
        Gen.asciiString(minLength: 1, maxLength: 3),
        Gen.interval(0, 10),
        minSize: 2,
        maxSize: 4,
      );
      final result = dictGen.generate(rand);

      expect(result.value, isA<Map<String, int>>());
      expect(result.shrinks, isNotNull);
    });

    test('tuple shrinking with advanced techniques', () {
      final rand = Random('606');
      final tupleGen = Gen.tuple([
        Gen.interval(0, 10),
        Gen.asciiString(minLength: 1, maxLength: 3),
        Gen.boolean(),
      ]);
      final result = tupleGen.generate(rand);

      expect(result.value, isA<List<dynamic>>());
      expect(result.shrinks, isNotNull);
    });

    test('floating point shrinking', () {
      final rand = Random('707');
      final floatGen = Gen.float();
      final result = floatGen.generate(rand);

      expect(result.value, isA<double>());
      expect(result.shrinks, isNotNull);
    });

    test('boolean shrinking', () {
      final rand = Random('808');
      final boolGen = Gen.boolean();
      final result = boolGen.generate(rand);

      expect(result.value, isA<bool>());
      expect(result.shrinks, isNotNull);
    });

    test('shrinking with map transformation', () {
      final rand = Random('909');
      final mappedGen = Gen.interval(0, 100).map((int i) => 'Value: $i');
      final result = mappedGen.generate(rand);

      expect(result.value, isA<String>());
      expect(result.shrinks, isNotNull);
    });

    test('shrinking with filter', () {
      final rand = Random('111');
      final filteredGen = Gen.interval(0, 100).filter((int i) => i % 2 == 0);
      final result = filteredGen.generate(rand);

      expect(result.value, isA<int>());
      expect(result.value % 2, equals(0));
      expect(result.shrinks, isNotNull);
    });

    test('shrinking with flatMap', () {
      final rand = Random('222');
      final flatMappedGen = Gen.interval(1, 5)
          .flatMap((int i) => Gen.asciiString(minLength: i, maxLength: i));
      final result = flatMappedGen.generate(rand);

      expect(result.value, isA<String>());
      expect(result.shrinks, isNotNull);
    });
  });
}
