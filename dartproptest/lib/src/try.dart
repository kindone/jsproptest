/// A utility class for handling operations that might fail.
/// Similar to Rust's Result type or functional programming's Either type.
class Try<T> {
  final T? _value;
  final Object? _error;
  final bool _isSuccess;

  Try._(this._value, this._error, this._isSuccess);

  /// Creates a successful Try with a value.
  factory Try.success(T value) => Try._(value, null, true);

  /// Creates a failed Try with an error.
  factory Try.failure(Object error) => Try._(null, error, false);

  /// Executes a function and wraps the result in a Try.
  /// If the function throws, it returns a failure Try.
  factory Try.of(T Function() computation) {
    try {
      return Try.success(computation());
    } catch (error) {
      return Try.failure(error);
    }
  }

  /// Returns true if this Try represents a success.
  bool get isSuccess => _isSuccess;

  /// Returns true if this Try represents a failure.
  bool get isFailure => !_isSuccess;

  /// Returns the value if this is a success, otherwise throws an exception.
  T get value {
    if (_isSuccess) return _value!;
    throw Exception('Try is a failure: $_error');
  }

  /// Returns the error if this is a failure, otherwise throws an exception.
  Object get error {
    if (isFailure) return _error!;
    throw Exception('Try is a success');
  }

  /// Returns the value if this is a success, otherwise returns the default value.
  T getOrElse(T defaultValue) {
    return _isSuccess ? _value! : defaultValue;
  }

  /// Returns the value if this is a success, otherwise throws the error.
  T getOrThrow([Object Function(Object)? errorTransformer]) {
    if (_isSuccess) return _value!;
    if (errorTransformer != null) {
      throw errorTransformer(_error!);
    }
    throw _error!;
  }

  /// Transforms the value if this is a success, otherwise returns this failure.
  Try<U> map<U>(U Function(T) transformer) {
    if (_isSuccess) {
      return Try.of(() => transformer(_value!));
    }
    return Try<U>.failure(_error!);
  }

  /// Transforms the value if this is a success, otherwise returns this failure.
  Try<U> flatMap<U>(Try<U> Function(T) transformer) {
    if (_isSuccess) {
      return transformer(_value!);
    }
    return Try<U>.failure(_error!);
  }

  @override
  String toString() {
    if (_isSuccess) {
      return 'Try.success($_value)';
    } else {
      return 'Try.failure($_error)';
    }
  }
}
