import '../generator.dart';
import '../shrinkable.dart';
import '../shrinker/array.dart';
import 'set.dart';

/// Generates an array of elements using the provided element generator.
/// The generated array adheres to the specified minimum and maximum size constraints.
/// It utilizes `shrinkableArray` to enable shrinking towards smaller arrays and simpler element values
/// during property-based testing failures.
///
/// [elemGen] The generator for individual elements.
/// [minSize] The minimum number of elements in the generated array.
/// [maxSize] The maximum number of elements in the generated array.
/// Returns a generator producing arrays of type T.
Generator<List<T>> arrayGen<T>(Generator<T> elemGen, int minSize, int maxSize) {
  return Arbitrary<List<T>>((rand) {
    final size = rand.interval(minSize, maxSize);
    final array = <Shrinkable<T>>[];
    for (int i = 0; i < size; i++) {
      array.add(elemGen.generate(rand));
    }

    return shrinkableArray(array, minSize);
  });
}

/// Generates an array containing unique elements, sorted in ascending order.
/// It achieves uniqueness by first generating a Set using `setGen` and then converting the Set into an array.
/// Sorting ensures a canonical representation for the generated unique arrays.
///
/// [elemGen] The generator for individual elements.
/// [minSize] The minimum number of unique elements in the generated array.
/// [maxSize] The maximum number of unique elements in the generated array.
/// Returns a generator producing sorted arrays of unique elements of type T.
Generator<List<T>> uniqueArrayGen<T>(
    Generator<T> elemGen, int minSize, int maxSize) {
  return setGen(elemGen, minSize, maxSize).map((set) {
    final arr = set.toList();
    arr.sort();
    return arr;
  });
}
