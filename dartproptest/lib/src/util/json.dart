/// Utility functions for JSON serialization
class JSONStringify {
  /// Converts a value to its JSON string representation.
  ///
  /// This is a simplified implementation that handles basic Dart types.
  /// For more complex objects, it falls back to toString().
  static String call(dynamic value) {
    if (value == null) return 'null';
    if (value is String) return '"$value"';
    if (value is num || value is bool) return value.toString();
    if (value is List) {
      final items = value.map((item) => call(item)).join(', ');
      return '[$items]';
    }
    if (value is Map) {
      final entries = value.entries
          .map((entry) => '${call(entry.key)}: ${call(entry.value)}')
          .join(', ');
      return '{$entries}';
    }
    if (value is Set) {
      final items = value.map((item) => call(item)).join(', ');
      return '{$items}';
    }
    // Fallback to toString for other types
    return value.toString();
  }
}
