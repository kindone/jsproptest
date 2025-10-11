import 'util/json.dart';

/// An iterator for consuming a LazyStream. It keeps track of the remaining stream state.
/// Note: This iterator modifies the stream it references as it progresses.
class _Iterator<T> {
  /// The LazyStream to iterate over.
  LazyStream<T> stream;

  _Iterator(this.stream);

  bool hasNext() {
    return !stream.isEmpty();
  }

  T next() {
    if (!hasNext()) throw Exception('iterator has no more next');
    final value = stream.getHead();
    stream = stream.getTail();
    return value;
  }
}

/// Represents a potentially infinite lazy sequence of values of type T.
/// Operations on LazyStreams are typically lazy, meaning they don't compute values
/// until they are explicitly requested (e.g., by an Iterator).
class LazyStream<T> {
  /// The first element of the stream, or null if the stream is empty.
  final T? head;

  /// A function that, when called, generates the rest of the stream (the tail).
  /// This function enables the lazy evaluation of the stream.
  final LazyStream<T> Function() tailGen;

  /// Creates a new LazyStream instance.
  ///
  /// [head] The first element of the stream, or null if the stream is empty.
  /// [tailGen] A function that, when called, generates the rest of the stream (the tail).
  ///           This function enables the lazy evaluation of the stream.
  LazyStream(this.head, [LazyStream<T> Function()? tailGen])
      : tailGen = tailGen ?? (() => LazyStream<T>(null));

  /// Returns true if the stream is empty.
  bool isEmpty() {
    return head == null;
  }

  /// Returns the head element of the stream.
  ///
  /// Throws an exception if the stream is empty.
  T getHead() {
    if (head == null) throw Exception('Stream is empty');
    return head!;
  }

  /// Returns the tail of the stream.
  LazyStream<T> getTail() {
    if (isEmpty()) return LazyStream<T>(null);
    return tailGen();
  }

  /// Returns an Iterator to consume the stream.
  _Iterator<T> iterator() {
    return _Iterator<T>(this);
  }

  /// Lazily transforms each element of the stream using the provided function.
  ///
  /// [transformer] A function to apply to each element.
  /// Returns a new LazyStream containing the transformed elements.
  LazyStream<U> transform<U>(U Function(T) transformer) {
    if (isEmpty()) return LazyStream<U>(null);
    return LazyStream<U>(
        transformer(getHead()), () => getTail().transform(transformer));
  }

  /// Lazily filters the stream based on a predicate.
  /// It iterates through the stream until it finds the first element satisfying the criteria.
  ///
  /// [criteria] A function that returns true for elements to keep.
  /// Returns a new LazyStream containing only the elements that satisfy the criteria.
  LazyStream<T> filter(bool Function(T) criteria) {
    if (isEmpty()) return LazyStream<T>(null);

    final itr = iterator();
    while (itr.hasNext()) {
      final value = itr.next();
      if (criteria(value)) {
        final stream = itr.stream;
        return LazyStream<T>(value, () => stream.filter(criteria));
      }
    }
    return LazyStream<T>(null);
  }

  /// Lazily concatenates this stream with another stream.
  /// The elements of the 'other' stream are only accessed after this stream is exhausted.
  ///
  /// [other] The stream to append to the end of this stream.
  /// Returns a new LazyStream representing the concatenation.
  LazyStream<T> concat(LazyStream<T> other) {
    if (isEmpty()) return other;
    return LazyStream<T>(head, () => getTail().concat(other));
  }

  /// Lazily takes the first n elements from the stream.
  ///
  /// [n] The maximum number of elements to take.
  /// Returns a new LazyStream containing at most n elements from the beginning of this stream.
  LazyStream<T> take(int n) {
    if (isEmpty() || n == 0) return LazyStream<T>(null);
    return LazyStream<T>(head, () => getTail().take(n - 1));
  }

  /// Creates a shallow copy of the stream. The head is copied, and the tail generator function is reused.
  /// Useful when multiple consumers might iterate over the same starting point independently.
  LazyStream<T> clone() {
    return LazyStream<T>(head, tailGen);
  }

  /// Returns a string representation of the stream, evaluating up to n elements.
  /// Useful for debugging and inspection.
  ///
  /// [n] The maximum number of elements to include in the string representation. Defaults to 100.
  @override
  String toString([int n = 100]) {
    String str = 'LazyStream(';
    final first = iterator();
    if (first.hasNext() && n > 0) {
      str += JSONStringify.call(first.next());
    }

    int i = 1;
    for (var itr = first; itr.hasNext(); i++) {
      if (i >= n) {
        str += ', ...';
        break;
      }
      final value = itr.next();
      str += ', ${JSONStringify.call(value)}';
    }
    str += ')';
    return str;
  }

  /// Creates an empty LazyStream.
  static LazyStream<T> empty<T>() {
    return LazyStream<T>(null);
  }

  /// Creates a LazyStream with a single element.
  static LazyStream<T> one<T>(T value) {
    return LazyStream<T>(value);
  }

  /// Creates a LazyStream with two elements.
  static LazyStream<T> two<T>(T value1, T value2) {
    return LazyStream<T>(value1, () => LazyStream<T>(value2));
  }

  /// Creates a LazyStream with three elements.
  static LazyStream<T> three<T>(T value1, T value2, T value3) {
    return LazyStream<T>(
        value1, () => LazyStream<T>(value2, () => LazyStream<T>(value3)));
  }

  /// Returns the tail of the stream (alias for getTail).
  LazyStream<T>? get tail => isEmpty() ? null : getTail();

  /// Maps each element of the stream using the provided function (alias for transform).
  LazyStream<U> map<U>(U Function(T) mapper) => transform(mapper);

  /// Applies a function to each element and flattens the result.
  LazyStream<U> flatMap<U>(LazyStream<U> Function(T) mapper) {
    if (isEmpty()) return LazyStream<U>(null);
    return mapper(getHead()).concat(getTail().flatMap(mapper));
  }

  /// Folds the stream from left to right using the provided function.
  U fold<U>(U initial, U Function(U, T) combine) {
    U result = initial;
    final itr = iterator();
    while (itr.hasNext()) {
      result = combine(result, itr.next());
    }
    return result;
  }

  /// Converts the stream to a list.
  List<T> toList() {
    final result = <T>[];
    final itr = iterator();
    while (itr.hasNext()) {
      result.add(itr.next());
    }
    return result;
  }

  /// Returns the length of the stream.
  int length() {
    int count = 0;
    final itr = iterator();
    while (itr.hasNext()) {
      itr.next();
      count++;
    }
    return count;
  }

  /// Skips the first n elements of the stream.
  LazyStream<T> skip(int n) {
    if (isEmpty() || n <= 0) return this;
    return getTail().skip(n - 1);
  }

  /// Drops elements from the beginning while the predicate is true.
  LazyStream<T> dropWhile(bool Function(T) predicate) {
    if (isEmpty()) return this;
    if (predicate(getHead())) {
      return getTail().dropWhile(predicate);
    }
    return this;
  }

  /// Takes elements from the beginning while the predicate is true.
  LazyStream<T> takeWhile(bool Function(T) predicate) {
    if (isEmpty() || !predicate(getHead())) return LazyStream<T>(null);
    return LazyStream<T>(getHead(), () => getTail().takeWhile(predicate));
  }
}
