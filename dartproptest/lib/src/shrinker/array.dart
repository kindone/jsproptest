import '../shrinkable.dart';
import 'integer.dart';

/// Shrinks an array by reducing its length from the rear.
/// It attempts to produce arrays with lengths ranging from the original size down to `minSize`.
/// Uses binary search internally for efficiency.
///
/// [shrinkableElems] The array of Shrinkable elements.
/// [minSize] The minimum allowed size for the shrunken array.
/// Returns a Shrinkable representing arrays of potentially smaller lengths.
Shrinkable<List<T>> shrinkArrayLength<T>(
    List<Shrinkable<T>> shrinkableElems, int minSize) {
  final size = shrinkableElems.length;
  final rangeShrinkable =
      binarySearchShrinkable(size - minSize).map((s) => s + minSize);

  return rangeShrinkable.map((newSize) {
    if (newSize == 0) return <T>[];
    return shrinkableElems.sublist(0, newSize).map((shr) => shr.value).toList();
  });
}

/// Creates a Shrinkable for an array, allowing shrinking by removing elements.
/// This is a simplified version that focuses on length-based shrinking.
///
/// [shrinkableElems] The initial array of Shrinkable elements.
/// [minSize] The minimum allowed length of the array after shrinking.
/// Returns a Shrinkable<Array<T>> that represents the original array and its potential shrunken versions.
Shrinkable<List<T>> shrinkableArray<T>(
    List<Shrinkable<T>> shrinkableElems, int minSize) {
  // For now, just use the length-based shrinking directly
  return shrinkArrayLength(shrinkableElems, minSize);
}
