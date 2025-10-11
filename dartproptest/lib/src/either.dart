import 'option.dart';

/// Represents a value of one of two possible types (a disjoint union).
/// An instance of `Either` is either an instance of `Left` or `Right`.
/// By convention, `Left` holds errors and `Right` holds success values.
/// (as 'right' also means 'correct' in English)
///
/// [Left] The type of the Left value.
/// [Right] The type of the Right value.
class Either<Left, Right> {
  final Option<Left> _left;
  final Option<Right> _right;

  /// Internal constructor
  Either(this._left, this._right);

  /// Checks if this `Either` is a `Left`.
  bool isLeft() {
    return !_left.isEmpty();
  }

  /// Checks if this `Either` is a `Right`.
  bool isRight() {
    return !_right.isEmpty();
  }

  /// Gets the `Left` value.
  /// Throws an error if this is a `Right`.
  Left getLeft() {
    if (!isLeft()) throw Exception('Cannot getLeft on a Right');
    return _left.get();
  }

  /// Gets the `Right` value.
  /// Throws an error if this is a `Left`.
  Right getRight() {
    if (!isRight()) throw Exception('Cannot getRight on a Left');
    return _right.get();
  }

  /// Maps the `Right` value if this is a `Right`.
  ///
  /// [NewRight] The type of the new `Right` value.
  /// [fn] The mapping function.
  Either<Left, NewRight> map<NewRight>(NewRight Function(Right) fn) {
    if (isRight()) {
      return Either<Left, NewRight>(None<Left>(), Some(fn(getRight())));
    } else {
      return Either<Left, NewRight>(_left, None<NewRight>());
    }
  }

  /// Flat-maps the `Right` value if this is a `Right`.
  ///
  /// [NewRight] The type of the new `Right` value.
  /// [fn] The mapping function returning an `Either`.
  Either<Left, NewRight> flatMap<NewRight>(
      Either<Left, NewRight> Function(Right) fn) {
    if (isRight()) {
      return fn(getRight());
    } else {
      return Either<Left, NewRight>(_left, None<NewRight>());
    }
  }

  /// Filters the `Right` value, returning `Left` if the predicate fails.
  /// If the right exists and the predicate returns true, the right is returned unchanged.
  /// If the right exists and the predicate returns false, the left is returned with the provided left value.
  /// If the right does not exist, the left is returned unchanged.
  /// [NewLeft] The type of the `Left` value if the filter fails.
  /// [fn] The predicate function.
  /// [left] The value to use for `Left` if the predicate fails.
  Either<NewLeft, Right> filterOrElse<NewLeft>(
      bool Function(Right) fn, NewLeft left) {
    if (isRight()) {
      if (fn(getRight())) {
        return Either<NewLeft, Right>(None<NewLeft>(), _right);
      } else {
        return Either<NewLeft, Right>(Some(left), None<Right>());
      }
    } else {
      return Either<NewLeft, Right>(Some(left), None<Right>());
    }
  }

  /// Maps the `Left` value if this is a `Left`.
  /// If the left exists, the mapping function is applied to the left value and the result is returned as a new `Left`.
  /// If the left does not exist, the right is returned unchanged.
  /// [NewLeft] The type of the new `Left` value.
  /// [fn] The mapping function.
  Either<NewLeft, Right> mapLeft<NewLeft>(NewLeft Function(Left) fn) {
    if (isLeft()) {
      return Either<NewLeft, Right>(Some(fn(getLeft())), None<Right>());
    } else {
      return Either<NewLeft, Right>(None<NewLeft>(), _right);
    }
  }

  /// Flat-maps the `Left` value if this is a `Left`.
  /// If the left exists, the mapping function is applied to the left value and the result is returned as a new `Left`.
  /// If the left does not exist, the right is returned unchanged.
  /// [NewLeft] The type of the new `Left` value.
  /// [fn] The mapping function returning an `Either`.
  Either<NewLeft, Right> flatMapLeft<NewLeft>(
      Either<NewLeft, Right> Function(Left) fn) {
    if (isLeft()) {
      return fn(getLeft());
    } else {
      return Either<NewLeft, Right>(None<NewLeft>(), _right);
    }
  }

  /// Filters the `Left` value, returning `Right` if the predicate fails.
  /// If the left exists and the predicate returns true, the left is returned unchanged.
  /// If the left exists and the predicate returns false, the right is returned with the provided right value.
  /// If the left does not exist, the right is returned unchanged.
  /// [NewRight] The type of the `Right` value if the filter fails.
  /// [fn] The predicate function.
  /// [right] The value to use for `Right` if the predicate fails.
  Either<Left, NewRight> filterOrElseLeft<NewRight>(
      bool Function(Left) fn, NewRight right) {
    if (isLeft()) {
      if (fn(getLeft())) {
        return Either<Left, NewRight>(_left, None<NewRight>());
      } else {
        return Either<Left, NewRight>(None<Left>(), Some(right));
      }
    } else {
      return Either<Left, NewRight>(None<Left>(), Some(right));
    }
  }
}

/// Creates a `Left` instance.
/// [L] Type of the `Left` value.
/// [R] Type of the `Right` value (defaults to `Never`).
Either<L, R> Left<L, R>(L left) {
  return Either<L, R>(Some(left), None<R>());
}

/// Creates a `Right` instance.
/// [R] Type of the `Right` value.
/// [L] Type of the `Left` value (defaults to `Never`).
Either<L, R> Right<L, R>(R right) {
  return Either<L, R>(None<L>(), Some(right));
}
