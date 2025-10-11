import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';
import 'testutil.dart';

void main() {
  group('Generator Interface Tests', () {
    test('map transformation works', () {
      final rand = Random('42');
      final intGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 10)));
      final stringGen = intGen.map((int i) => 'Number: $i');

      final result = stringGen.generate(rand);
      expect(result.value, startsWith('Number: '));
      expect(result.value, contains(RegExp(r'\d+')));
    });

    test('flatMap chaining works', () {
      final rand = Random('42');
      final intGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 5)));
      final chainedGen = intGen.flatMap((int i) =>
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(i, i + 10))));

      final result = chainedGen.generate(rand);
      expect(result.value, greaterThanOrEqualTo(1));
      expect(result.value, lessThanOrEqualTo(15));
    });

    test('chain preserves original value', () {
      final rand = Random('42');
      final intGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 5)));
      final chainedGen = intGen.chain((int i) =>
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(i, i + 10))));

      final result = chainedGen.generate(rand);
      expect(result.value.$1, greaterThanOrEqualTo(1));
      expect(result.value.$1, lessThanOrEqualTo(5));
      expect(result.value.$2, greaterThanOrEqualTo(result.value.$1));
      expect(result.value.$2, lessThanOrEqualTo(result.value.$1 + 10));
    });

    test('filter works correctly', () {
      final rand = Random('42');
      final intGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 20)));
      final evenGen = intGen.filter((int i) => i % 2 == 0);

      final result = evenGen.generate(rand);
      expect(result.value % 2, equals(0));
    });
  });

  group('Arbitrary Implementation Tests', () {
    test('Arbitrary can be created and used', () {
      final rand = Random('42');
      final customGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 100)));

      final result = customGen.generate(rand);
      expect(result.value, greaterThanOrEqualTo(1));
      expect(result.value, lessThanOrEqualTo(100));
    });

    test('Arbitrary with map works', () {
      final rand = Random('42');
      final customGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 10)));
      final doubledGen = customGen.map((int i) => i * 2);

      final result = doubledGen.generate(rand);
      expect(result.value % 2, equals(0));
      expect(result.value, greaterThanOrEqualTo(2));
      expect(result.value, lessThanOrEqualTo(20));
    });
  });

  group('Primitive Generator Tests', () {
    test('booleanGen distribution', () {
      final rand = Random('42');
      final gen = booleanGen();
      const numGenerations = 1000;
      int numTrue = 0;
      int numFalse = 0;

      for (int i = 0; i < numGenerations; i++) {
        final value = gen.generate(rand).value;
        if (value) {
          numTrue++;
        } else {
          numFalse++;
        }
      }
      expect(numTrue, greaterThan((numGenerations * 0.45).round()));
      expect(numFalse, greaterThan((numGenerations * 0.45).round()));
    });

    test('floatingGen distribution', () {
      final rand = Random('42');
      final gen = floatingGen();
      const numGenerations = 10000;
      final generatedValues = <double>[];

      for (int i = 0; i < numGenerations; i++) {
        final value = gen.generate(rand).value;
        generatedValues.add(value);
      }

      // Check that the generated values cover a reasonable range
      final minValue = generatedValues.reduce((a, b) => a < b ? a : b);
      final maxValue = generatedValues.reduce((a, b) => a > b ? a : b);

      // Assert that the minimum and maximum values are within a reasonable range
      expect(minValue, greaterThanOrEqualTo(-double.maxFinite));
      expect(maxValue, lessThanOrEqualTo(double.maxFinite));

      // Define regions to analyze the distribution of generated floats (floatingGen generates [0, 1))
      final regions = [
        {
          'range': [0.0, 0.1],
          'count': 0
        },
        {
          'range': [0.1, 0.2],
          'count': 0
        },
        {
          'range': [0.2, 0.3],
          'count': 0
        },
        {
          'range': [0.3, 0.4],
          'count': 0
        },
        {
          'range': [0.4, 0.5],
          'count': 0
        },
        {
          'range': [0.5, 0.6],
          'count': 0
        },
        {
          'range': [0.6, 0.7],
          'count': 0
        },
        {
          'range': [0.7, 0.8],
          'count': 0
        },
        {
          'range': [0.8, 0.9],
          'count': 0
        },
        {
          'range': [0.9, 1.0],
          'count': 0
        },
      ];

      // Count the number of generated values in each region
      for (final value in generatedValues) {
        for (int i = 0; i < regions.length; i++) {
          final region = regions[i];
          final range = region['range'] as List<double>;
          if (value > range[0] && value <= range[1]) {
            region['count'] = (region['count'] as int) + 1;
            break;
          }
        }
      }

      // Check that the distribution is reasonably uniform across the [0, 1) range
      // Most regions should have some values (at least 5 out of 10 regions)
      int regionsWithValues = 0;
      for (int i = 0; i < regions.length; i++) {
        if ((regions[i]['count'] as int) > 0) {
          regionsWithValues++;
        }
      }
      expect(regionsWithValues, greaterThanOrEqualTo(5));
    });

    test('interval small range', () {
      final rand = Random();
      final gen = interval(0, 1);
      const numGenerations = 10000;
      int num0 = 0;
      int num1 = 0;

      for (int i = 0; i < numGenerations; i++) {
        final value = gen.generate(rand).value;
        if (value == 0) {
          num0++;
        } else if (value == 1) {
          num1++;
        } else {
          throw Exception('unexpected value: $value');
        }
      }
      expect(num0, greaterThan((numGenerations * 0.40).round()));
      expect(num1, greaterThan((numGenerations * 0.40).round()));
    });

    test('interval range coverage', () {
      final rand = Random('42');
      final gen = interval(-10, 10);
      const numGenerations = 1000;
      final set = <int>{};

      for (int i = 0; i < numGenerations; i++) {
        final value = gen.generate(rand).value;
        expect(value, greaterThanOrEqualTo(-10));
        expect(value, lessThanOrEqualTo(10));
        set.add(value);
      }
      // With 1000 generations, we should get at least 10 out of 21 possible values
      expect(set.length, greaterThanOrEqualTo(10));
    });

    test('string generation', () {
      final rand = Random('42');
      final gen1 = asciiStringGen(0, 5);
      final set = <int>{};

      for (int i = 0; i < 1000; i++) {
        final value = gen1.generate(rand).value;
        expect(value.length, lessThanOrEqualTo(5));
        for (int j = 0; j < value.length; j++) {
          final code = value.codeUnitAt(j);
          expect(code, greaterThanOrEqualTo(0));
          expect(code, lessThanOrEqualTo(127));
        }
        set.add(value.length);
      }
      // With 1000 generations, we should get at least 4 out of 6 possible lengths
      expect(set.length, greaterThanOrEqualTo(4));

      final gen2 = unicodeStringGen(0, 10);
      final set2 = <int>{};
      for (int i = 0; i < 1000; i++) {
        final value = gen2.generate(rand).value;
        expect(value.length, lessThanOrEqualTo(10));
        set2.add(value.length);
      }
      // With 1000 generations, we should get at least 8 out of 11 possible lengths
      expect(set2.length, greaterThanOrEqualTo(8));
    });
  });

  group('Container Generator Tests', () {
    test('array generation', () {
      final rand = Random('42');
      final elemGen = interval(0, 5);
      final gen = arrayGen(elemGen, 5, 6);
      const numGenerations = 1000;
      final set = <double>{};

      for (int i = 0; i < numGenerations; i++) {
        final generatedArray = gen.generate(rand).value;
        expect(generatedArray.length, greaterThanOrEqualTo(5));
        expect(generatedArray.length, lessThanOrEqualTo(6));

        for (final value in generatedArray) {
          expect(value, greaterThanOrEqualTo(0));
          expect(value, lessThanOrEqualTo(5));
          set.add(value.toDouble());
        }
      }

      // Check that all values from 0 to 5 are present
      for (int i = 0; i <= 5; i++) {
        expect(set.contains(i.toDouble()), isTrue);
      }
    });

    test('set generation', () {
      final rand = Random('42');
      final elemGen = interval(0, 8);
      final gen = setGen(elemGen, 4, 8);

      forAllLegacy((List<dynamic> args) {
        final set = args[0] as Set<double>;
        expect(set.length, greaterThanOrEqualTo(4));
        expect(set.length, lessThanOrEqualTo(8));
        expect(set.every((num) => num >= 0 && num <= 8), isTrue);
      }, [gen]);
    });

    test('dictionary generation', () {
      final rand = Random('42');
      final elemGen = interval(0, 4);
      final keyGen = asciiStringGen(1, 2);
      final gen = dictionaryGen(keyGen, elemGen, 4, 8);

      forAllLegacy((List<dynamic> args) {
        final dict = args[0] as Map<String, double>;
        final size = dict.length;
        expect(size, greaterThanOrEqualTo(4));
        expect(size, lessThanOrEqualTo(8));
        expect(dict.values.every((value) => value >= 0 && value <= 4), isTrue);
      }, [gen]);
    });

    test('dictionary with int values', () {
      final rand = Random('42');
      final keyGen = asciiStringGen(1, 5);
      final elemGen = interval(0, 5);
      final gen = dictionaryGen(keyGen, elemGen, 3, 7);

      forAllLegacy((List<dynamic> args) {
        final dict = args[0] as Map<String, double>;
        final keys = dict.keys.toList();
        final values = dict.values.toList();
        final size = keys.length;

        expect(size, greaterThanOrEqualTo(3));
        expect(size, lessThanOrEqualTo(7));

        // Check key types
        for (final key in keys) {
          expect(key, isA<String>());
          expect(key.length, greaterThanOrEqualTo(1));
          expect(key.length, lessThanOrEqualTo(5));
        }

        // Check value types
        for (final value in values) {
          expect(value, greaterThanOrEqualTo(0));
          expect(value, lessThanOrEqualTo(5));
        }
      }, [gen]);
    });

    test('tuple generation', () {
      final rand = Random('42');
      final numGen = interval(0, 3);
      final boolGen = booleanGen();
      final gen = tupleGen([numGen, boolGen]);

      forAllLegacy((List<dynamic> args) {
        final tuple = args[0] as List<dynamic>;
        final num = tuple[0] as double;
        final boolValue = tuple[1] as bool;
        expect(num, greaterThanOrEqualTo(0));
        expect(num, lessThanOrEqualTo(3));
        expect(boolValue, isA<bool>());
      }, [gen]);
    });

    test('big tuple generation', () {
      final rand = Random('42');
      final numGen = interval(0, 3);
      final gens = <Generator<int>>[];
      for (int i = 0; i < 800; i++) {
        gens.add(numGen);
      }
      final gen = tupleGen(gens);

      forAllLegacy((List<dynamic> args) {
        final bigTuple = args[0] as List<dynamic>;
        expect(bigTuple.length, equals(800));
        expect(bigTuple.every((num) => (num as int) >= 0 && num <= 3), isTrue);
      }, [gen]);
    });

    test('lazy deferred computation', () {
      final rand = Random('42');
      bool computationDone = false;
      int expensiveComputation() {
        computationDone = true;
        return 42;
      }

      // The computation shouldn't happen when the generator is defined
      final lazyGen = lazy(expensiveComputation);
      expect(computationDone, isFalse);

      // The computation should happen only when generate is called
      final result = lazyGen.generate(rand);
      expect(computationDone, isTrue);
      expect(result.value, equals(42));

      // Check subsequent calls also work
      computationDone = false;
      final result2 = lazyGen.generate(rand);
      expect(computationDone, isTrue);
      expect(result2.value, equals(42));
    });

    test('recursive generator', () {
      final rand = Random('42');

      // Define the recursive type: a node containing a number and optionally another node
      // Using Map to represent the node structure
      Generator<Map<String, dynamic>?> createNodeGen() {
        return oneOf([
          weightedGen(just<Map<String, dynamic>?>(null), 0.8),
          weightedGen(
              interval(0, 100).flatMap((value) => createNodeGen()
                  .map((next) => {'value': value, 'next': next})),
              0.2)
        ]);
      }

      final nodeGen = createNodeGen();
      int maxFoundDepth = 0;

      forAllLegacy((List<dynamic> args) {
        final node = args[0] as Map<String, dynamic>?;
        Map<String, dynamic>? current = node;
        int depth = 0;
        const maxDepth = 20;

        while (current != null && depth < maxDepth) {
          expect(current['value'], isA<int>());
          expect(current['value'], greaterThanOrEqualTo(0));
          expect(current['value'], lessThanOrEqualTo(100));
          current = current['next'] as Map<String, dynamic>?;
          depth++;
        }
        if (depth > maxFoundDepth) maxFoundDepth = depth;
      }, [nodeGen]);

      // Check if recursive generator is working by ensuring at least some recursive calls are made
      expect(maxFoundDepth, greaterThan(0));
    });
  });

  group('Combinator Tests', () {
    test('combination utility', () {
      final rand = Random('42');

      int combination(int n, int r) {
        int result = 1;
        for (int i = 1; i <= r; i++) {
          result *= n--;
          result ~/= i;
        }
        return result;
      }

      final pairGen =
          interval(1, 30).flatMap((n) => tupleGen([just(n), interval(0, n)]));

      forAllLegacy((List<dynamic> args) {
        final tuple = args[0] as List<dynamic>;
        final n = (tuple[0] as double).toInt();
        final r = (tuple[1] as double).toInt();
        final result = combination(n, r);
        expect(result, equals(result.floor()));
      }, [pairGen]);
    });

    test('set shrink exhaustive', () {
      final rand = Random('42');

      int combination(int n, int r) {
        int result = 1;
        for (int i = 1; i <= r; i++) {
          result *= n--;
          result ~/= i;
        }
        return result;
      }

      int sumCombinations(int n, int maxR) {
        if (maxR < 0) return 0;
        int result = 0;
        for (int r = 0; r <= maxR; r++) {
          result += combination(n, r);
        }
        return result;
      }

      const upperBound = 10;
      final minAndMaxSizeGen = interval(0, upperBound)
          .flatMap((n) => tupleGen([just(n), interval(n, upperBound)]));

      forAllLegacy((List<dynamic> args) {
        final tuple = args[0] as List<dynamic>;
        final minSize = (tuple[0] as double).toInt();
        final maxSize = (tuple[1] as double).toInt();
        final elemGen = interval(0, 99);
        final gen = setGen(elemGen, minSize, maxSize);

        for (int i = 0; i < 3; i++) {
          final set = <String>{};
          int numTotal = 0;
          final root = gen.generate(rand);

          // Exhaustively explore all shrinks from the root value
          exhaustive(root, 0, (shrinkable, _level) {
            numTotal++;

            // Check that the shrunk value adheres to the original constraints
            expect(shrinkable.value.length, greaterThanOrEqualTo(minSize));
            expect(shrinkable.value.length, lessThanOrEqualTo(maxSize));
            expect(
                shrinkable.value.every((num) => num >= 0 && num <= 99), isTrue);

            // Stringify the set to check for uniqueness among shrinks
            final str = serializeShrinkable(shrinkable);
            if (set.contains(str)) {
              throw Exception('$str already exists in the shrinks');
            }
            set.add(str);
          });

          final size = root.value.length;
          // Assert that the total number of unique shrinks generated matches the expected number of combinations
          expect(numTotal,
              equals((1 << size) - sumCombinations(size, minSize - 1)));
        }
      }, [minAndMaxSizeGen]);
    });

    test('filter combinator', () {
      final rand = Random('42');
      final numGen = interval(0, 3);
      final tupleGen = numGen.filter((n) => n == 3);

      forAllLegacy((List<dynamic> args) {
        final value = args[0] as double;
        expect(value, equals(3));
      }, [tupleGen]);
    });

    test('flatMap combinator', () {
      final rand = Random('42');
      final numGen = interval(0, 3);
      final tupleGenerator = numGen
          .flatMap((n) => tupleGen([just(n), just(2.0).map((v) => v * n)]));

      forAllLegacy((List<dynamic> args) {
        final tuple = args[0] as List<dynamic>;
        final num = tuple[0] as double;
        final product = tuple[1] as double;
        expect(num, greaterThanOrEqualTo(0));
        expect(num, lessThanOrEqualTo(3));
        expect(product, equals(num * 2));
      }, [tupleGenerator]);
    });

    test('flatMap dependent sequence', () {
      final rand = Random('42');
      Generator<int> gengen(int n) => interval(n, n + 1);
      Generator<int> gen1 = gengen(0);

      for (int i = 1; i < 20; i++) {
        gen1 = gen1.flatMap((num) => gengen(num));
      }

      forAllLegacy((List<dynamic> args) {
        final value = args[0] as int;
        expect(value, greaterThanOrEqualTo(0));
        expect(value, lessThanOrEqualTo(20));
      }, [gen1]);
    });

    // TODO: Implement aggregate combinator
    // test('aggregate combinator', () {
    //   final rand = Random('42');
    //   Generator<List<double>> gen1 = interval(0, 1).map((num) => [num]);
    //   final gen = gen1.aggregate(
    //     (nums) {
    //       final last = nums[nums.length - 1];
    //       return interval(last, last + 1).map((num) => [...nums, num]);
    //     },
    //     2,
    //     4
    //   );

    //   forAllLegacy((List<dynamic> args) {
    //     final generatedArray = args[0] as List<dynamic>;
    //     expect(generatedArray.length, greaterThanOrEqualTo(2));
    //     expect(generatedArray.length, lessThanOrEqualTo(4));
    //     expect(generatedArray.every((num, index) =>
    //       index == 0 || (num as double) >= (generatedArray[index - 1] as double)
    //     ), isTrue);
    //   }, [gen]);
    // });

    // TODO: Implement accumulate combinator
    // test('accumulate combinator', () {
    //   final rand = Random('42');
    //   Generator<double> gen1 = interval(0, 2);
    //   final gen = gen1.accumulate((num) => interval(num, num + 2), 2, 4);

    //   forAllLegacy((List<dynamic> args) {
    //     final generatedArray = args[0] as List<dynamic>;
    //     expect(generatedArray.length, greaterThanOrEqualTo(2));
    //     expect(generatedArray.length, lessThanOrEqualTo(4));
    //     expect(generatedArray.every((num, index) =>
    //       index == 0 || (num as double) >= (generatedArray[index - 1] as double)
    //     ), isTrue);
    //   }, [gen]);
    // });

    // test('accumulate many', () {
    //   final rand = Random('42');
    //   Generator<double> gen1 = interval(0, 2);
    //   final gen = gen1.accumulate((num) => interval(num, num + 2), 2, 4);

    //   forAllLegacy((List<dynamic> args) {
    //     final nums = args[0] as List<dynamic>;
    //     expect(nums.length, greaterThanOrEqualTo(2));
    //     expect(nums.length, lessThanOrEqualTo(4));
    //     expect(nums.every((num, index) =>
    //       index == 0 || (num as double) >= (nums[index - 1] as double)
    //     ), isTrue);
    //   }, [gen]);
    // });
  });
}
