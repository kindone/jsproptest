import '../generator.dart';
import '../shrinkable.dart';
import '../random.dart';

/// Wraps a Generator with an associated weight, used by `oneOf` to
/// determine the probability of selecting this generator.
class Weighted<T> implements Generator<T> {
  final Generator<T> gen;
  final double weight;

  Weighted(this.gen, this.weight);

  @override
  Shrinkable<T> generate(Random rand) {
    return gen.generate(rand);
  }

  @override
  Generator<U> map<U>(U Function(T) transformer) {
    return gen.map(transformer);
  }

  @override
  Generator<U> flatMap<U>(Generator<U> Function(T) genFactory) {
    return gen.flatMap(genFactory);
  }

  @override
  Generator<(T, U)> chain<U>(Generator<U> Function(T) genFactory) {
    return gen.chain(genFactory);
  }

  @override
  Generator<T> filter(bool Function(T) filterer) {
    return gen.filter(filterer);
  }
}

/// Helper function to explicitly create a Weighted generator.
Weighted<T> weightedGen<T>(Generator<T> gen, double weight) {
  return Weighted<T>(gen, weight);
}

/// Type check to determine if a generator is weighted.
bool isWeightedGenerator<T>(dynamic gen) {
  return gen is Weighted<T>;
}

/// Creates a generator that randomly selects one of the provided generators
/// based on their assigned weights. If some generators are not explicitly
/// weighted (using `weightedGen`), the remaining probability mass (1.0 - sum of weights)
/// is distributed equally among them.
///
/// [generators] A list of generators, optionally wrapped with `weightedGen`.
Generator<T> oneOf<T>(List<Generator<T>> generators) {
  double sum = 0.0;
  int numUnassigned = 0;

  // Initial pass to sum weights of explicitly weighted generators
  // and count unassigned ones.
  List<Weighted<T>> weightedGenerators = generators.map((generator) {
    if (isWeightedGenerator<T>(generator)) {
      final weighted = generator as Weighted<T>;
      sum += weighted.weight;
      return weighted;
    } else {
      numUnassigned++;
      // Temporarily assign 0 weight to unweighted generators
      return Weighted<T>(generator, 0.0);
    }
  }).toList();

  // Validate the sum of explicitly assigned weights.
  if (sum < 0.0 || sum > 1.0) {
    throw Exception(
        'invalid weights: sum must be between 0.0 (exclusive) and 1.0 (inclusive)');
  }

  // Distribute remaining probability mass among unweighted generators if any exist.
  if (numUnassigned > 0) {
    final rest = 1.0 - sum;
    if (rest <= 0.0) {
      throw Exception(
          'invalid weights: rest of weights must be greater than 0.0');
    }

    final perUnassigned = rest / numUnassigned;
    weightedGenerators = weightedGenerators.map((weightedGenerator) {
      if (weightedGenerator.weight == 0.0) {
        return Weighted<T>(weightedGenerator.gen, perUnassigned);
      } else {
        return weightedGenerator;
      }
    }).toList();
  }

  return Arbitrary<T>((rand) {
    // Selection loop: repeatedly pick a generator index and check against its weight.
    // This probabilistic check ensures generators are selected according to their weights.
    while (true) {
      final dice = rand.inRange(0, weightedGenerators.length);
      if (rand.nextBoolean(weightedGenerators[dice].weight)) {
        return weightedGenerators[dice].gen.generate(rand);
      }
    }
  });
}
