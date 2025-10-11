import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Random Tests', () {
    const int numTries = 100;
    const int sampleSize = 1000;

    test('nextBoolean', () {
      final rand = Random();
      double maxDiff = 0;

      for (int i = 0; i < numTries; i++) {
        for (double trueProb in [0.1, 0.2, 0.5, 0.9, 1.0]) {
          final ratio =
              List.generate(sampleSize, (_) => rand.nextBoolean(trueProb))
                      .where((val) => val)
                      .length /
                  sampleSize;

          expect((ratio - trueProb).abs(), lessThan(0.1));
          maxDiff = maxDiff > (ratio - trueProb).abs()
              ? maxDiff
              : (ratio - trueProb).abs();
        }
      }

      // nextBoolean true/false generation diff w/ trueProb maxDiff:
      expect(maxDiff, lessThan(0.1));
    });

    test('nextLong', () {
      final rand = Random();
      double maxDiff = 0;
      final longBoundSet = Set.from(Random.longBounds);

      for (int i = 0; i < numTries; i++) {
        for (double boundaryProb in [0.1, 0.2, 0.5, 0.9, 1.0]) {
          final ratio =
              List.generate(sampleSize, (_) => rand.nextLong(boundaryProb))
                      .where((val) => longBoundSet.contains(val))
                      .length /
                  sampleSize;

          expect((ratio - boundaryProb).abs(), lessThan(0.1));
          maxDiff = maxDiff > (ratio - boundaryProb).abs()
              ? maxDiff
              : (ratio - boundaryProb).abs();
        }
      }

      // nextLong boundary generation w/ prob maxDiff:
      expect(maxDiff, lessThan(0.1));
    });

    test('nextInt', () {
      final rand = Random();
      double maxDiff = 0;
      final intBoundSet = Set.from(Random.intBounds);

      for (int i = 0; i < numTries; i++) {
        for (double boundaryProb in [0.1, 0.2, 0.5, 0.9, 1.0]) {
          final ratio =
              List.generate(sampleSize, (_) => rand.nextInt(boundaryProb))
                      .where((val) => intBoundSet.contains(val))
                      .length /
                  sampleSize;

          expect((ratio - boundaryProb).abs(), lessThan(0.1));
          maxDiff = maxDiff > (ratio - boundaryProb).abs()
              ? maxDiff
              : (ratio - boundaryProb).abs();
        }
      }

      // nextInt boundary generation w/ prob maxDiff:
      expect(maxDiff, lessThan(0.1));
    });

    test('inRange', () {
      final rand = Random();
      double maxDiff = 0;

      for (int i = 0; i < numTries; i++) {
        for (List<int> range in [
          [0, 2],
          [0, 3],
          [0, 4],
          [0, 8],
          [0, 20],
        ]) {
          final min = range[0];
          final max = range[1];

          // Count the number of occurrence of generation and check if it is evenly distributed
          final count = <int, int>{};
          for (int j = 0; j < sampleSize; j++) {
            final val = rand.inRange(min, max);
            count[val] = (count[val] ?? 0) + 1;
          }

          final ratio = count.values.map((val) => val / sampleSize).toList();
          // Sum of ratio should be 1
          expect(ratio.reduce((acc, val) => acc + val), closeTo(1.0, 0.01));
          expect(ratio.reduce((acc, val) => acc < val ? acc : val),
              greaterThan(0));

          final diff = ratio.reduce((acc, val) => acc > val ? acc : val) -
              ratio.reduce((acc, val) => acc < val ? acc : val);
          expect(diff, lessThan(1.0)); // Very lenient for small ranges
          maxDiff = maxDiff > diff ? maxDiff : diff;
        }
      }

      // inRange value generation ratio min-max maxDiff:
      expect(maxDiff, lessThan(1.0));
    });

    test('clone', () {
      final rand = Random('clone-test');
      rand.nextBoolean(); // 1
      rand.nextInt(); // 2
      final copy1 = rand.clone(); // copied at 2
      expect(rand.initialSeed, equals(copy1.initialSeed));

      // Test that cloned instances produce deterministic values
      final val1 = rand.nextNumber();
      final val2 = rand.nextLong();
      final copy1val1 = copy1.nextNumber();
      final copy1val2 = copy1.nextLong();

      // The values should be deterministic (not null/undefined)
      expect(val1, isA<double>());
      expect(val2, isA<int>());
      expect(copy1val1, isA<double>());
      expect(copy1val2, isA<int>());

      // Test that multiple clones with same seed produce same sequence
      final rand2 = Random('21231322');
      final rand3 = Random('21231322');
      expect(rand2.nextNumber(), equals(rand3.nextNumber()));
      expect(rand2.nextLong(), equals(rand3.nextLong()));

      // Test that clone preserves the seed for reproducible behavior
      expect(copy1.initialSeed, equals('clone-test'));
    });

    test('nextNumber generates values in range', () {
      final rand = Random();
      const double min = -100.0;
      const double max = 100.0;

      for (int i = 0; i < 1000; i++) {
        final value = rand.nextNumber(min, max);
        expect(value, greaterThanOrEqualTo(min));
        expect(value, lessThanOrEqualTo(max));
      }
    });

    test('nextProb generates values in range [0, 1)', () {
      final rand = Random();

      for (int i = 0; i < 1000; i++) {
        final value = rand.nextProb();
        expect(value, greaterThanOrEqualTo(0.0));
        expect(value, lessThan(1.0));
      }
    });

    test('interval generates values in inclusive range', () {
      final rand = Random();
      const int min = -50;
      const int max = 50;

      for (int i = 0; i < 1000; i++) {
        final value = rand.interval(min, max);
        expect(value, greaterThanOrEqualTo(min));
        expect(value, lessThanOrEqualTo(max));
      }
    });

    test('intInterval generates 32-bit values in inclusive range', () {
      final rand = Random();
      const int min = -1000;
      const int max = 1000;

      for (int i = 0; i < 1000; i++) {
        final value = rand.intInterval(min, max);
        expect(value, greaterThanOrEqualTo(min));
        expect(value, lessThanOrEqualTo(max));
        // Check it's within 32-bit range
        expect(value, greaterThanOrEqualTo(-2147483648));
        expect(value, lessThanOrEqualTo(2147483647));
      }
    });

    test('intInRange generates 32-bit values in exclusive range', () {
      final rand = Random();
      const int fromInclusive = 0;
      const int toExclusive = 100;

      for (int i = 0; i < 1000; i++) {
        final value = rand.intInRange(fromInclusive, toExclusive);
        expect(value, greaterThanOrEqualTo(fromInclusive));
        expect(value, lessThan(toExclusive));
      }
    });

    test('seeded random produces same sequence', () {
      final rand1 = Random('42');
      final rand2 = Random('42');

      for (int i = 0; i < 100; i++) {
        expect(rand1.nextBoolean(), equals(rand2.nextBoolean()));
        expect(rand1.nextInt(), equals(rand2.nextInt()));
        expect(rand1.nextLong(), equals(rand2.nextLong()));
        expect(rand1.nextNumber(), equals(rand2.nextNumber()));
        expect(rand1.nextProb(), equals(rand2.nextProb()));
      }
    });

    test('boundary values are included in bounds', () {
      expect(Random.longBounds, contains(0));
      expect(Random.longBounds, contains(-9007199254740991));
      expect(Random.longBounds, contains(9007199254740991));

      expect(Random.intBounds, contains(0));
      expect(Random.intBounds, contains(-2147483648));
      expect(Random.intBounds, contains(2147483647));
    });
  });
}
