import '../generator.dart';
import '../shrinkable.dart';

/// Chains the generation of a tuple with the generation of a subsequent value
/// that depends on the tuple's contents.
///
/// This allows creating generators where the parameters of one generator depend
/// on the output of a previous one, specifically within the context of building up a tuple.
///
/// [tupleGen] The generator for the initial tuple elements.
/// [genFactory] A function that takes the generated tuple and returns a generator for the final element.
/// Returns a generator for the combined tuple.
Generator<List<dynamic>> chainTuple<T, U>(
  Generator<List<T>> tupleGen,
  Generator<U> Function(List<T>) genFactory,
) {
  return Arbitrary<List<dynamic>>((rand) {
    // Generate the initial tuple and the dependent value
    final tupleShr = tupleGen.generate(rand);
    final dependentGen = genFactory(tupleShr.value);
    final dependentShr = dependentGen.generate(rand);

    // Create a simple shrinkable that combines both values
    return Shrinkable<List<dynamic>>([...tupleShr.value, dependentShr.value]);
  });
}
