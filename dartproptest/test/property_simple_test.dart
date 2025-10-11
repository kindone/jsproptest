import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';
import 'package:dartproptest/src/generator/integer.dart';
import 'package:dartproptest/src/generator/string.dart';
import 'package:dartproptest/src/generator/boolean.dart';
import 'package:dartproptest/src/generator/floating.dart';
import 'package:dartproptest/src/generator/array.dart';
import 'package:dartproptest/src/generator/tuple.dart';
import 'package:dartproptest/src/combinator/just.dart';

void main() {
  group('Property Simple Tests', () {
    test('basic property with return', () {
      final prop = Property((int a, int b) {
        return a + b >= 0;
      });

      // Should not throw for non-negative numbers
      expect(
          () => prop
              .setNumRuns(10)
              .forAllLegacy([interval(0, 100), interval(0, 100)]),
          returnsNormally);
    });

    test('basic property with void function', () {
      final prop = Property((int a, int b) {
        expect(a + b, greaterThanOrEqualTo(0));
      });

      // Should not throw for non-negative numbers
      expect(
          () => prop
              .setNumRuns(10)
              .forAllLegacy([interval(0, 100), interval(0, 100)]),
          returnsNormally);
    });

    test('property with single argument', () {
      final prop = Property((int a) => a >= 0);

      expect(() => prop.setNumRuns(10).forAllLegacy([interval(0, 100)]),
          returnsNormally);
    });

    test('property with three arguments', () {
      final prop = Property((int a, int b, int c) => a + b + c >= 0);

      expect(
          () => prop.setNumRuns(10).forAllLegacy(
              [interval(0, 100), interval(0, 100), interval(0, 100)]),
          returnsNormally);
    });

    test('property with array argument', () {
      final prop = Property((List<int> arr) => arr.isEmpty || arr.first >= 0);

      expect(
          () => prop
              .setNumRuns(10)
              .forAllLegacy([arrayGen(interval(0, 100), 0, 10)]),
          returnsNormally);
    });

    test('property with string argument', () {
      final prop = Property((String s) => s.length >= 0);

      expect(() => prop.setNumRuns(10).forAllLegacy([asciiStringGen(0, 20)]),
          returnsNormally);
    });

    test('property with boolean argument', () {
      final prop = Property((bool b) => b == true || b == false);

      expect(() => prop.setNumRuns(10).forAllLegacy([booleanGen()]),
          returnsNormally);
    });

    test('property with floating point argument', () {
      final prop = Property((double d) => d >= 0.0);

      expect(() => prop.setNumRuns(10).forAllLegacy([floatingGen()]),
          returnsNormally);
    });

    test('property with setup and teardown', () {
      int setupCount = 0;
      int teardownCount = 0;

      final prop = Property((int a) {
        return a >= 0;
      }).setOnStartup(() => setupCount++).setOnCleanup(() => teardownCount++);

      prop.setNumRuns(10).forAllLegacy([interval(0, 100)]);

      // Setup should be called for each run
      expect(setupCount, equals(10));
      // Teardown should be called for each successful run
      expect(teardownCount, equals(10));
    });

    test('property with seeded random', () {
      final prop1 = Property((int a) => a >= 0).setSeed('42');
      final prop2 = Property((int a) => a >= 0).setSeed('42');

      // Both should generate the same sequence
      final results1 = <int>[];
      final results2 = <int>[];

      // Capture generated values (this is a bit hacky but works for testing)
      final gen1 = interval(0, 100);
      final gen2 = interval(0, 100);

      final rand1 = Random('42');
      final rand2 = Random('42');

      for (int i = 0; i < 10; i++) {
        results1.add(gen1.generate(rand1).value);
        results2.add(gen2.generate(rand2).value);
      }

      expect(results1, equals(results2));
    });

    test('property example method', () {
      final prop = Property((int a, int b) => a + b > 0);

      // Test with valid example
      expect(prop.example([5, 3]), equals(true));

      // Test with invalid example
      expect(prop.example([-5, -3]), equals(false));
    });

    test('property shrinking with multiple arguments', () {
      final prop = Property((int a, int b) => a < 10 || b < 10);

      // This should fail and shrink
      expect(
          () => prop
              .setNumRuns(100)
              .forAllLegacy([interval(0, 100), interval(0, 100)]),
          throwsException);
    });

    test('property with precondition error', () {
      final prop = Property((int a, int b) {
        if (a == 0 || b == 0) {
          throw PreconditionError('Zero values not allowed');
        }
        return a * b > 0;
      });

      // Should not throw because precondition errors are skipped
      expect(
          () => prop
              .setNumRuns(100)
              .forAllLegacy([interval(0, 10), interval(0, 10)]),
          returnsNormally);
    });

    test('property with exception throwing function', () {
      final prop = Property((int a, int b) {
        if (a > 50 || b > 50) {
          throw Exception('Value too large: a=$a, b=$b');
        }
      });

      // Should throw for inputs that can be > 50
      expect(
          () => prop
              .setNumRuns(100)
              .forAllLegacy([interval(0, 100), interval(0, 100)]),
          throwsException);
    });

    test('property with failing boolean function', () {
      final prop = Property((int a, int b) {
        return a < 50 && b < 50;
      });

      // Should throw for inputs that can be > 50
      expect(
          () => prop
              .setNumRuns(100)
              .forAllLegacy([interval(0, 100), interval(0, 100)]),
          throwsException);
    });
  });
}
