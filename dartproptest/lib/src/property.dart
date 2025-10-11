import 'generator.dart';
import 'random.dart';
import 'util/error.dart';
import 'util/json.dart';

/// Type alias for a property function that returns boolean (true = pass)
typedef PropertyFunction = bool Function(List<dynamic> args);

/// Type alias for a property function that returns void (implies pass, throws on failure)
typedef PropertyFunctionVoid = void Function(List<dynamic> args);

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

/// Represents a property-based test.
/// Encapsulates the test function, generators, execution logic, and configuration.
class Property {
  /// Default number of test runs if not explicitly set.
  static int defaultNumRuns = 200;

  /// Optional setup function executed before each test run (including shrinks).
  void Function()? onStartup;

  /// Optional teardown function executed after each *successful* test run (including shrinks).
  void Function()? onCleanup;

  /// Seed for the random number generator. Empty string uses a time-based seed.
  String seed = '';

  /// Number of times to generate arguments and run the test function.
  int numRuns = Property.defaultNumRuns;

  /// The function to test. It should return boolean (true=pass) or void (throws on failure).
  final dynamic func;

  /// Creates a new Property instance.
  ///
  /// [func] The function to test. It should return boolean (true=pass) or void (throws on failure).
  Property(this.func);

  /// Runs the property test.
  /// Executes the test function [numRuns] times with generated arguments.
  /// On failure, attempts to shrink the arguments to a minimal failing case.
  ///
  /// [gens] Generators for each argument of the test function.
  /// Returns `true` if the property holds for all runs.
  /// Throws An error describing the failure and the smallest failing arguments found.
  bool forAllLegacy<GENS extends List<Generator<dynamic>>>(
      List<Generator<dynamic>> gens) {
    final random = seed.isEmpty ? Random() : Random(seed);
    int numPrecondFailures = 0; // Counter for skipped runs due to preconditions
    dynamic result = true; // Holds the outcome of the latest test run

    for (int i = 0; i < numRuns; i++) {
      final savedRandom = random
          .clone(); // Save RNG state for reproducible shrinking if this run fails
      if (onStartup != null) onStartup!();

      final shrinkables = gens.map((gen) => gen.generate(random)).toList();
      final args = shrinkables.map((shr) => shr.value).toList();

      // Basic validation
      if (func is Function &&
          (func as Function).runtimeType.toString().contains('Function')) {
        // This is a simplified check - in practice, you'd need more sophisticated reflection
        // For now, we'll assume the function signature matches
      }

      // Execute the test function, handling exceptions and PreconditionError
      try {
        if (func is PropertyFunction) {
          final propertyFunc = func as PropertyFunction;
          final maybeResult = propertyFunc(args);
          result = maybeResult;
        } else if (func is PropertyFunctionVoid) {
          final propertyFunc = func as PropertyFunctionVoid;
          propertyFunc(args);
          result =
              true; // void functions that don't throw are considered successful
        } else {
          // Try to call as a generic function
          final maybeResult = Function.apply(func, args);
          result = maybeResult;
        }

        // Execute cleanup hook if defined and the function didn't throw
        if (onCleanup != null) onCleanup!();
      } catch (e) {
        result = e;
        if (result is PreconditionError) numPrecondFailures++;
        // Log if too many preconditions fail, potentially indicating an issue
        if (numPrecondFailures > 0 && numPrecondFailures % numRuns == 0) {
          print('Number of precondition failure exceeding $numPrecondFailures');
        }
      }

      // Skip to next iteration if a precondition failed
      if (result is PreconditionError) {
        continue;
      }

      // Check for actual failure (false return or Error thrown)
      // failed
      if ((result is Exception) || result == false) {
        // Attempt to shrink the failing arguments
        final shrinkResult = _shrink(savedRandom, gens);
        // Format and throw error
        throw _processFailureAsError(result, shrinkResult);
      }
    }

    // Property holds if loop completes without throwing
    return true;
  }

