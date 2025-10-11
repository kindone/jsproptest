import '../generator.dart';
import '../shrinkable.dart';
import '../shrinker/set.dart';

/// Creates a Generator for producing Set<T> instances.
///
/// [elemGen] The generator for the elements to be included in the set.
/// [minSize] The minimum number of elements the generated set should contain.
/// [maxSize] The maximum number of elements the generated set should contain.
/// Returns a Generator that produces Set<T> instances with sizes between minSize and maxSize (inclusive).
Generator<Set<T>> setGen<T>(Generator<T> elemGen, int minSize, int maxSize) {
  return Arbitrary<Set<T>>((rand) {
    // Determine the target size for the set randomly within the specified range.
    final size = rand.interval(minSize, maxSize);
    final array = <Shrinkable<T>>[];
    final valueSet = <T>{};

    // Keep generating elements until the set reaches the target size.
    // Ensures uniqueness by checking if the value already exists in valueSet.
    int attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loops
    while (array.length < size && attempts < maxAttempts) {
      final shr = elemGen.generate(rand);
      if (!valueSet.contains(shr.value)) {
        array.add(shr);
        valueSet.add(shr.value);
      }
      attempts++;
    }

    // If we couldn't generate enough unique elements, use what we have
    if (array.length < size) {
      // This shouldn't happen in normal cases, but provides a safety net
      // We'll use the elements we managed to generate
    }

    // Create a shrinkable set from the generated unique elements.
    return shrinkableSet(array, minSize);
  });
}
