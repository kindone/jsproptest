import '../generator.dart';
import '../shrinkable.dart';

/// Represents a value with an associated weight, used for weighted random selection.
class WeightedValue<T> {
  final T value;
  final double weight;

  WeightedValue(this.value, this.weight);
}

/// Helper function to create a weighted value.
WeightedValue<T> weightedValue<T>(T value, double weight) {
  return WeightedValue<T>(value, weight);
}

/// Type check to determine if an element is weighted.
bool isWeighted<T>(dynamic element) {
  return element is WeightedValue<T>;
}

/// Takes an array of values or weighted values and returns an array of weighted values
/// where the weights are normalized to sum to 1.0. If some values are unweighted,
/// they are assigned equal portions of the remaining weight after accounting for
/// explicitly weighted values.
List<WeightedValue<T>> normalizeWeightedValues<T>(List<dynamic> arr) {
  double sum = 0.0;
  int numUnassigned = 0;

  List<WeightedValue<T>> weightedValues = arr.map((rawOrWeighted) {
    if (isWeighted<T>(rawOrWeighted)) {
      final weighted = rawOrWeighted as WeightedValue<T>;
      sum += weighted.weight;
      return weighted;
    } else {
      numUnassigned++;
      return WeightedValue<T>(rawOrWeighted as T, 0.0);
    }
  }).toList();

  // Validate the sum of explicitly assigned weights.
  if (sum < 0.0 || sum > 1.0) {
    throw Exception(
        'invalid weights: sum must be between 0.0 (exclusive) and 1.0 (inclusive)');
  }

  if (numUnassigned > 0) {
    final rest = 1.0 - sum;
    if (rest <= 0.0) {
      throw Exception(
          'invalid weights: rest of weights must be greater than 0.0');
    }

    final perUnassigned = rest / numUnassigned;
    weightedValues = weightedValues.map((weightedValue) {
      if (weightedValue.weight == 0.0) {
        return WeightedValue<T>(weightedValue.value, perUnassigned);
      } else {
        return weightedValue;
      }
    }).toList();
  }

  return weightedValues;
}

/// Creates a generator that produces values randomly selected from the provided array,
/// respecting the weights if provided. Uses normalized weights to ensure fair selection.
///
/// [values] An array containing either plain values of type T or WeightedValue<T> objects.
///          Weights should be between 0 and 1 (exclusive). If weights are provided, they don't need
///          to sum to 1 initially; they will be normalized. Unweighted values will share
///          the remaining probability mass equally.
/// Returns a Generator that produces values of type T based on the weighted distribution.
Generator<T> elementOf<T>(List<dynamic> values) {
  final weightedValues = normalizeWeightedValues<T>(values);

  return Arbitrary<T>((rand) {
    while (true) {
      final dice = rand.inRange(0, weightedValues.length);
      if (rand.nextBoolean(weightedValues[dice].weight)) {
        return Shrinkable<T>(weightedValues[dice].value);
      }
    }
  });
}
