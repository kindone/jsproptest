/// Represents an optional value: every `Option` is either `Some` and contains a value,
/// or `None` and does not.
class Option<T> {
  final T? _value;

  /// Constructs an Option instance. Direct use is discouraged; prefer `Some(value)` or `None()`.
  /// [value] The value to wrap, or null for None.
  Option([this._value]);

  /// Checks if the Option is None (does not contain a value).
  bool isEmpty() {
    return _value == null;
  }

  /// Gets the value out of the Option.
  /// Throws an error if the Option is None.
  T get() {
    if (isEmpty()) throw Exception('None does not contain value');
    return _value!;
  }

  /// Maps an Option<T> to Option<U> by applying a function to the contained value.
  /// If the option is None, it returns None.
  /// [fn] The function to apply to the contained value.
  Option<U> map<U>(U Function(T) fn) {
    if (isEmpty()) return None<U>();
    return Some(fn(_value!));
  }

  /// Applies a function that returns an Option to the contained value.
  /// Useful for chaining operations that might return None.
  /// [fn] The function to apply, which returns an Option.
  Option<U> flatMap<U>(Option<U> Function(T) fn) {
    if (isEmpty()) return None<U>();
    return fn(_value!);
  }

  /// Returns the Option if it contains a value and the value satisfies the predicate.
  /// Otherwise, returns None.
  /// [fn] The predicate function to apply to the contained value.
  Option<T> filter(bool Function(T) fn) {
    if (!isEmpty() && fn(_value!)) return Option<T>(_value);
    return None<T>();
  }
}

/// Creates an Option containing a value.
Option<T> Some<T>(T value) {
  return Option<T>(value);
}

/// Creates an Option that contains no value.
Option<T> None<T>() {
  return Option<T>();
}
