import 'generator.dart';
import 'random.dart';
import 'util/error.dart';
import 'util/json.dart';

/// Flutter-compatible main entry point for property-based testing.
///
/// This function works across all Dart platforms including Flutter.
/// It provides the same API as the mirrors-based version but uses
/// Function.apply for compatibility.
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
    } on NoSuchMethodError catch (e) {
      // Handle argument count/type mismatches
      if (e.toString().contains('Closure call with mismatched arguments')) {
        throw ArgumentError(
            'Function signature does not match provided generators. '
            'Expected ${_extractExpectedArgs(e.toString())} arguments, '
            'but got ${generators.length} generators.');
      }
      rethrow;
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
  return forAll(func, generators, numRuns: numRuns, seed: seed);
}

/// Internal class to hold the results of a shrinking operation.
class _ShrinkResult {
  /// Flag indicating if shrinking found a simpler failing case.
  final bool isSuccessful;

  /// The simplest arguments found that still cause the property to fail.
  final List<dynamic> args;

  /// The error object thrown by the property function for the simplest failing case.
  final Object? error;

  /// History of shrinking steps taken (argument index, stringified args).
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

/// Extracts expected argument count from NoSuchMethodError message
int _extractExpectedArgs(String errorMessage) {
  // Parse error message like: "Tried calling: function(3, 0) Found: function(int, int, int) => bool"
  final foundMatch = RegExp(r'Found: .*\(([^)]*)\)').firstMatch(errorMessage);
  if (foundMatch != null) {
    final params = foundMatch.group(1)?.trim();
    if (params == null || params.isEmpty) return 0;
    return params.split(',').length;
  }
  return 0;
}

/// Formats a failure message with type information
String _formatFailureMessage(
  List<dynamic> args,
  Object? error,
) {
  final buffer = StringBuffer();
  buffer.writeln('Property failed with arguments:');

  for (int i = 0; i < args.length; i++) {
    buffer.writeln('  arg$i: ${JSONStringify.call(args[i])}');
  }

  if (error != null) {
    buffer.writeln('Error: $error');
  }
  return buffer.toString();
}
