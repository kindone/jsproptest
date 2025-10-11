import 'random.dart';
import 'shrinkable.dart';

/// A simplified generator interface for basic functionality
abstract class SimpleGenerator<T> {
  Shrinkable<T> generate(Random rand);
  SimpleGenerator<U> map<U>(U Function(T) transformer);
}

/// A simple implementation of the generator interface
class SimpleArbitrary<T> implements SimpleGenerator<T> {
  final Shrinkable<T> Function(Random) genFunction;

  SimpleArbitrary(this.genFunction);

  @override
  Shrinkable<T> generate(Random rand) {
    return genFunction(rand);
  }

  @override
  SimpleGenerator<U> map<U>(U Function(T) transformer) {
    return SimpleArbitrary<U>((rand) => generate(rand).map(transformer));
  }
}

/// Simple integer generator
SimpleGenerator<int> simpleInterval(int min, int max) {
  return SimpleArbitrary<int>((rand) {
    final value = rand.interval(min, max);
    return Shrinkable<int>(value);
  });
}
