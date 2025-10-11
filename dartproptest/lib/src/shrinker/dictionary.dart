import '../shrinkable.dart';
import 'integer.dart';
import 'advanced_array.dart';

/// Creates a dictionary from a list of key-value pairs.
Map<String, T> _createDictionary<T>(List<(String, T)> pairs) {
  final dict = <String, T>{};
  for (final pair in pairs) {
    dict[pair.$1] = pair.$2;
  }
  return dict;
}

/// Creates a shrinkable dictionary that shrinks by reducing the number of key-value pairs
/// and optionally by shrinking the individual values.
///
/// [dict] The dictionary of Shrinkable values.
/// [minSize] The minimum number of key-value pairs.
/// [elementWise] If true, applies element-wise shrinking to the values. Defaults to false.
/// Returns a Shrinkable dictionary.
Shrinkable<Map<String, T>> shrinkableDictionary<T>(
  Map<String, Shrinkable<T>> dict,
  int minSize, {
  bool elementWise = false,
}) {
  final size = dict.length;
  final rangeShrinkable =
      binarySearchShrinkable(size - minSize).map((s) => s + minSize);

  Shrinkable<List<(String, Shrinkable<T>)>> shrinkablePairs =
      rangeShrinkable.map((newSize) {
    if (newSize == 0) return <(String, Shrinkable<T>)>[];

    final pairs = <(String, Shrinkable<T>)>[];
    int i = 0;
    for (final entry in dict.entries) {
      if (i < newSize) {
        pairs.add((entry.key, entry.value));
        i++;
      } else {
        break;
      }
    }
    return pairs;
  });

  // Apply element-wise shrinking if enabled
  if (elementWise) {
    // Convert to list of Shrinkable<(String, T)> for element-wise shrinking
    final shrinkableValuePairs = shrinkablePairs.map((pairs) =>
        pairs.map((pair) => pair.$2.map((value) => (pair.$1, value))).toList());

    // Apply element-wise shrinking
    final elementWiseShrinks = shrinkableValuePairs
        .andThen((parent) => shrinkElementWise(parent, 0, 0));

    // Convert back to the original format
    shrinkablePairs = elementWiseShrinks.map((shrinks) => shrinks
        .map((shrink) => (shrink.value.$1, Shrinkable<T>(shrink.value.$2)))
        .toList());
  }

  return shrinkablePairs.map((pairs) => _createDictionary(
      pairs.map((pair) => (pair.$1, pair.$2.value)).toList()));
}