  /// Runs the property function with a specific set of example arguments.
  /// Does not involve generation or shrinking.
  /// Useful for testing specific known cases or debugging.
  ///
  /// [args] The example arguments to test.
  /// Returns `true` if the function returns true/void, `false` if it returns false or throws.
  bool example(List<dynamic> args) {
    try {
      if (func is PropertyFunction) {
        final propertyFunc = func as PropertyFunction;
        final maybeResult = propertyFunc(args);
        // Treat void return as success
        if (maybeResult != null)
          return maybeResult;
        else
          return true;
      } else if (func is PropertyFunctionVoid) {
        final propertyFunc = func as PropertyFunctionVoid;
        propertyFunc(args);
        return true; // void functions that don't throw are considered successful
      } else {
        // Try to call as a generic function
        final maybeResult = Function.apply(func, args);
        if (maybeResult != null)
          return maybeResult;
        else
          return true;
      }
    } catch (e) {
      // Treat any exception as failure
      return false;
    }
  }

  /// Sets the seed for the random number generator for reproducible runs.
  Property setSeed(String seed) {
    this.seed = seed;
    return this;
  }

  /// Sets the number of test runs to execute.
  Property setNumRuns(int numRuns) {
    this.numRuns = numRuns;
    return this;
  }

  /// Sets a setup function to be called before each test execution (including shrinks).
  Property setOnStartup(void Function() onStartup) {
    this.onStartup = onStartup;
    return this;
  }

  /// Sets a cleanup function to be called after each *successful* test execution (including shrinks).
  Property setOnCleanup(void Function() onCleanup) {
    this.onCleanup = onCleanup;
    return this;
  }

  /// Sets the default number of runs for all subsequently created Property instances.
  static void setDefaultNumRuns(int numRuns) {
    Property.defaultNumRuns = numRuns;
  }

  /// Internal method to perform shrinking on failed arguments.
  /// It attempts to find the smallest combination of arguments that still causes the property to fail.
  ///
  /// [savedRandom] The Random state corresponding to the generation of the initial failing args.
  /// [gens] The original generators used.
  /// Returns a _ShrinkResult containing the outcome and the simplest failing args found.
  _ShrinkResult _shrink(Random savedRandom, List<Generator<dynamic>> gens) {
    // Regenerate the initial failing shrinkables using the saved random state
    final shrinkables = gens.map((gen) => gen.generate(savedRandom)).toList();

    final List<(int, String)> failedArgs =
        []; // History of successful shrink steps (for reporting)

    // Start with the original failing arguments as the current best candidate
    final args = shrinkables.map((shr) => shr.value).toList();
    bool shrunk = false; // Flag: Did we find any simpler failing case?
    dynamic result =
        true; // Stores the failure result (Error or false) of the simplest case found

    // Iterate through each argument position (index n)
    for (int n = 0; n < shrinkables.length; n++) {
      var shrinks = shrinkables[n]
          .shrinks(); // Get the shrink candidates for the nth argument

      // Repeatedly try to shrink argument n as long as we find simpler failing values
      while (!shrinks.isEmpty()) {
        final iter = shrinks.iterator();
        bool shrinkFound =
            false; // Found a smaller failing value for arg n in this pass?

        // Test each shrink candidate for the current argument n
        while (iter.hasNext()) {
          final nextShrinkable = iter.next();
          // Test the property with arg n replaced by the shrink candidate value
          final testResult = _testWithReplace(args, n, nextShrinkable.value);

          // Check if this smaller value *also* causes a failure (ignoring PreconditionError)
          if ((testResult is Exception) || testResult == false) {
            // Yes, this shrink is a new, simpler failing case
            result = testResult;
            shrinks = nextShrinkable
                .shrinks(); // Get shrinks for this *new*, smaller value
            args[n] = nextShrinkable.value;
            shrinkFound = true;
            break; // Stop testing other shrinks at this level, focus on the new smaller value
          }
        }

        if (shrinkFound) {
          // Record the successful shrink step for reporting
          failedArgs.add((n, JSONStringify.call(args)));
          shrunk = true;
          // Continue shrinking the *same* argument (n) further
        } else {
          // No shrink candidate for arg n at this level caused a failure
          break; // Stop shrinking arg n, move to the next argument (n+1)
        }
      }
    }

    if (shrunk) {
      // If shrinking was successful
      if (result is Object) {
        return _ShrinkResult(args, result, failedArgs);
      } else {
        // If the failure was returning false, create a placeholder error
        final error = Exception('  property returned false\n');
        return _ShrinkResult(args, error, failedArgs);
      }
    } else {
      // If no shrinking was possible
      return _ShrinkResult(args);
    }
  }

