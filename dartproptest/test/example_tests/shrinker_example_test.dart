import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Shrinker Examples', () {
    test('boolean shrinking', () {
      final trueShrinkable = Shrinkable<bool>(true);
      expect(trueShrinkable.value, equals(true));

      final shrinks = trueShrinkable.shrinks;
      expect(shrinks, isNotNull);

      final falseShrinkable = Shrinkable<bool>(false);
      expect(falseShrinkable.value, equals(false));
    });

    test('binary search shrinking for ranges', () {
      final rangeShrinkable = Shrinkable<int>(16);
      expect(rangeShrinkable.value, equals(16));

      final shrinks = rangeShrinkable.shrinks;
      expect(shrinks, isNotNull);
    });

    test('string shrinking', () {
      final stringShrinkable = Shrinkable<String>('Hello World');
      expect(stringShrinkable.value, equals('Hello World'));

      final shrinks = stringShrinkable.shrinks;
      expect(shrinks, isNotNull);
    });

    test('array shrinking', () {
      final arrayShrinkable = Shrinkable<List<int>>([1, 2, 3, 4, 5]);
      expect(arrayShrinkable.value, equals([1, 2, 3, 4, 5]));

      final shrinks = arrayShrinkable.shrinks;
      expect(shrinks, isNotNull);
    });

    test('floating point shrinking', () {
      final floatShrinkable = Shrinkable<double>(3.14159);
      expect(floatShrinkable.value, equals(3.14159));

      final shrinks = floatShrinkable.shrinks;
      expect(shrinks, isNotNull);
    });

    test('set shrinking', () {
      final setShrinkable = Shrinkable<Set<int>>({1, 2, 3, 4, 5});
      expect(setShrinkable.value, equals({1, 2, 3, 4, 5}));

      final shrinks = setShrinkable.shrinks;
      expect(shrinks, isNotNull);
    });

    test('dictionary shrinking', () {
      final dictShrinkable = Shrinkable<Map<String, int>>({
        'a': 1,
        'b': 2,
        'c': 3,
      });
      expect(dictShrinkable.value, equals({'a': 1, 'b': 2, 'c': 3}));

      final shrinks = dictShrinkable.shrinks;
      expect(shrinks, isNotNull);
    });

    test('tuple shrinking', () {
      final tupleShrinkable = Shrinkable<List<dynamic>>([1, 'hello', true]);
      expect(tupleShrinkable.value, equals([1, 'hello', true]));

      final shrinks = tupleShrinkable.shrinks;
      expect(shrinks, isNotNull);
    });

    test('shrinking with map transformation', () {
      final intShrinkable = Shrinkable<int>(42);
      final stringShrinkable = intShrinkable.map((int i) => 'Value: $i');

      expect(stringShrinkable.value, equals('Value: 42'));
      expect(stringShrinkable.shrinks, isNotNull);
    });

    test('shrinking with filter', () {
      final intShrinkable = Shrinkable<int>(10);
      final evenShrinkable = intShrinkable.filter((int i) => i % 2 == 0);

      expect(evenShrinkable.value, equals(10));
      expect(evenShrinkable.shrinks, isNotNull);
    });

    test('shrinking with flatMap', () {
      final intShrinkable = Shrinkable<int>(5);
      final dependentShrinkable =
          intShrinkable.flatMap((int i) => Shrinkable<String>('Count: $i'));

      expect(dependentShrinkable.value, equals('Count: 5'));
      expect(dependentShrinkable.shrinks, isNotNull);
    });

    test('shrinking empty collections', () {
      final emptyListShrinkable = Shrinkable<List<int>>([]);
      expect(emptyListShrinkable.value, equals([]));
      expect(emptyListShrinkable.shrinks, isNotNull);

      final emptySetShrinkable = Shrinkable<Set<int>>(<int>{});
      expect(emptySetShrinkable.value, equals(<int>{}));
      expect(emptySetShrinkable.shrinks, isNotNull);

      final emptyDictShrinkable = Shrinkable<Map<String, int>>(<String, int>{});
      expect(emptyDictShrinkable.value, equals(<String, int>{}));
      expect(emptyDictShrinkable.shrinks, isNotNull);
    });

    test('shrinking single element collections', () {
      final singleListShrinkable = Shrinkable<List<int>>([42]);
      expect(singleListShrinkable.value, equals([42]));
      expect(singleListShrinkable.shrinks, isNotNull);

      final singleSetShrinkable = Shrinkable<Set<int>>({42});
      expect(singleSetShrinkable.value, equals({42}));
      expect(singleSetShrinkable.shrinks, isNotNull);

      final singleDictShrinkable = Shrinkable<Map<String, int>>({'key': 42});
      expect(singleDictShrinkable.value, equals({'key': 42}));
      expect(singleDictShrinkable.shrinks, isNotNull);
    });
  });
}
