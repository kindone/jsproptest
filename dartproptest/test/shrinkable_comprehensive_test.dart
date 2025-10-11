import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';
import 'testutil.dart';

void main() {
  group('Shrinkable Comprehensive Tests', () {
    test('basic shrinkable', () {
      final shr = Shrinkable<int>(0);
      expect(serializeShrinkable(shr), equals('{"value":0}'));
    });

    Shrinkable<int> genShrinkable21() => Shrinkable<int>(2).withShrinks(
        () => LazyStream.two(Shrinkable<int>(0), Shrinkable<int>(1)));

    Shrinkable<int> genShrinkable40213() =>
        Shrinkable<int>(4).withShrinks(() => LazyStream.three(
            Shrinkable<int>(0),
            Shrinkable<int>(2)
                .withShrinks(() => LazyStream.one(Shrinkable<int>(1))),
            Shrinkable<int>(3)));

    test('Shrinkable:40213', () {
      final shr = genShrinkable40213();
      expect(
          serializeShrinkable(shr),
          equals(
              '{"value":4,"shrinks":[{"value":0},{"value":2,"shrinks":[{"value":1}]},{"value":3}]}'));
    });

    test('Shrinkable::concatStatic', () {
      {
        final shr0 = Shrinkable<int>(100);
        final shr1 =
            shr0.concatStatic(() => LazyStream.one(Shrinkable<int>(200)));
        expect(serializeShrinkable(shr1),
            equals('{"value":100,"shrinks":[{"value":200}]}'));
      }
      {
        final shr2 = genShrinkable21();
        final shr3 =
            shr2.concatStatic(() => LazyStream.one(Shrinkable<int>(3)));
        expect(
            serializeShrinkable(shr3),
            equals(
                '{"value":2,"shrinks":[{"value":0,"shrinks":[{"value":3}]},{"value":1,"shrinks":[{"value":3}]},{"value":3}]}'));
      }
      {
        final shr4 = genShrinkable40213();
        final shr5 =
            shr4.concatStatic(() => LazyStream.one(Shrinkable<int>(5)));
        expect(
            serializeShrinkable(shr5),
            equals(
                '{"value":4,"shrinks":[{"value":0,"shrinks":[{"value":5}]},{"value":2,"shrinks":[{"value":1,"shrinks":[{"value":5}]},{"value":5}]},{"value":3,"shrinks":[{"value":5}]},{"value":5}]}'));
      }
    });

    test('Shrinkable::concat', () {
      {
        final shr0 = Shrinkable<int>(100);
        final shr1 = shr0.concat((_) => LazyStream.one(Shrinkable<int>(200)));
        expect(serializeShrinkable(shr1),
            equals('{"value":100,"shrinks":[{"value":200}]}'));
      }
      {
        final shr0 = genShrinkable21();
        expect(serializeShrinkable(shr0),
            equals('{"value":2,"shrinks":[{"value":0},{"value":1}]}'));
        final shr1 = shr0.concat(
            (parent) => LazyStream.one(Shrinkable<int>(parent.value + 5)));
        expect(
            serializeShrinkable(shr1),
            equals(
                '{"value":2,"shrinks":[{"value":0,"shrinks":[{"value":5}]},{"value":1,"shrinks":[{"value":6}]},{"value":7}]}'));
      }
      {
        final shr = genShrinkable40213();
        final shr2 = shr.concat(
            (parent) => LazyStream.one(Shrinkable<int>(parent.value + 1)));
        expect(
            serializeShrinkable(shr2),
            equals(
                '{"value":4,"shrinks":[{"value":0,"shrinks":[{"value":1}]},{"value":2,"shrinks":[{"value":1,"shrinks":[{"value":2}]},{"value":3}]},{"value":3,"shrinks":[{"value":4}]},{"value":5}]}'));
      }
    });

    test('Shrinkable::andThenStatic', () {
      {
        final shr = Shrinkable<int>(100);
        final shr2 =
            shr.andThenStatic(() => LazyStream.one(Shrinkable<int>(200)));
        expect(serializeShrinkable(shr2),
            equals('{"value":100,"shrinks":[{"value":200}]}'));
      }
      {
        final shr = genShrinkable21();
        final shr2 =
            shr.andThenStatic(() => LazyStream.one(Shrinkable<int>(3)));
        expect(
            serializeShrinkable(shr2),
            equals(
                '{"value":2,"shrinks":[{"value":0,"shrinks":[{"value":3}]},{"value":1,"shrinks":[{"value":3}]}]}'));
      }
      {
        final shr = genShrinkable40213();
        final shr2 =
            shr.andThenStatic(() => LazyStream.one(Shrinkable<int>(5)));
        expect(
            serializeShrinkable(shr2),
            equals(
                '{"value":4,"shrinks":[{"value":0,"shrinks":[{"value":5}]},{"value":2,"shrinks":[{"value":1,"shrinks":[{"value":5}]}]},{"value":3,"shrinks":[{"value":5}]}]}'));
      }
    });

    test('Shrinkable::andThen', () {
      {
        final shr = Shrinkable<int>(100);
        final shr2 = shr.andThen((_) => LazyStream.one(Shrinkable<int>(200)));
        expect(serializeShrinkable(shr2),
            equals('{"value":100,"shrinks":[{"value":200}]}'));
      }
      {
        final shr = genShrinkable21();
        final shr2 = shr.andThen(
            (parent) => LazyStream.one(Shrinkable<int>(parent.value + 5)));
        expect(
            serializeShrinkable(shr2),
            equals(
                '{"value":2,"shrinks":[{"value":0,"shrinks":[{"value":5}]},{"value":1,"shrinks":[{"value":6}]}]}'));
      }
      {
        final shr = genShrinkable40213();
        final shr2 = shr.andThen(
            (parent) => LazyStream.one(Shrinkable<int>(parent.value + 1)));
        expect(
            serializeShrinkable(shr2),
            equals(
                '{"value":4,"shrinks":[{"value":0,"shrinks":[{"value":1}]},{"value":2,"shrinks":[{"value":1,"shrinks":[{"value":2}]}]},{"value":3,"shrinks":[{"value":4}]}]}'));
      }
    });

    test('Shrinkable::map', () {
      final shr = genShrinkable40213();
      final shr2 = shr.map((i) => i + 1);
      expect(
          serializeShrinkable(shr2),
          equals(
              '{"value":5,"shrinks":[{"value":1},{"value":3,"shrinks":[{"value":2}]},{"value":4}]}'));
      final shr3 = shr.map((i) => [i, i + 2]);
      expect(
          serializeShrinkable(shr3),
          equals(
              '{"value":[4,6],"shrinks":[{"value":[0,2]},{"value":[2,4],"shrinks":[{"value":[1,3]}]},{"value":[3,5]}]}'));
    });

    test('Shrinkable::filter', () {
      final shr = genShrinkable40213();
      final shr2 = shr.filter((i) => i % 2 == 0);
      expect(serializeShrinkable(shr2),
          equals('{"value":4,"shrinks":[{"value":0},{"value":2}]}'));
      expect(() => shr.filter((i) => i > 10),
          throwsException); // self cannot be filtered out
    });

    test('Shrinkable::flatMap', () {
      final shr = genShrinkable40213();
      final shr2 = shr.flatMap((i) => Shrinkable<int>(i + 1));
      expect(
          serializeShrinkable(shr2),
          equals(
              '{"value":5,"shrinks":[{"value":1},{"value":3,"shrinks":[{"value":2}]},{"value":4}]}'));
    });

    test('Shrinkable::getNthChild', () {
      final shr = genShrinkable40213();
      expect(shr.getNthChild(0).value, equals(0));
      expect(shr.getNthChild(1).value, equals(2));
      expect(shr.getNthChild(2).value, equals(3));
      expect(() => shr.getNthChild(-1), throwsException);
      expect(() => shr.getNthChild(3), throwsException);
    });

    test('Shrinkable::retrieve', () {
      final shr = genShrinkable40213();
      expect(shr.retrieve([]), equals(shr));
      expect(serializeShrinkable(shr.retrieve([0])),
          equals(serializeShrinkable(Shrinkable<int>(0))));
      expect(serializeShrinkable(shr.retrieve([1])),
          equals('{"value":2,"shrinks":[{"value":1}]}'));
      expect(serializeShrinkable(shr.retrieve([2])), equals('{"value":3}'));
      expect(serializeShrinkable(shr.retrieve([1, 0])), equals('{"value":1}'));
      expect(() => shr.retrieve([-1]), throwsException);
      expect(() => shr.retrieve([1, 1]), throwsException);
      expect(() => shr.retrieve([2, 0]), throwsException);
      expect(() => shr.retrieve([3]), throwsException);
      expect(() => shr.retrieve([3, 0]), throwsException);
    });

    test('Shrinkable::take', () {
      final shr = genShrinkable40213();
      final shr2 = shr.take(2);
      final shrinks = shr2.shrinks();
      final iterator = shrinks.iterator();
      int count = 0;
      while (iterator.hasNext()) {
        iterator.next();
        count++;
      }
      expect(count, equals(2));
    });

    test('Shrinkable::withShrinks', () {
      final shr = Shrinkable<int>(42);
      final shr2 = shr.withShrinks(() => LazyStream.one(Shrinkable<int>(21)));
      expect(shr2.value, equals(42));
      expect(shr2.shrinks().isEmpty(), equals(false));
      final iterator = shr2.shrinks().iterator();
      expect(iterator.hasNext(), equals(true));
      expect(iterator.next().value, equals(21));
    });

    test('Shrinkable::toString', () {
      final shr = Shrinkable<int>(42);
      expect(shr.toString(), equals('Shrinkable(42)'));
    });

    test('Shrinkable::compareShrinkable', () {
      final shr1 = genShrinkable21();
      final shr2 = genShrinkable21();
      final shr3 = Shrinkable<int>(2)
          .withShrinks(() => LazyStream.one(Shrinkable<int>(0)));

      expect(compareShrinkable(shr1, shr2), equals(true));
      expect(compareShrinkable(shr1, shr3), equals(false));
    });

    test('Shrinkable::exhaustive traversal', () {
      final shr = genShrinkable40213();
      final results = <String>[];

      exhaustive(shr, 0, (shrinkable, level) {
        final indent = '  ' * level;
        results.add('$indent${shrinkable.value}');
      });

      expect(results, contains('4'));
      expect(results, contains('  0'));
      expect(results, contains('  2'));
      expect(results, contains('    1'));
      expect(results, contains('  3'));
    });
  });
}
