import 'generator.dart';
import 'random.dart';
import 'util/error.dart';
import 'util/json.dart';

/// Main entry point for property-based testing.
///
/// This function works across all Dart platforms including Flutter.
/// It uses Function.apply to call functions with generated arguments.
///
/// Example:
/// ```dart
/// forAll(
///   (int a, int b) => a + b == b + a,
///   [Gen.interval(0, 100), Gen.interval(0, 100)],
/// );
/// ```
bool forAll<T>(
  Function func,
  List<Generator<dynamic>> generators, {
  int numRuns = 200,
  String seed = '',
}) {
  final random = seed.isEmpty ? Random() : Random(seed);
  int numPrecondFailures = 0;
  dynamic result = true;

  for (int i = 0; i < numRuns; i++) {
    final savedRandom = random.clone();

    try {
      final args = generators.map((gen) => gen.generate(random).value).toList();

      // Use Function.apply to call the function with the generated arguments
      result = Function.apply(func, args);

      if (result == false) {
        throw Exception('Property failed with args: $args');
      }
    } on PreconditionError {
      numPrecondFailures++;
      if (numPrecondFailures >= numRuns) {
        throw Exception(
            'Property failed: Too many precondition failures ($numPrecondFailures)');
      }
      continue;
    } catch (e) {
      // Attempt to shrink the failing arguments
      final shrinkResult = _shrinkFailingArgs(func, generators, savedRandom, e);
      throw Exception(
          'Property failed with args: ${shrinkResult.args}\nError: $e');
    }
  }

  return true;
}

/// Alias for the main forAll function (for backward compatibility)
bool forAllVariadic<T>(
  Function func,
  List<Generator<dynamic>> generators, {
  int numRuns = 200,
  String seed = '',
}) {
  return forAll(func, generators, numRuns: numRuns, seed: seed);
}

/// Alternative implementation using a simpler approach without mirrors
/// This version uses a more direct method that works across all Dart platforms
bool forAllSimple<T>(
  Function func,
  List<Generator<dynamic>> generators, {
  int numRuns = 200,
  String seed = '',
}) {
  final random = seed.isEmpty ? Random() : Random(seed);
  int numPrecondFailures = 0;
  dynamic result = true;

  for (int i = 0; i < numRuns; i++) {
    final savedRandom = random.clone();

    try {
      final args = generators.map((gen) => gen.generate(random).value).toList();

      // Use Function.apply to call the function with the generated arguments
      result = Function.apply(func, args);

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
      // For now, just throw the error with the failing arguments
      final args =
          generators.map((gen) => gen.generate(savedRandom).value).toList();
      final errorMsg = _formatSimpleFailureMessage(args, e);
      throw Exception(errorMsg);
    }
  }

  return true;
}

/// Formats a failure message for the simple approach
String _formatSimpleFailureMessage(List<dynamic> args, Object error) {
  final buffer = StringBuffer();
  buffer.writeln('Property failed with arguments:');

  for (int i = 0; i < args.length; i++) {
    buffer.writeln('  arg$i: ${JSONStringify.call(args[i])}');
  }

  buffer.writeln('Error: $error');

  return buffer.toString();
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
  Function func,
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
