import '../shrinkable.dart';
import 'array.dart';

/// Creates a shrinkable for `Set<T>` instances.
/// The shrinking process is based on shrinking the underlying array representation of the set.
/// It ensures that the size of the set does not shrink below the specified minimum size.
///
/// [array] An array of `Shrinkable<T>` elements that will form the initial set.
/// [minSize] The minimum number of elements the shrunk set must contain.
/// Returns a `Shrinkable` instance for the `Set<T>`.
Shrinkable<Set<T>> shrinkableSet<T>(List<Shrinkable<T>> array, int minSize) {
  final shrinkableArr = shrinkableArray(array, minSize);
  return shrinkableArr.map((theArr) => Set<T>.from(theArr));
}