  /// Helper to test the property with one argument replaced.
  /// Used during the shrinking process.
  dynamic _testWithReplace(List<dynamic> args, int n, dynamic replace) {
    final newArgs = [...args.sublist(0, n), replace, ...args.sublist(n + 1)];
    return _test(newArgs);
  }

  /// Executes the core property function ([func]) once with the given arguments.
  /// Handles startup/cleanup hooks and captures results or exceptions.
  ///
  /// Returns `true` on success, `false` if the function returns false, or the `Error` object if it throws.
  dynamic _test(List<dynamic> args) {
    try {
      // Execute startup hook if defined
      if (onStartup != null) onStartup!();

      if (func is PropertyFunction) {
        final propertyFunc = func as PropertyFunction;
        final maybeResult = propertyFunc(args);

        // Handle boolean return or void return
        if (maybeResult != null) {
          if (!maybeResult) return false; // Explicit false return means failure
        }
      } else if (func is PropertyFunctionVoid) {
        final propertyFunc = func as PropertyFunctionVoid;
        propertyFunc(args);
        // void functions that don't throw are considered successful
      } else {
        // Try to call as a generic function
        final maybeResult = Function.apply(func, args);
        if (maybeResult != null && !maybeResult) return false;
      }

      // Run cleanup only on success (true return or void return without exception)
      // Note: Cleanup does NOT run if the function returned false or threw an error.
      if (onCleanup != null) onCleanup!();
      return true;
    } catch (e) {
      // Catch exceptions
      // Note: Cleanup does NOT run in case of an exception.
      return e;
    }
  }

  /// Constructs the final Error object to be thrown when a property fails.
  /// Includes information about the original failure and the shrinking process.
  Exception _processFailureAsError(dynamic result, _ShrinkResult shrinkResult) {
    // shrink
    if (shrinkResult.isSuccessful) {
      // Case 1: Shrinking was successful
      final shrinkLines = shrinkResult.failedArgs?.map(((int, String) step) {
            return '  shrinking found simpler failing arg ${step.$1}: ${step.$2}';
          }).toList() ??
          <String>[];

      // Construct message with simplest args
      final newError = Exception(
          'property failed (simplest args found by shrinking): ${JSONStringify.call(shrinkResult.args)}\n' +
              shrinkLines.join('\n'));
      return newError;
    }
    // not shrunk
    else {
      // Case 2: Shrinking did not find a simpler failing case
      // Construct message with original failing args
      final newError = Exception(
          'property failed (args found): ${JSONStringify.call(shrinkResult.args)}');

      if (result is Object) {
        // Subcase 2a: The original failure was an Error
        return Exception('${newError.toString()}\n  ${result.toString()}');
      } else {
        // Subcase 2b: The original failure was returning false
        return Exception('${newError.toString()}\nproperty returned false\n');
      }
    }
  }
}

/// Convenience function to create and run a Property test using default settings.
/// Legacy entry point for users (deprecated).
/// Use the new variadic `forAll` function instead.
///
/// [func] The property function to test.
/// [gens] Generators for each argument of the test function.
/// Returns `true` if the property holds for all runs.
@Deprecated('Use the new variadic forAll function instead')
bool forAllLegacy(dynamic func, List<Generator<dynamic>> gens) {
  return Property(func).forAllLegacy(gens);
}
