import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('LazyStream Tests', () {
    test('empty stream', () {
      final stream = LazyStream<int>(null);
      expect(stream.toString(), equals('LazyStream()'));
    });

    test('single element stream', () {
      final stream = LazyStream<int>(1);
      expect(stream.toString(), equals('LazyStream(1)'));
    });

    test('two element stream', () {
      final stream = LazyStream<int>(1, () => LazyStream<int>(2));
      expect(stream.toString(), equals('LazyStream(1, 2)'));
    });

    test('three element stream', () {
      final stream = LazyStream<int>(
          1, () => LazyStream<int>(2, () => LazyStream<int>(3)));
      expect(stream.toString(), equals('LazyStream(1, 2, 3)'));
    });

    test('many elements stream', () {
      LazyStream<int> stream = LazyStream<int>(null);
      for (int i = 0; i < 20; i++) {
        final str = LazyStream<int>(i);
        stream = stream.concat(str);
      }

      expect(stream.toString(10),
          equals('LazyStream(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ...)'));
      expect(
          stream.toString(20),
          equals(
              'LazyStream(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19)'));
      expect(stream.toString(20), equals(stream.toString(30)));
    });

    test('LazyStream filter', () {
      LazyStream<int> stream = LazyStream<int>(null);
      for (int i = 0; i < 10; i++) {
        final str = LazyStream<int>(i);
        stream = stream.concat(str);
      }
      stream = stream.filter((n) => n % 2 == 0);
      expect(stream.toString(), equals('LazyStream(0, 2, 4, 6, 8)'));
    });

    test('LazyStream concat', () {
      LazyStream<int> stream = LazyStream<int>(null);
      for (int i = 0; i < 10; i++) {
        final str = LazyStream<int>(i, () => LazyStream<int>(i + 1));
        stream = stream.concat(str);
      }
      expect(
          stream.toString(),
          equals(
              'LazyStream(0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10)'));
    });

    test('LazyStream take', () {
      LazyStream<int> stream = LazyStream<int>(null);
      for (int i = 0; i < 10; i++) {
        final str = LazyStream<int>(i);
        stream = stream.concat(str);
      }
      stream = stream.take(5);
      expect(stream.toString(), equals('LazyStream(0, 1, 2, 3, 4)'));
    });

    test('LazyStream transform', () {
      LazyStream<int> stream = LazyStream<int>(null);
      for (int i = 0; i < 10; i++) {
        final str = LazyStream<int>(i);
        stream = stream.concat(str);
      }
      stream = stream.transform((n) => n * 2);
      expect(stream.toString(),
          equals('LazyStream(0, 2, 4, 6, 8, 10, 12, 14, 16, 18)'));

      final stream2 = stream.transform((n) => n.toString());
      expect(
          stream2.toString(),
          equals(
              'LazyStream("0", "2", "4", "6", "8", "10", "12", "14", "16", "18")'));
    });

    test('LazyStream iterator', () {
      LazyStream<int> stream = LazyStream<int>(null);
      for (int i = 0; i < 10; i++) {
        final str = LazyStream<int>(i);
        stream = stream.concat(str);
      }
      final itr = stream.iterator();
      final arr = <int>[];
      while (itr.hasNext()) arr.add(itr.next());
      expect(arr, equals([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    });

    test('LazyStream isEmpty', () {
      final emptyStream = LazyStream<int>(null);
      expect(emptyStream.isEmpty(), equals(true));

      final singleStream = LazyStream<int>(1);
      expect(singleStream.isEmpty(), equals(false));

      final multiStream = LazyStream<int>(1, () => LazyStream<int>(2));
      expect(multiStream.isEmpty(), equals(false));
    });

    test('LazyStream head and tail', () {
      final stream = LazyStream<int>(
          1, () => LazyStream<int>(2, () => LazyStream<int>(3)));

      expect(stream.head, equals(1));
      expect(stream.tail?.head, equals(2));
      expect(stream.tail?.tail?.head, equals(3));
      expect(stream.tail?.tail?.tail?.isEmpty(), equals(true));
    });

    test('LazyStream map', () {
      final stream = LazyStream<int>(
          1, () => LazyStream<int>(2, () => LazyStream<int>(3)));
      final mapped = stream.map((n) => n * 2);
      expect(mapped.toString(), equals('LazyStream(2, 4, 6)'));
    });

    test('LazyStream flatMap', () {
      final stream = LazyStream<int>(1, () => LazyStream<int>(2));
      final flatMapped = stream
          .flatMap((n) => LazyStream<int>(n, () => LazyStream<int>(n + 10)));
      expect(flatMapped.toString(), equals('LazyStream(1, 11, 2, 12)'));
    });

    test('LazyStream fold', () {
      final stream = LazyStream<int>(
          1, () => LazyStream<int>(2, () => LazyStream<int>(3)));
      final sum = stream.fold(0, (acc, n) => acc + n);
      expect(sum, equals(6));
    });

    test('LazyStream toList', () {
      final stream = LazyStream<int>(
          1, () => LazyStream<int>(2, () => LazyStream<int>(3)));
      final list = stream.toList();
      expect(list, equals([1, 2, 3]));
    });

    test('LazyStream length', () {
      final emptyStream = LazyStream<int>(null);
      expect(emptyStream.length(), equals(0));

      final singleStream = LazyStream<int>(1);
      expect(singleStream.length(), equals(1));

      final multiStream = LazyStream<int>(
          1, () => LazyStream<int>(2, () => LazyStream<int>(3)));
      expect(multiStream.length(), equals(3));
    });

    test('LazyStream skip', () {
      final stream = LazyStream<int>(
          1,
          () => LazyStream<int>(
              2, () => LazyStream<int>(3, () => LazyStream<int>(4))));
      final skipped = stream.skip(2);
      expect(skipped.toString(), equals('LazyStream(3, 4)'));
    });

    test('LazyStream dropWhile', () {
      final stream = LazyStream<int>(
          1,
          () => LazyStream<int>(
              2, () => LazyStream<int>(3, () => LazyStream<int>(4))));
      final dropped = stream.dropWhile((n) => n < 3);
      expect(dropped.toString(), equals('LazyStream(3, 4)'));
    });

    test('LazyStream takeWhile', () {
      final stream = LazyStream<int>(
          1,
          () => LazyStream<int>(
              2, () => LazyStream<int>(3, () => LazyStream<int>(4))));
      final taken = stream.takeWhile((n) => n < 3);
      expect(taken.toString(), equals('LazyStream(1, 2)'));
    });
  });
}
