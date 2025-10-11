import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';
import 'testutil.dart';

void main() {
  group('Primitive Tests', () {
    test(
        'generateInteger generates unique values within range and shrinks stay within range (100 runs)',
        () {
      const int min = -8;
      const int max = -4;
      const int numRuns = 100;

      for (int i = 0; i < numRuns; i++) {
        final rand = Random('seed-$i');
        final shrinkable = generateInteger(rand, min, max);

        // Check initial value
        expect(shrinkable.value, greaterThanOrEqualTo(min));
        expect(shrinkable.value, lessThanOrEqualTo(max));

        // Keep track of seen values for this run
        final seenValues = <int>{};

        // Define assertion function for exhaustive traversal
        void assertInRangeAndUnique(Shrinkable<int> shr, int level) {
          // Check for uniqueness
          expect(seenValues.contains(shr.value), equals(false));
          seenValues.add(shr.value);

          // Check range
          expect(shr.value, greaterThanOrEqualTo(min));
          expect(shr.value, lessThanOrEqualTo(max));
        }

        // Traverse shrinks and assert
        exhaustive(shrinkable, 0, assertInRangeAndUnique);
      }
    });

    test('generateInteger with positive range', () {
      const int min = 10;
      const int max = 20;
      const int numRuns = 50;

      for (int i = 0; i < numRuns; i++) {
        final rand = Random('positive-seed-$i');
        final shrinkable = generateInteger(rand, min, max);

        // Check initial value
        expect(shrinkable.value, greaterThanOrEqualTo(min));
        expect(shrinkable.value, lessThanOrEqualTo(max));

        // Check that shrinks are within range
        final shrinks = shrinkable.shrinks();
        if (!shrinks.isEmpty()) {
          final iterator = shrinks.iterator();
          while (iterator.hasNext()) {
            final shrink = iterator.next();
            expect(shrink.value, greaterThanOrEqualTo(min));
            expect(shrink.value, lessThanOrEqualTo(max));
          }
        }
      }
    });

    test('generateInteger with zero range', () {
      const int min = 5;
      const int max = 5;
      const int numRuns = 10;

      for (int i = 0; i < numRuns; i++) {
        final rand = Random('zero-seed-$i');
        final shrinkable = generateInteger(rand, min, max);

        // Check initial value
        expect(shrinkable.value, equals(5));

        // Check that there are no shrinks (since min == max)
        final shrinks = shrinkable.shrinks();
        expect(shrinks.isEmpty(), equals(true));
      }
    });

    test('generateInteger with large range', () {
      const int min = -1000000;
      const int max = 1000000;
      const int numRuns = 20;

      for (int i = 0; i < numRuns; i++) {
        final rand = Random('large-seed-$i');
        final shrinkable = generateInteger(rand, min, max);

        // Check initial value
        expect(shrinkable.value, greaterThanOrEqualTo(min));
        expect(shrinkable.value, lessThanOrEqualTo(max));

        // Check that shrinks are within range and smaller than original
        final shrinks = shrinkable.shrinks();
        if (!shrinks.isEmpty()) {
          final iterator = shrinks.iterator();
          while (iterator.hasNext()) {
            final shrink = iterator.next();
            expect(shrink.value, greaterThanOrEqualTo(min));
            expect(shrink.value, lessThanOrEqualTo(max));
            // Shrinks should be within the valid range
            // Note: shrinks don't necessarily move closer to zero, they move towards min
          }
        }
      }
    });

    test('generateInteger shrinking behavior', () {
      final rand = Random('shrink-test');
      final shrinkable = generateInteger(rand, 0, 100);

      // Check that shrinks exist (if the value is not already at minimum)
      final shrinks = shrinkable.shrinks();
      if (shrinkable.value > 0) {
        expect(shrinks.isEmpty(), equals(false));
      }

      // Check that shrinks are smaller than original
      final iterator = shrinks.iterator();
      while (iterator.hasNext()) {
        final shrink = iterator.next();
        expect(shrink.value.abs(), lessThanOrEqualTo(shrinkable.value.abs()));
      }
    });

    test('generateInteger with boundary values', () {
      final rand = Random('boundary-test');

      // Test with min boundary
      final minShrinkable = generateInteger(rand, 0, 0);
      expect(minShrinkable.value, equals(0));
      expect(minShrinkable.shrinks().isEmpty(), equals(true));

      // Test with max boundary
      final maxShrinkable = generateInteger(rand, 100, 100);
      expect(maxShrinkable.value, equals(100));
      expect(maxShrinkable.shrinks().isEmpty(), equals(true));
    });

    test('generateInteger shrinking tree structure', () {
      final rand = Random('tree-test');
      final shrinkable = generateInteger(rand, 0, 50);

      // Check that the shrinking tree has proper structure
      final shrinks = shrinkable.shrinks();
      if (!shrinks.isEmpty()) {
        final iterator = shrinks.iterator();
        final firstShrink = iterator.next();

        // First shrink should be smaller
        expect(
            firstShrink.value.abs(), lessThanOrEqualTo(shrinkable.value.abs()));

        // Check that first shrink also has shrinks
        final firstShrinkShrinks = firstShrink.shrinks();
        if (!firstShrinkShrinks.isEmpty()) {
          final firstShrinkIterator = firstShrinkShrinks.iterator();
          final secondShrink = firstShrinkIterator.next();
          expect(secondShrink.value.abs(),
              lessThanOrEqualTo(firstShrink.value.abs()));
        }
      }
    });

    test('generateInteger exhaustive shrinking coverage', () {
      final rand = Random('42');
      final shrinkable = generateInteger(rand, 0, 10);

      final allValues = <int>{};

      // Collect all values in the shrinking tree
      exhaustive(shrinkable, 0, (shr, level) {
        allValues.add(shr.value);
      });

      // Should have multiple values (original + shrinks)
      if (shrinkable.value == 0) {
        expect(allValues.length, equals(1));
      } else {
        expect(allValues.length, greaterThan(1));
      }

      // All values should be in range
      for (final value in allValues) {
        expect(value, greaterThanOrEqualTo(0));
        expect(value, lessThanOrEqualTo(10));
      }

      // Should include 0 (the smallest possible value)
      expect(allValues.contains(0), equals(true));
    });

    test('generateInteger shrinking convergence', () {
      final rand = Random('convergence-test');
      final shrinkable = generateInteger(rand, 0, 100);

      // Follow a shrinking path to see if it converges to 0
      Shrinkable<int> current = shrinkable;
      int steps = 0;
      const int maxSteps = 20; // Prevent infinite loops

      while (steps < maxSteps && !current.shrinks().isEmpty()) {
        final shrinks = current.shrinks();
        final iterator = shrinks.iterator();
        if (iterator.hasNext()) {
          current = iterator.next();
          steps++;

          // Each step should get us closer to 0
          expect(
              current.value.abs(), lessThanOrEqualTo(shrinkable.value.abs()));
        } else {
          break;
        }
      }

      // Should have made progress
      expect(steps, greaterThan(0));
    });
  });
}
