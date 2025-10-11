/// A type-safe wrapper for functions that provides runtime type checking
///
/// This class allows you to create type-safe function wrappers that can be called
/// with a list of arguments, with runtime type checking to ensure type safety.
class TypedFunction<T> {
  /// The expected types for each argument
  final List<Type> argTypes;

  /// The underlying function that takes a list of arguments
  final T Function(List<dynamic>) fn;

  /// The original function (if provided) for direct application
  final Function? originalFunc;

  /// Creates a TypedFunction with runtime type checking
  ///
  /// [argTypes] The expected types for each argument
  /// [fn] The function that takes a list of arguments
  /// [originalFunc] Optional original function for direct application
  TypedFunction(this.argTypes, this.fn, [this.originalFunc]);

  /// Calls the function with the provided arguments, performing runtime type checking
  ///
  /// [args] The arguments to pass to the function
  /// Returns the result of calling the function
  /// Throws [ArgumentError] if argument count or types don't match
  T call(List<dynamic> args) {
    if (args.length != argTypes.length) {
      throw ArgumentError(
          'Expected ${argTypes.length} arguments, got ${args.length}');
    }

    for (int i = 0; i < args.length; i++) {
      if (args[i].runtimeType != argTypes[i]) {
        throw ArgumentError(
            'Argument $i should be of type ${argTypes[i]}, got ${args[i].runtimeType}');
      }
    }

    return fn(args);
  }

  /// Creates a TypedFunction from a regular function using Function.apply
  ///
  /// [argTypes] The expected types for each argument
  /// [func] The original function to wrap
  /// Returns a TypedFunction that wraps the original function
  static TypedFunction<R> fromFunction<R>(List<Type> argTypes, Function func) {
    return TypedFunction<R>(
      argTypes,
      (args) => Function.apply(func, args) as R,
      func,
    );
  }

  /// Creates a TypedFunction for a function with no arguments
  static TypedFunction<R> noArgs<R>(R Function() func) {
    return TypedFunction<R>(
      [],
      (_) => func(),
      func,
    );
  }

  /// Creates a TypedFunction for a function with one argument
  static TypedFunction<R> oneArg<A, R>(R Function(A) func) {
    return TypedFunction<R>(
      [A],
      (args) => func(args[0] as A),
      func,
    );
  }

  /// Creates a TypedFunction for a function with two arguments
  static TypedFunction<R> twoArgs<A, B, R>(R Function(A, B) func) {
    return TypedFunction<R>(
      [A, B],
      (args) => func(args[0] as A, args[1] as B),
      func,
    );
  }

  /// Creates a TypedFunction for a function with three arguments
  static TypedFunction<R> threeArgs<A, B, C, R>(R Function(A, B, C) func) {
    return TypedFunction<R>(
      [A, B, C],
      (args) => func(args[0] as A, args[1] as B, args[2] as C),
      func,
    );
  }

  /// Creates a TypedFunction for a function with four arguments
  static TypedFunction<R> fourArgs<A, B, C, D, R>(R Function(A, B, C, D) func) {
    return TypedFunction<R>(
      [A, B, C, D],
      (args) => func(args[0] as A, args[1] as B, args[2] as C, args[3] as D),
      func,
    );
  }

  /// Creates a TypedFunction for a function with five arguments
  static TypedFunction<R> fiveArgs<A, B, C, D, E, R>(
      R Function(A, B, C, D, E) func) {
    return TypedFunction<R>(
      [A, B, C, D, E],
      (args) => func(
          args[0] as A, args[1] as B, args[2] as C, args[3] as D, args[4] as E),
      func,
    );
  }
}

/// Type alias for any function that can be called with a list of arguments
typedef AnyFunction = dynamic Function(List<dynamic> args);
