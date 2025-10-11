import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Advanced Shrinking Tests', () {
    test('shrinkBulk shrinks elements in chunks', () {
      final rand = Random('42');
      final elements = [
        generateInteger(rand, 0, 100), // This will have shrinks
        generateInteger(rand, 0, 200),
        generateInteger(rand, 0, 300),
        generateInteger(rand, 0, 400),
      ];

      final ancestor = Shrinkable<List<Shrinkable<int>>>(elements);
      final shrinks = shrinkBulk(ancestor, 1, 0); // 2 chunks, first chunk

      expect(shrinks.isEmpty(), equals(false));

      final iterator = shrinks.iterator();
      expect(iterator.hasNext(), equals(true));
      final firstShrink = iterator.next();

      // Should have shrunk the first two elements (chunk 0)
      expect(firstShrink.value, hasLength(4));
      // The first two elements should be shrunk (towards 0)
      expect(firstShrink.value[0].value, lessThanOrEqualTo(elements[0].value));
      expect(firstShrink.value[1].value, lessThanOrEqualTo(elements[1].value));
      // The last two elements should remain unchanged
      expect(firstShrink.value[2].value, equals(elements[2].value));
      expect(firstShrink.value[3].value, equals(elements[3].value));
    });

    test('shrinkElementWise shrinks elements in structured chunks', () {
      final rand = Random('42');
      final elements = [
        generateInteger(rand, 0, 50),
        generateInteger(rand, 0, 100),
        generateInteger(rand, 0, 150),
        generateInteger(rand, 0, 200),
      ];

      final ancestor = Shrinkable<List<Shrinkable<int>>>(elements);
      final shrinks = shrinkElementWise(ancestor, 0, 0); // Single chunk

      expect(shrinks.isEmpty(), equals(false));

      final iterator = shrinks.iterator();
      expect(iterator.hasNext(), equals(true));
      final firstShrink = iterator.next();

      // Should have shrunk all elements
      expect(firstShrink.value, hasLength(4));
      for (int i = 0; i < 4; i++) {
        expect(
            firstShrink.value[i].value, lessThanOrEqualTo(elements[i].value));
      }
    });

    test('shrinkMembershipWise removes elements from front', () {
      final elements = [
        Shrinkable<int>(1),
        Shrinkable<int>(2),
        Shrinkable<int>(3),
        Shrinkable<int>(4),
        Shrinkable<int>(5),
      ];

      final shrinks = shrinkMembershipWise(elements, 2);
      expect(shrinks.value, hasLength(5)); // Original length

      final shrinkStream = shrinks.shrinks();
      expect(shrinkStream.isEmpty(), equals(false));

      final iterator = shrinkStream.iterator();
      expect(iterator.hasNext(), equals(true));
      final firstShrink = iterator.next();

      // Should have removed some elements from the front
      expect(firstShrink.value.length, lessThan(5));
      expect(firstShrink.value.length, greaterThanOrEqualTo(2));
    });

    test('shrinkableArrayAdvanced with membership shrinking', () {
      final elements = [
        Shrinkable<int>(10),
        Shrinkable<int>(20),
        Shrinkable<int>(30),
        Shrinkable<int>(40),
      ];

      final arrayShrinkable = shrinkableArrayAdvanced(elements, 2,
          membershipWise: true, elementWise: false);
      expect(arrayShrinkable.value, equals([10, 20, 30, 40]));

      final shrinks = arrayShrinkable.shrinks();
      expect(shrinks.isEmpty(), equals(false));

      final iterator = shrinks.iterator();
      expect(iterator.hasNext(), equals(true));
      final firstShrink = iterator.next();

      // Should have reduced the length
      expect(firstShrink.value.length, lessThan(4));
      expect(firstShrink.value.length, greaterThanOrEqualTo(2));
    });

    test('shrinkableArrayAdvanced with element-wise shrinking', () {
      final rand = Random('42');
      final elements = [
        generateInteger(rand, 0, 100),
        generateInteger(rand, 0, 200),
        generateInteger(rand, 0, 300),
      ];

      final arrayShrinkable = shrinkableArrayAdvanced(elements, 1,
          membershipWise: false, elementWise: true);
      expect(arrayShrinkable.value,
          equals([elements[0].value, elements[1].value, elements[2].value]));

      final shrinks = arrayShrinkable.shrinks();
      expect(shrinks.isEmpty(), equals(false));

      final iterator = shrinks.iterator();
      expect(iterator.hasNext(), equals(true));
      final firstShrink = iterator.next();

      // Should have shrunk individual elements
      expect(firstShrink.value, hasLength(3));
      for (int i = 0; i < 3; i++) {
        expect(firstShrink.value[i], lessThanOrEqualTo(elements[i].value));
      }
    });

    test(
        'shrinkableArrayAdvanced with both membership and element-wise shrinking',
        () {
      final elements = [
        Shrinkable<int>(50),
        Shrinkable<int>(100),
        Shrinkable<int>(150),
        Shrinkable<int>(200),
      ];

      final arrayShrinkable = shrinkableArrayAdvanced(elements, 2,
          membershipWise: true, elementWise: true);
      expect(arrayShrinkable.value, equals([50, 100, 150, 200]));

      final shrinks = arrayShrinkable.shrinks();
      expect(shrinks.isEmpty(), equals(false));

      final iterator = shrinks.iterator();
      expect(iterator.hasNext(), equals(true));
      final firstShrink = iterator.next();

      // Should have either reduced length or shrunk elements
      expect(firstShrink.value.length, lessThanOrEqualTo(4));
      expect(firstShrink.value.length, greaterThanOrEqualTo(2));
    });

    test('enhanced string shrinking with element-wise codepoint shrinking', () {
      final codepoints = [
        Shrinkable<int>(65), // A
        Shrinkable<int>(66), // B
        Shrinkable<int>(67), // C
        Shrinkable<int>(68), // D
      ];

      final stringShrinkable = shrinkableString(codepoints, 2);
      expect(stringShrinkable.value, equals('ABCD'));

      final shrinks = stringShrinkable.shrinks();
      expect(shrinks.isEmpty(), equals(false));

      final iterator = shrinks.iterator();
      expect(iterator.hasNext(), equals(true));
      final firstShrink = iterator.next();

      // Should have either reduced length or shrunk codepoints
      expect(firstShrink.value.length, lessThanOrEqualTo(4));
      expect(firstShrink.value.length, greaterThanOrEqualTo(2));
    });

    test('enhanced dictionary shrinking with element-wise value shrinking', () {
      final dict = {
        'key1': Shrinkable<int>(100),
        'key2': Shrinkable<int>(200),
        'key3': Shrinkable<int>(300),
      };

      final dictShrinkable = shrinkableDictionary(dict, 2, elementWise: true);
      expect(dictShrinkable.value,
          equals({'key1': 100, 'key2': 200, 'key3': 300}));

      final shrinks = dictShrinkable.shrinks();
      expect(shrinks.isEmpty(), equals(false));

      final iterator = shrinks.iterator();
      expect(iterator.hasNext(), equals(true));
      final firstShrink = iterator.next();

      // Should have either reduced size or shrunk values
      expect(firstShrink.value.length, lessThanOrEqualTo(3));
      expect(firstShrink.value.length, greaterThanOrEqualTo(2));
    });

    test('shrinkMid removes elements from middle while keeping front and rear',
        () {
      final elements = [
        Shrinkable<int>(1), // front
        Shrinkable<int>(2), // middle
        Shrinkable<int>(3), // middle
        Shrinkable<int>(4), // rear
      ];

      final shrinks =
          shrinkMid(elements, 2, 1, 1); // minSize=2, frontSize=1, rearSize=1
      expect(shrinks.value, hasLength(4)); // Original length

      final shrinkStream = shrinks.shrinks();
      expect(shrinkStream.isEmpty(), equals(false));

      final iterator = shrinkStream.iterator();
      expect(iterator.hasNext(), equals(true));
      final firstShrink = iterator.next();

      // Should have removed some middle elements while keeping front and rear
      expect(firstShrink.value.length, lessThan(4));
      expect(firstShrink.value.length, greaterThanOrEqualTo(2));
      // First element (front) should be preserved
      expect(firstShrink.value[0].value, equals(1));
      // Last element (rear) should be preserved
      expect(firstShrink.value.last.value, equals(4));
    });

    test('shrinkFrontAndThenMid removes elements from front then middle', () {
      final elements = [
        Shrinkable<int>(1),
        Shrinkable<int>(2),
        Shrinkable<int>(3),
        Shrinkable<int>(4),
        Shrinkable<int>(5),
      ];

      final shrinks =
          shrinkFrontAndThenMid(elements, 2, 1); // minSize=2, rearSize=1
      expect(shrinks.value, hasLength(5)); // Original length

      final shrinkStream = shrinks.shrinks();
      expect(shrinkStream.isEmpty(), equals(false));

      final iterator = shrinkStream.iterator();
      expect(iterator.hasNext(), equals(true));
      final firstShrink = iterator.next();

      // Should have removed some front elements while keeping rear
      expect(firstShrink.value.length, lessThan(5));
      expect(firstShrink.value.length, greaterThanOrEqualTo(2));
      // Last element (rear) should be preserved
      expect(firstShrink.value.last.value, equals(5));
    });
  });
}
