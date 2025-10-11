/// Custom exception types for the property-based testing framework

/// Exception thrown when a precondition fails during property testing.
/// This allows the test to skip the current input and try another one.
class PreconditionError implements Exception {
  final String message;

  PreconditionError(this.message);

  @override
  String toString() => 'PreconditionError: $message';
}
