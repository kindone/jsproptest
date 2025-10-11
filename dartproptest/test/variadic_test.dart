import 'package:dartproptest/dartproptest.dart';
import 'package:test/test.dart';

void main() {
  group('Main forAll Tests', () {
    test('forAll with single argument', () {
      expect(() {
        forAll(
          (int a) => a * a >= 0,
          [Gen.interval(-100, 100)],
          numRuns: 10,
        );
      }, returnsNormally);
    });

    test('forAll with two arguments', () {
      expect(() {
        forAll(
          (int a, int b) => a + b == b + a,
          [Gen.interval(0, 100), Gen.interval(0, 100)],
          numRuns: 10,
        );
      }, returnsNormally);
    });

    test('forAll with three arguments', () {
      expect(() {
        forAll(
          (int a, int b, int c) => (a + b) + c == a + (b + c),
          [Gen.interval(0, 50), Gen.interval(0, 50), Gen.interval(0, 50)],
          numRuns: 10,
        );
      }, returnsNormally);
    });

    test('forAll with mixed types', () {
      expect(() {
        forAll(
          (int a, String s, bool flag) {
            if (flag) {
              return a.toString().length >= 1;
            } else {
              return a >= 0;
            }
          },
          [
            Gen.interval(0, 100),
            Gen.asciiString(minLength: 1, maxLength: 5),
            Gen.boolean()
          ],
          numRuns: 10,
        );
      }, returnsNormally);
    });

    test('forAllSimple with single argument', () {
      expect(() {
        forAllSimple(
          (int a) => a * a >= 0,
          [Gen.interval(-100, 100)],
          numRuns: 10,
        );
      }, returnsNormally);
    });

    test('forAllSimple with two arguments', () {
      expect(() {
        forAllSimple(
          (int a, int b) => a + b == b + a,
          [Gen.interval(0, 100), Gen.interval(0, 100)],
          numRuns: 10,
        );
      }, returnsNormally);
    });

    test('forAllSimple with three arguments', () {
      expect(() {
        forAllSimple(
          (int a, int b, int c) => (a + b) + c == a + (b + c),
          [Gen.interval(0, 50), Gen.interval(0, 50), Gen.interval(0, 50)],
          numRuns: 10,
        );
      }, returnsNormally);
    });

    test('forAll should fail when property is false', () {
      expect(() {
        forAll(
          (int a, int b) => a > b, // This will fail for some inputs
          [Gen.interval(0, 10), Gen.interval(0, 10)],
          numRuns: 50,
        );
      }, throwsA(isA<Exception>()));
    });

    test('forAllSimple should fail when property is false', () {
      expect(() {
        forAllSimple(
          (int a, int b) => a > b, // This will fail for some inputs
          [Gen.interval(0, 10), Gen.interval(0, 10)],
          numRuns: 50,
        );
      }, throwsA(isA<Exception>()));
    });

    test('forAll should validate generator count', () {
      expect(() {
        forAll(
          (int a, int b) => a + b == b + a,
          [Gen.interval(0, 100)], // Only one generator for two parameters
        );
      }, throwsA(isA<Exception>()));
    });

    test('forAllSimple should fail with mismatched generator count', () {
      // forAllSimple doesn't validate generator count, so it should fail at runtime
      expect(() {
        forAllSimple(
          (int a, int b) => a + b == b + a,
          [Gen.interval(0, 100)], // Only one generator for two parameters
          numRuns: 5,
        );
      }, throwsA(isA<Exception>()));
    });

    // ============================================================================
    // INVALID ARGUMENT DETECTION TESTS
    // ============================================================================

    group('Invalid Argument Detection', () {
      test('forAll should detect too few generators', () {
        expect(() {
          forAll(
            (int a, int b, int c) => a + b + c >= 0,
            [
              Gen.interval(0, 10),
              Gen.interval(0, 10)
            ], // Only 2 generators for 3 parameters
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAll should detect too many generators', () {
        expect(() {
          forAll(
            (int a, int b) => a + b >= 0,
            [
              Gen.interval(0, 10),
              Gen.interval(0, 10),
              Gen.interval(0, 10)
            ], // 3 generators for 2 parameters
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAll should detect zero generators for function with parameters',
          () {
        expect(() {
          forAll(
            (int a) => a >= 0,
            [], // No generators for 1 parameter
          );
        }, throwsA(isA<Exception>()));
      });

      test(
          'forAll should work with zero generators for function with no parameters',
          () {
        expect(() {
          forAll(
            () => true, // No parameters
            [], // No generators
            numRuns: 5,
          );
        }, returnsNormally);
      });

      test('forAllSimple should fail with too few generators', () {
        expect(() {
          forAllSimple(
            (int a, int b, int c) => a + b + c >= 0,
            [
              Gen.interval(0, 10),
              Gen.interval(0, 10)
            ], // Only 2 generators for 3 parameters
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAllSimple should fail with too many generators', () {
        expect(() {
          forAllSimple(
            (int a, int b) => a + b >= 0,
            [
              Gen.interval(0, 10),
              Gen.interval(0, 10),
              Gen.interval(0, 10)
            ], // 3 generators for 2 parameters
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test(
          'forAllSimple should work with zero generators for function with no parameters',
          () {
        expect(() {
          forAllSimple(
            () => true, // No parameters
            [], // No generators
            numRuns: 5,
          );
        }, returnsNormally);
      });

      test('forAll should handle complex function signatures', () {
        expect(() {
          forAll(
            (int a, String s, bool flag, double d, List<int> list) {
              return a >= 0 &&
                  s.isNotEmpty &&
                  flag != null &&
                  d >= 0.0 &&
                  list.length >= 0;
            },
            [
              Gen.interval(0, 10),
              Gen.asciiString(minLength: 1, maxLength: 5),
              Gen.boolean(),
              Gen.float(),
              Gen.array(Gen.interval(0, 5), minLength: 0, maxLength: 3),
            ],
            numRuns: 5,
          );
        }, returnsNormally);
      });

      test('forAll should fail with mismatched complex function signatures',
          () {
        expect(() {
          forAll(
            (int a, String s, bool flag, double d, List<int> list) {
              return a >= 0 &&
                  s.isNotEmpty &&
                  flag != null &&
                  d >= 0.0 &&
                  list.length >= 0;
            },
            [
              Gen.interval(0, 10),
              Gen.asciiString(minLength: 1, maxLength: 5),
              Gen.boolean(),
              // Missing Gen.float() and Gen.array() generators
            ],
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAllSimple should handle complex function signatures', () {
        expect(() {
          forAllSimple(
            (int a, String s, bool flag, double d, List<int> list) {
              return a >= 0 &&
                  s.isNotEmpty &&
                  flag != null &&
                  d >= 0.0 &&
                  list.length >= 0;
            },
            [
              Gen.interval(0, 10),
              Gen.asciiString(minLength: 1, maxLength: 5),
              Gen.boolean(),
              Gen.float(),
              Gen.array(Gen.interval(0, 5), minLength: 0, maxLength: 3),
            ],
            numRuns: 5,
          );
        }, returnsNormally);
      });

      test(
          'forAllSimple should fail with mismatched complex function signatures',
          () {
        expect(() {
          forAllSimple(
            (int a, String s, bool flag, double d, List<int> list) {
              return a >= 0 &&
                  s.isNotEmpty &&
                  flag != null &&
                  d >= 0.0 &&
                  list.length >= 0;
            },
            [
              Gen.interval(0, 10),
              Gen.asciiString(minLength: 1, maxLength: 5),
              Gen.boolean(),
              // Missing Gen.float() and Gen.array() generators
            ],
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test(
          'forAll should provide clear error messages for argument count mismatches',
          () {
        try {
          forAll(
            (int a, int b, int c) => a + b + c >= 0,
            [
              Gen.interval(0, 10),
              Gen.interval(0, 10)
            ], // Only 2 generators for 3 parameters
          );
          fail('Expected Exception to be thrown');
        } on Exception catch (e) {
          expect(
              e.toString(),
              contains(
                  'NoSuchMethodError: Closure call with mismatched arguments'));
        }
      });

      test('forAll should provide clear error messages for too many generators',
          () {
        try {
          forAll(
            (int a, int b) => a + b >= 0,
            [
              Gen.interval(0, 10),
              Gen.interval(0, 10),
              Gen.interval(0, 10)
            ], // 3 generators for 2 parameters
          );
          fail('Expected Exception to be thrown');
        } on Exception catch (e) {
          expect(
              e.toString(),
              contains(
                  'NoSuchMethodError: Closure call with mismatched arguments'));
        }
      });

      test('forAll should handle functions with nullable parameters', () {
        expect(() {
          forAll(
            (int? a, String? s) =>
                a == null || s == null || (a >= 0 && s.isNotEmpty),
            [
              Gen.interval(0, 10),
              Gen.asciiString(minLength: 1, maxLength: 5)
            ], // Use minLength: 1 to avoid empty strings
            numRuns: 5,
          );
        }, returnsNormally);
      });

      test('forAllSimple should handle functions with nullable parameters', () {
        expect(() {
          forAllSimple(
            (int? a, String? s) =>
                a == null || s == null || (a >= 0 && s.isNotEmpty),
            [
              Gen.interval(0, 10),
              Gen.asciiString(minLength: 1, maxLength: 5)
            ], // Use minLength: 1 to avoid empty strings
            numRuns: 5,
          );
        }, returnsNormally);
      });

      test('forAll should handle functions with default parameters', () {
        expect(() {
          forAll(
            (int a, [int b = 0]) => a + b >= 0,
            [
              Gen.interval(0, 10),
              Gen.interval(0, 10)
            ], // Provide both generators since reflection counts default parameters
            numRuns: 5,
          );
        }, returnsNormally);
      });

      test('forAllSimple should handle functions with default parameters', () {
        expect(() {
          forAllSimple(
            (int a, [int b = 0]) => a + b >= 0,
            [
              Gen.interval(0, 10),
              Gen.interval(0, 10)
            ], // Provide both generators since reflection counts default parameters
            numRuns: 5,
          );
        }, returnsNormally);
      });

      // Note: Named parameters don't work well with Function.apply, so we'll skip these tests
      // test('forAll should handle functions with named parameters', () {
      //   // This test is skipped because Function.apply doesn't work with named parameters
      // });

      // test('forAllSimple should handle functions with named parameters', () {
      //   // This test is skipped because Function.apply doesn't work with named parameters
      // });

      test('forAll should handle functions returning void', () {
        expect(() {
          forAll(
            (int a) {
              // Void function that should not throw
              if (a < 0) throw Exception('Negative value');
            },
            [Gen.interval(0, 10)],
            numRuns: 5,
          );
        }, returnsNormally);
      });

      test('forAllSimple should handle functions returning void', () {
        expect(() {
          forAllSimple(
            (int a) {
              // Void function that should not throw
              if (a < 0) throw Exception('Negative value');
            },
            [Gen.interval(0, 10)],
            numRuns: 5,
          );
        }, returnsNormally);
      });

      test('forAll should handle functions returning void that throw', () {
        expect(() {
          forAll(
            (int a) {
              // Void function that throws for some inputs
              if (a > 5) throw Exception('Value too large');
            },
            [Gen.interval(0, 10)],
            numRuns: 50,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAllSimple should handle functions returning void that throw',
          () {
        expect(() {
          forAllSimple(
            (int a) {
              // Void function that throws for some inputs
              if (a > 5) throw Exception('Value too large');
            },
            [Gen.interval(0, 10)],
            numRuns: 50,
          );
        }, throwsA(isA<Exception>()));
      });
    });

    // ============================================================================
    // TYPE MISMATCH DETECTION TESTS
    // ============================================================================

    group('Type Mismatch Detection', () {
      test('forAll should detect type mismatches at runtime', () {
        expect(() {
          forAll(
            (int a, String s) => a >= 0 && s.isNotEmpty,
            [
              Gen.asciiString(minLength: 1, maxLength: 5),
              Gen.interval(0, 10)
            ], // Swapped types
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAllSimple should detect type mismatches at runtime', () {
        expect(() {
          forAllSimple(
            (int a, String s) => a >= 0 && s.isNotEmpty,
            [
              Gen.asciiString(minLength: 1, maxLength: 5),
              Gen.interval(0, 10)
            ], // Swapped types
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAll should detect int vs double type mismatch', () {
        expect(() {
          forAll(
            (int a, double d) => a >= 0 && d >= 0.0,
            [
              Gen.float(),
              Gen.interval(0, 10)
            ], // Swapped types: float for int, interval for double
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAllSimple should detect int vs double type mismatch', () {
        expect(() {
          forAllSimple(
            (int a, double d) => a >= 0 && d >= 0.0,
            [
              Gen.float(),
              Gen.interval(0, 10)
            ], // Swapped types: float for int, interval for double
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAll should detect bool vs int type mismatch', () {
        expect(() {
          forAll(
            (bool flag, int value) => flag || value >= 0,
            [
              Gen.interval(0, 10),
              Gen.boolean()
            ], // Swapped types: interval for bool, boolean for int
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAllSimple should detect bool vs int type mismatch', () {
        expect(() {
          forAllSimple(
            (bool flag, int value) => flag || value >= 0,
            [
              Gen.interval(0, 10),
              Gen.boolean()
            ], // Swapped types: interval for bool, boolean for int
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAll should detect List vs String type mismatch', () {
        expect(() {
          forAll(
            (List<int> list, String s) => list.length >= 0 && s.isNotEmpty,
            [
              Gen.asciiString(minLength: 1, maxLength: 5),
              Gen.array(Gen.interval(0, 5), minLength: 0, maxLength: 3)
            ], // Swapped types
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAllSimple should detect List vs String type mismatch', () {
        expect(() {
          forAllSimple(
            (List<int> list, String s) => list.length >= 0 && s.isNotEmpty,
            [
              Gen.asciiString(minLength: 1, maxLength: 5),
              Gen.array(Gen.interval(0, 5), minLength: 0, maxLength: 3)
            ], // Swapped types
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAll should detect Map vs Set type mismatch', () {
        expect(() {
          forAll(
            (Map<String, int> map, Set<int> set) =>
                map.length >= 0 && set.length >= 0,
            [
              Gen.set(Gen.interval(0, 5), minSize: 0, maxSize: 3),
              Gen.dictionary(Gen.asciiString(minLength: 1, maxLength: 3),
                  Gen.interval(0, 5),
                  minSize: 0, maxSize: 3)
            ], // Swapped types
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAllSimple should detect Map vs Set type mismatch', () {
        expect(() {
          forAllSimple(
            (Map<String, int> map, Set<int> set) =>
                map.length >= 0 && set.length >= 0,
            [
              Gen.set(Gen.interval(0, 5), minSize: 0, maxSize: 3),
              Gen.dictionary(Gen.asciiString(minLength: 1, maxLength: 3),
                  Gen.interval(0, 5),
                  minSize: 0, maxSize: 3)
            ], // Swapped types
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAll should detect complex nested type mismatch', () {
        expect(() {
          forAll(
            (List<Map<String, int>> listOfMaps, Set<List<int>> setOfLists) =>
                listOfMaps.length >= 0 && setOfLists.length >= 0,
            [
              Gen.set(Gen.array(Gen.interval(0, 5), minLength: 0, maxLength: 3),
                  minSize: 0,
                  maxSize: 2), // Set<List<int>> for List<Map<String, int>>
              Gen.array(
                  Gen.dictionary(Gen.asciiString(minLength: 1, maxLength: 3),
                      Gen.interval(0, 5),
                      minSize: 0, maxSize: 2),
                  minLength: 0,
                  maxLength: 2), // List<Map<String, int>> for Set<List<int>>
            ],
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAllSimple should detect complex nested type mismatch', () {
        expect(() {
          forAllSimple(
            (List<Map<String, int>> listOfMaps, Set<List<int>> setOfLists) =>
                listOfMaps.length >= 0 && setOfLists.length >= 0,
            [
              Gen.set(Gen.array(Gen.interval(0, 5), minLength: 0, maxLength: 3),
                  minSize: 0,
                  maxSize: 2), // Set<List<int>> for List<Map<String, int>>
              Gen.array(
                  Gen.dictionary(Gen.asciiString(minLength: 1, maxLength: 3),
                      Gen.interval(0, 5),
                      minSize: 0, maxSize: 2),
                  minLength: 0,
                  maxLength: 2), // List<Map<String, int>> for Set<List<int>>
            ],
            numRuns: 5,
          );
        }, throwsA(isA<Exception>()));
      });

      test('forAll should provide clear error messages for type mismatches',
          () {
        try {
          forAll(
            (int a, String s) => a >= 0 && s.isNotEmpty,
            [
              Gen.asciiString(minLength: 1, maxLength: 5),
              Gen.interval(0, 10)
            ], // Swapped types
            numRuns: 5,
          );
          fail('Expected Exception to be thrown');
        } on Exception catch (e) {
          expect(e.toString(), contains('Property failed with args'));
          expect(
              e.toString(),
              contains(
                  'type \'String\' is not a subtype of type \'int\'')); // Type mismatch error
          expect(
              e.toString(),
              contains(
                  'type \'String\' is not a subtype of type \'int\'')); // Type mismatch error
        }
      });

      test(
          'forAllSimple should provide clear error messages for type mismatches',
          () {
        try {
          forAllSimple(
            (int a, String s) => a >= 0 && s.isNotEmpty,
            [
              Gen.asciiString(minLength: 1, maxLength: 5),
              Gen.interval(0, 10)
            ], // Swapped types
            numRuns: 5,
          );
          fail('Expected Exception to be thrown');
        } on Exception catch (e) {
          expect(e.toString(), contains('Property failed with arguments'));
          expect(
              e.toString(), contains('arg0')); // Should show argument details
          expect(
              e.toString(), contains('arg1')); // Should show argument details
        }
      });
    });
  });
}
