import '../shrinkable.dart';
import 'integer.dart';
import 'advanced_array.dart';

/// Creates a Shrinkable for strings based on an array of shrinkable UTF-16 codepoints.
/// This shrinker first attempts to reduce the length of the string (in bytes),
/// then shrinks the individual codepoints themselves.
///
/// [codepoints] An array of Shrinkable numbers representing the UTF-16 codepoints.
/// [minSize] The minimum allowed size of the string in bytes.
/// Returns a Shrinkable string.
Shrinkable<String> shrinkableString(
    List<Shrinkable<int>> codepoints, int minSize) {
  final size = codepoints.length;
  final rangeShrinkable =
      binarySearchShrinkable(size - minSize).map((s) => s + minSize);

  // Shrink the size (in bytes) of the string first
  Shrinkable<List<Shrinkable<int>>> shrinkableArr =
      rangeShrinkable.map((newSize) {
    if (newSize == 0) return <Shrinkable<int>>[];

    int curSize = 0;
    int i = 0;
    // Calculate the number of codepoints needed to reach `newSize` bytes.
    // Codepoints >= 0x10000 (surrogate pairs) count as 2 bytes.
    for (; i < codepoints.length && curSize < newSize; i++) {
      if (codepoints[i].value >= 0x10000) {
        curSize += 2;
      } else {
        curSize += 1;
      }
    }
    // Slice the array, adjusting index if the last codepoint pushed us over the size limit.
    final result = codepoints.sublist(0, curSize <= newSize ? i : i - 1);

    // Ensure we don't go below the minimum character count
    if (result.length < minSize) {
      return codepoints.sublist(0, minSize);
    }

    return result;
  });

  // Then, shrink the individual codepoints within the array
  shrinkableArr =
      shrinkableArr.andThen((parent) => shrinkElementWise(parent, 0, 0));
  return shrinkableArr.map((theArr) {
    final codePoints = theArr.map((shr) => shr.value).toList();
    return String.fromCharCodes(codePoints);
  });
}
