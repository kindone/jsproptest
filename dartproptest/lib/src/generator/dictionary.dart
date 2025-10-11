import '../generator.dart';
import '../shrinkable.dart';
import '../shrinker/dictionary.dart';

/// Generates a dictionary (Map) with keys of type String and values of type T.
///
/// [keyGen] The generator for the dictionary keys (must generate strings).
/// [elemGen] The generator for the dictionary values.
/// [minSize] The minimum number of key-value pairs in the dictionary.
/// [maxSize] The maximum number of key-value pairs in the dictionary.
/// Returns a generator for dictionaries.
Generator<Map<String, T>> dictionaryGen<T>(
  Generator<String> keyGen,
  Generator<T> elemGen,
  int minSize,
  int maxSize,
) {
  return Arbitrary<Map<String, T>>((rand) {
    final size = rand.interval(minSize, maxSize);
    final dict = <String, Shrinkable<T>>{};

    // Use the provided keyGen to generate keys.
    // Rely on the loop condition and existence check to ensure uniqueness eventually.
    // This might be inefficient for larger dictionaries or stricter key requirements.
    while (dict.length < size) {
      final keyShr = keyGen.generate(rand);
      if (!dict.containsKey(keyShr.value)) {
        dict[keyShr.value] = elemGen.generate(rand);
      }
    }

    return shrinkableDictionary(dict, minSize);
  });
}
