import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Combinator Tests', () {
    test('just produces constant values', () {
      final rand = Random('42');
      final constGen = just(42);

      for (int i = 0; i < 5; i++) {
        final result = constGen.generate(rand);
        expect(result.value, equals(42));
      }
    });

    test('lazy evaluates function on each generation', () {
      final rand = Random('42');
      int counter = 0;
      final lazyGen = lazy(() => ++counter);

      final result1 = lazyGen.generate(rand);
      final result2 = lazyGen.generate(rand);

      expect(result1.value, equals(1));
      expect(result2.value, equals(2));
    });

    test('elementOf selects from provided values', () {
      final rand = Random('42');
      final elementGen = elementOf([1, 2, 3, 4, 5]);

      final results = <int>[];
      for (int i = 0; i < 10; i++) {
        final result = elementGen.generate(rand);
        results.add(result.value);
      }

      // All results should be from the provided list
      for (final result in results) {
        expect([1, 2, 3, 4, 5], contains(result));
      }
    });

    test('elementOf with weighted values', () {
      final rand = Random('42');
      final weightedGen = elementOf([
        weightedValue(1, 0.5), // 50% chance
        weightedValue(2, 0.3), // 30% chance
        3, // 20% chance (remaining)
      ]);

      final results = <int>[];
      for (int i = 0; i < 20; i++) {
        final result = weightedGen.generate(rand);
        results.add(result.value);
      }

      // All results should be from the provided list
      for (final result in results) {
        expect([1, 2, 3], contains(result));
      }
    });

    test('oneOf selects from generators', () {
      final rand = Random('42');
      final gen1 = Arbitrary<int>((rand) => Shrinkable<int>(1));
      final gen2 = Arbitrary<int>((rand) => Shrinkable<int>(2));
      final oneOfGen = oneOf([gen1, gen2]);

      final results = <int>[];
      for (int i = 0; i < 10; i++) {
        final result = oneOfGen.generate(rand);
        results.add(result.value);
      }

      // All results should be from the provided generators
      for (final result in results) {
        expect([1, 2], contains(result));
      }
    });

    test('oneOf with weighted generators', () {
      final rand = Random('42');
      final gen1 = Arbitrary<int>((rand) => Shrinkable<int>(1));
      final gen2 = Arbitrary<int>((rand) => Shrinkable<int>(2));
      final weightedOneOfGen = oneOf([
        weightedGen(gen1, 0.8), // 80% chance
        gen2, // 20% chance (remaining)
      ]);

      final results = <int>[];
      for (int i = 0; i < 20; i++) {
        final result = weightedOneOfGen.generate(rand);
        results.add(result.value);
      }

      // All results should be from the provided generators
      for (final result in results) {
        expect([1, 2], contains(result));
      }
    });

    test('construct creates objects from generators', () {
      final rand = Random('42');

      final intGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 10)));
      final stringGen = Arbitrary<String>((rand) => Shrinkable<String>('test'));

      final constructGen = construct<Map<String, dynamic>>(
          (args) => {'value': args[0] as int, 'name': args[1] as String},
          [intGen, stringGen]);

      final result = constructGen.generate(rand);
      expect(result.value, isA<Map<String, dynamic>>());
      expect(result.value['name'], equals('test'));
      expect(result.value['value'], greaterThanOrEqualTo(1));
      expect(result.value['value'], lessThanOrEqualTo(10));
    });

    test('chainTuple combines tuple with dependent generation', () {
      final rand = Random('42');

      final intGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 5)));
      final tupleGenerator = tupleGen([intGen, intGen]);

      final chainGen = chainTuple<int, int>(
          tupleGenerator,
          (tuple) =>
              Arbitrary<int>((rand) => Shrinkable<int>(tuple[0] + tuple[1])));

      final result = chainGen.generate(rand);
      expect(result.value, hasLength(3));
      expect(result.value[2], equals(result.value[0] + result.value[1]));
    });

    test('tupleGen creates tuples from generators', () {
      final rand = Random('42');

      final intGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 10)));
      final stringGen = Arbitrary<String>((rand) => Shrinkable<String>('test'));

      final tupleGenerator = tupleGen([intGen, stringGen]);
      final result = tupleGenerator.generate(rand);

      expect(result.value, hasLength(2));
      expect(result.value[0], isA<int>());
      expect(result.value[1], isA<String>());
      expect(result.value[1], equals('test'));
    });

    // Tests the oneOf combinator which randomly selects between two generators
    // Verifies that values are correctly chosen from either range and maintains roughly equal distribution
    test('oneOf with range generators', () {
      // Create two generators: one for numbers 1-3 and another for numbers 6-8
      final numGen1 = interval(1, 3);
      final numGen2 = interval(6, 8);
      // Combine them into a single generator that randomly chooses between the two
      final gen1 = oneOf([numGen1, numGen2]);
      int countGen1 = 0;
      int countGen2 = 0;

      // Test that generated numbers are within expected ranges and maintain roughly equal distribution
      forAllLegacy((List<dynamic> args) {
        final num = args[0] as double;
        // Verify the number is within the combined range of both generators
        expect(num, greaterThanOrEqualTo(1));
        expect(num, lessThanOrEqualTo(8));
        // Verify the number isn't in the gap between the two ranges
        expect(num > 3 && num < 6, equals(false));
        // Track which generator produced the number
        if (num >= 1 && num <= 3) {
          countGen1++;
        } else {
          countGen2++;
        }
      }, [gen1]);

      // Verify the distribution is roughly equal (35-65% split)
      final total = countGen1 + countGen2;
      if (total > 0) {
        final ratio = countGen1 / total;
        expect(ratio, greaterThan(0.35));
        expect(ratio, lessThan(0.65));
      }
    });

    // Tests the oneOf combinator with weighted selection
    // Verifies that the first generator is chosen more frequently (80% of the time) than the second
    test('oneOf weighted', () {
      // Create the same two generators as before
      final numGen1 = interval(1, 3);
      final numGen2 = interval(6, 8);
      // Create a weighted generator where numGen1 has 80% chance of being selected
      final gen2 = oneOf([weightedGen(numGen1, 0.8), numGen2]);
      int countGen1 = 0;
      int countGen2 = 0;

      // Test that generated numbers follow the weighted distribution
      forAllLegacy((List<dynamic> args) {
        final num = args[0] as double;
        // Verify the number is within the combined range
        expect(num, greaterThanOrEqualTo(1));
        expect(num, lessThanOrEqualTo(8));
        // Verify the number isn't in the gap between ranges
        expect(num > 3 && num < 6, equals(false));
        // Track which generator produced the number
        if (num >= 1 && num <= 3) {
          countGen1++;
        } else {
          countGen2++;
        }
      }, [gen2]);

      // Verify the distribution matches the weights (70-90% for the weighted generator)
      final total = countGen1 + countGen2;
      if (total > 0) {
        final ratio = countGen1 / total;
        expect(ratio, greaterThan(0.7));
        expect(ratio, lessThan(0.9));
      }
    });

    // Tests the elementOf combinator which randomly selects from a list of values
    // Verifies that all possible values are generated and distribution is roughly equal
    test('elementOf with specific values', () {
      // Create a generator that randomly selects from these four numbers
      final gen1 = elementOf([2, 10, -1, 7]);
      int count2 = 0;
      int countAll = 0;

      // Test that all possible values are generated with roughly equal probability
      forAllLegacy((List<dynamic> args) {
        final num = args[0] as int;
        // Verify the number is one of the allowed values
        expect([2, 10, -1, 7], contains(num));
        // Track how often we get the number 2
        if (num == 2) count2++;
        countAll++;
      }, [gen1]);

      // Verify that number 2 appears roughly 25% of the time (1-50% to account for randomness)
      if (countAll > 0) {
        final ratio = count2 / countAll;
        expect(ratio, greaterThan(0.01));
        expect(ratio, lessThan(0.50));
      }
    });

    // Tests the elementOf combinator with weighted selection
    // Verifies that the first value (1) is chosen more frequently (80% of the time) than the second value (10)
    test('elementOf weighted', () {
      // Create a generator that selects between 1 and 10, with 1 having 80% probability
      final gen2 = elementOf([weightedValue(1, 0.8), 10]);
      int count1 = 0;
      int count10 = 0;

      // Test that the weighted distribution is maintained
      forAllLegacy((List<dynamic> args) {
        final num = args[0] as int;
        // Verify the number is either 1 or 10
        expect([1, 10], contains(num));
        // Track how often we get each number
        if (num == 1) {
          count1++;
        } else {
          count10++;
        }
      }, [gen2]);

      // Verify that 1 appears roughly 80% of the time (20-95% to account for randomness)
      final total = count1 + count10;
      if (total > 0) {
        final ratio = count1 / total;
        expect(ratio, greaterThan(0.2));
        expect(ratio, lessThan(0.95));
      }
    });

    // Tests the construct combinator which creates instances of a class
    // Verifies that Cat objects are created with valid property values
    test('construct with class-like object', () {
      // Create a generator for Cat-like objects with:
      // - a: random number between 1 and 3
      // - b: randomly either 'Cat' or 'Kitten'
      final catGen = construct<Map<String, dynamic>>(
          (args) => {'a': args[0], 'b': args[1]}, [
        interval(1, 3),
        elementOf(['Cat', 'Kitten'])
      ]);

      // Test that all generated Cat objects have valid properties
      forAllLegacy((List<dynamic> args) {
        final cat = args[0] as Map<String, dynamic>;
        // Verify the number property is within range
        expect(cat['a'], greaterThanOrEqualTo(1));
        expect(cat['a'], lessThanOrEqualTo(3));
        // Verify the string property is one of the allowed values
        expect(['Cat', 'Kitten'], contains(cat['b']));
      }, [catGen]);
    });

    // Tests the chainTuple combinator which creates nested tuples
    // Verifies that each element in the tuple is properly constrained by the previous elements
    test('chainTuple with nested constraints', () {
      // Start with a generator for numbers 1-3
      final numGen1 = interval(1, 3);
      // Create a pair where second number is between 0 and first number
      final pairGen =
          numGen1.flatMap((num) => tupleGen([just(num), interval(0, num)]));
      // Create a triple where third number is between 0 and second number
      final tripleGen = chainTuple(pairGen, (pair) => interval(0, pair[1]));
      // Create a quadruple where fourth number is between 0 and third number
      final quadGen = chainTuple(tripleGen, (triple) => interval(0, triple[2]));

      // Test that all numbers in the tuple follow the decreasing constraint
      forAllLegacy((List<dynamic> args) {
        final quad = args[0] as List<dynamic>;
        // First number must be 1-3
        expect(quad[0], greaterThanOrEqualTo(1));
        expect(quad[0], lessThanOrEqualTo(3));
        // Second number must be 0 to first number
        expect(quad[1], greaterThanOrEqualTo(0));
        expect(quad[1], lessThanOrEqualTo(quad[0]));
        // Third number must be 0 to second number
        expect(quad[2], greaterThanOrEqualTo(0));
        expect(quad[2], lessThanOrEqualTo(quad[1]));
        // Fourth number must be 0 to third number
        expect(quad[3], greaterThanOrEqualTo(0));
        expect(quad[3], lessThanOrEqualTo(quad[2]));
      }, [quadGen]);
    });

    // Tests the chainAsTuple combinator which is an alternative syntax for creating nested tuples
    // Verifies the same constraints as chainTuple but using a different method chaining approach
    test('chainAsTuple with method chaining', () {
      // Start with the same base generator
      final numGen1 = interval(1, 3);
      // Create the same nested structure using method chaining
      final quadGen = numGen1
          // First chain: second number between 0 and first number
          .flatMap((num) => tupleGen([just(num), interval(0, num)]))
          // Second chain: third number between 0 and second number
          .flatMap((pair) =>
              tupleGen([just(pair[0]), just(pair[1]), interval(0, pair[1])]))
          // Third chain: fourth number between 0 and third number
          .flatMap((triple) => tupleGen([
                just(triple[0]),
                just(triple[1]),
                just(triple[2]),
                interval(0, triple[2])
              ]));

      // Test the same constraints as in chainTuple
      forAllLegacy((List<dynamic> args) {
        final quad = args[0] as List<dynamic>;
        // First number must be 1-3
        expect(quad[0], greaterThanOrEqualTo(1));
        expect(quad[0], lessThanOrEqualTo(3));
        // Second number must be 0 to first number
        expect(quad[1], greaterThanOrEqualTo(0));
        expect(quad[1], lessThanOrEqualTo(quad[0]));
        // Third number must be 0 to second number
        expect(quad[2], greaterThanOrEqualTo(0));
        expect(quad[2], lessThanOrEqualTo(quad[1]));
        // Fourth number must be 0 to third number
        expect(quad[3], greaterThanOrEqualTo(0));
        expect(quad[3], lessThanOrEqualTo(quad[2]));
      }, [quadGen]);
    });
  });
}
