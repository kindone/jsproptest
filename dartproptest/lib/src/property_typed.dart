import 'generator.dart';
import 'random.dart';
import 'util/error.dart';
import 'util/json.dart';
import 'typed_function.dart';

/// Enhanced property-based testing with type-safe function support
///
/// This module provides type-safe alternatives to the standard forAll function,
/// allowing you to write cleaner, more type-safe property tests.

/// Type-safe version of forAll that accepts a TypedFunction
///
/// [typedFunc] A TypedFunction that provides runtime type checking
/// [gens] Generators for each argument of the test function
/// [numRuns] Number of test runs (default: 200)
/// [seed] Optional seed for reproducible tests
/// Returns `true` if the property holds for all runs
/// Throws An error describing the failure and the smallest failing arguments found
bool forAllTyped<T>(
  TypedFunction<T> typedFunc,
  List<Generator<dynamic>> gens, {
  int numRuns = 200,
  String seed = '',
}) {
  if (gens.length != typedFunc.argTypes.length) {
    throw ArgumentError(
        'Number of generators (${gens.length}) must match number of argument types (${typedFunc.argTypes.length})');
  }

  final random = seed.isEmpty ? Random() : Random(seed);
  int numPrecondFailures = 0;
  dynamic result = true;

  for (int i = 0; i < numRuns; i++) {
    final savedRandom = random.clone();

    try {
      final args = gens.map((gen) => gen.generate(random).value).toList();

      // Use the typed function with runtime type checking
      result = typedFunc(args);

      if (result == false) {
        throw Exception('Property failed with args: $args');
      }
    } on PreconditionError {
      numPrecondFailures++;
      if (numPrecondFailures > numRuns * 0.5) {
        throw Exception('Too many precondition failures: $numPrecondFailures');
      }
      continue;
    } catch (e) {
      // Attempt to shrink the failing arguments
      final shrinkResult = _shrinkFailingArgs(typedFunc, gens, savedRandom, e);
      final errorMsg = _formatFailureMessage(
        typedFunc.argTypes,
        shrinkResult.args,
        shrinkResult.error,
        shrinkResult.failedArgs,
      );
      throw Exception(errorMsg);
    }
  }

  return true;
}

/// Convenience function for type-safe property testing with 1 argument
bool forAll1<A>(
  bool Function(A) func,
  Generator<A> genA, {
  int numRuns = 200,
  String seed = '',
}) {
  final typedFunc = TypedFunction.oneArg(func);
  return forAllTyped(typedFunc, [genA], numRuns: numRuns, seed: seed);
}

/// Convenience function for type-safe property testing with 2 arguments
bool forAll2<A, B>(
  bool Function(A, B) func,
  Generator<A> genA,
  Generator<B> genB, {
  int numRuns = 200,
  String seed = '',
}) {
  final typedFunc = TypedFunction.twoArgs(func);
  return forAllTyped(typedFunc, [genA, genB], numRuns: numRuns, seed: seed);
}

/// Convenience function for type-safe property testing with 3 arguments
bool forAll3<A, B, C>(
  bool Function(A, B, C) func,
  Generator<A> genA,
  Generator<B> genB,
  Generator<C> genC, {
  int numRuns = 200,
  String seed = '',
}) {
  final typedFunc = TypedFunction.threeArgs(func);
  return forAllTyped(typedFunc, [genA, genB, genC],
      numRuns: numRuns, seed: seed);
}

/// Convenience function for type-safe property testing with 4 arguments
bool forAll4<A, B, C, D>(
  bool Function(A, B, C, D) func,
  Generator<A> genA,
  Generator<B> genB,
  Generator<C> genC,
  Generator<D> genD, {
  int numRuns = 200,
  String seed = '',
}) {
  final typedFunc = TypedFunction.fourArgs(func);
  return forAllTyped(typedFunc, [genA, genB, genC, genD],
      numRuns: numRuns, seed: seed);
}

/// Convenience function for type-safe property testing with 5 arguments
bool forAll5<A, B, C, D, E>(
  bool Function(A, B, C, D, E) func,
  Generator<A> genA,
  Generator<B> genB,
  Generator<C> genC,
  Generator<D> genD,
  Generator<E> genE, {
  int numRuns = 200,
  String seed = '',
}) {
  final typedFunc = TypedFunction.fiveArgs(func);
  return forAllTyped(typedFunc, [genA, genB, genC, genD, genE],
      numRuns: numRuns, seed: seed);
}

/// Internal class to hold the results of a shrinking operation
class _ShrinkResult {
  final bool isSuccessful;
  final List<dynamic> args;
  final Object? error;
  final List<(int, String)>? failedArgs;

  _ShrinkResult(this.args, [this.error, this.failedArgs])
      : isSuccessful = error != null;
}

/// Attempts to shrink failing arguments to find a minimal failing case
_ShrinkResult _shrinkFailingArgs<T>(
  TypedFunction<T> typedFunc,
  List<Generator<dynamic>> gens,
  Random random,
  Object originalError,
) {
  // For now, return the original failing case
  // In a full implementation, this would attempt to shrink the arguments
  final args = gens.map((gen) => gen.generate(random).value).toList();
  return _ShrinkResult(args, originalError, null);
}

/// Formats a failure message with type information
String _formatFailureMessage(
  List<Type> argTypes,
  List<dynamic> args,
  Object? error,
  List<(int, String)>? failedArgs,
) {
  final buffer = StringBuffer();
  buffer.writeln('Property failed with typed arguments:');

  for (int i = 0; i < args.length; i++) {
    buffer.writeln(
        '  ${argTypes[i].toString()} arg$i: ${JSONStringify.call(args[i])}');
  }

  if (error != null) {
    buffer.writeln('Error: $error');
  }

  if (failedArgs != null && failedArgs.isNotEmpty) {
    buffer.writeln('Shrinking history:');
    for (final (index, argStr) in failedArgs) {
      buffer.writeln('  arg$index: $argStr');
    }
  }

  return buffer.toString();
}
