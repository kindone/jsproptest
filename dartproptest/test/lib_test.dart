import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

class Error1 implements Exception {
  final String name;
  const Error1(this.name);

  @override
  String toString() => 'Error1: $name';
}

class Error2 extends Error1 {
  const Error2(String name) : super(name);

  @override
  String toString() => 'Error2: $name';
}

class Error3 implements Exception {
  const Error3();
}

class Error4 extends Error3 {
  const Error4();
}

void main() {
  group('Random', () {
    test('next', () {
      final rand = Random();
      final value = rand.nextProb();
      expect(value, isA<double>());
      expect(value, greaterThanOrEqualTo(0));
      expect(value, lessThan(1));
    });
  });

  group('Jest', () {
    test('expect', () {
      int a = 6;
      try {
        expect(5 == a, equals(true));
      } catch (e) {
        expect(e.runtimeType.toString(), contains('TestFailure'));
      }
    });
  });

  group('Error', () {
    test('error type', () {
      try {
        throw const Error1('hello');
      } catch (e) {
        expect(e, isA<Error1>());
      }

      try {
        throw const Error2('hello');
      } catch (e) {
        expect(e, isA<Error1>());
        expect(e, isA<Error2>());
      }
    });
  });

  group('Error with no setPrototypeOf', () {
    // no inheritance information is passed if tsconfig::target == ES5. ES6 works fine
    test('error type', () {
      try {
        throw const Error3();
      } catch (e) {
        expect(e, isA<Exception>());
        expect(e, isA<Error3>());
      }

      try {
        throw const Error4();
      } catch (e) {
        expect(e, isA<Exception>());
        expect(e, isA<Error4>());
      }
    });
  });

  group('expect failure', () {
    test('expect exception type', () {
      try {
        final a = <Map<String, int>>[
          {'x': 5}
        ];
        expect(a[0]['x'], equals(6));
      } catch (e) {
        expect(e.runtimeType.toString(), contains('TestFailure'));
      }
    });
  });

  group('Option, Either, and Try', () {
    test('Option', () {
      final x = Some(5);
      final y = None<int>();

      expect(x.isEmpty(), equals(false));
      expect(y.isEmpty(), equals(true));

      expect(x.map((v) => (v + 5).toString()).get(), equals('10'));
      expect(y.map((v) => v + 5).isEmpty(), equals(true));
      expect(x.flatMap((v) => Some((v + 5).toString())).get(), equals('10'));
      expect(x.flatMap((_) => None<String>()).isEmpty(), equals(true));
      expect(y.flatMap((v) => Some(v + 5)).isEmpty(), equals(true));
      expect(y.flatMap((_) => None<int>()).isEmpty(), equals(true));
      expect(x.filter((v) => v > 4).isEmpty(), equals(false));
      expect(x.filter((v) => v > 5).isEmpty(), equals(true));
      expect(y.filter((v) => v > 4).isEmpty(), equals(true));
      expect(y.filter((v) => v > 5).isEmpty(), equals(true));
    });

    test('Either', () {
      final x = Right<Exception, int>(5);
      final y = Left<Exception, int>(Exception('y'));

      expect(x.isLeft(), equals(false));
      expect(x.isRight(), equals(true));
      expect(y.isLeft(), equals(true));
      expect(y.isRight(), equals(false));
      expect(() => x.getLeft(), throwsException);
      expect(x.getRight(), equals(5));
      expect(y.getLeft().toString(), contains('y'));
      expect(() => y.getRight(), throwsException);
      expect(x.map((v) => (v + 5).toString()).getRight(), equals('10'));
      expect(y.map((v) => (v + 5).toString()).isRight(), equals(false));
      expect(
          x
              .flatMap((v) => Right<Exception, String>((v + 5).toString()))
              .isRight(),
          equals(true));
      expect(
          y
              .flatMap((v) => Right<Exception, String>((v + 5).toString()))
              .isRight(),
          equals(false));
      expect(
          y.flatMap((_) => Left<Exception, String>(Exception('y2'))).isRight(),
          equals(false));

      expect(
          x.filterOrElse((v) => v > 4, Exception('x')).getRight(), equals(5));
      expect(x.filterOrElse((v) => v > 5, Exception('x')).isRight(),
          equals(false));
      expect(y.filterOrElse((v) => v > 4, Exception('x')).isRight(),
          equals(false));
      expect(y.filterOrElse((v) => v > 5, Exception('x')).isRight(),
          equals(false));
    });

    test('Try', () {
      final x = Try.of(() => 5);
      final y = Try.of(() {
        throw Exception('ee');
      });

      expect(x.isSuccess, equals(true));
      expect(y.isSuccess, equals(false));
      expect(x.map((v) => v + 6).value, equals(11));
      expect(y.map((v) => (v as int) + 6).isFailure, equals(true));
      expect(x.flatMap((v) => Try.of(() => v + 5)).value, equals(10));
      expect(y.flatMap((v) => Try.of(() => (v as int) + 5)).isFailure,
          equals(true));
    });
  });
}
