import 'stream.dart';
import 'try.dart';

/// Represents a value along with its potential shrinks.
/// In property-based testing, when a test fails, the Shrinkable is used
/// to find a simpler counterexample by recursively exploring the shrinks.
///
/// [T] The type of the value being shrunk.
class Shrinkable<T> {
  final T value;
  final LazyStream<Shrinkable<T>> Function() shrinksGen;

  Shrinkable(this.value, [LazyStream<Shrinkable<T>> Function()? shrinksGen])
      : shrinksGen = shrinksGen ?? (() => LazyStream<Shrinkable<T>>(null));

  @override
  String toString() {
    return 'Shrinkable($value)';
  }

  /// Returns the stream of shrink candidates for this value.
  LazyStream<Shrinkable<T>> shrinks() {
    return shrinksGen();
  }

  /// Creates a new Shrinkable with the same value but different shrink function.
  Shrinkable<T> withShrinks(LazyStream<Shrinkable<T>> Function() shrinksGen) {
    return Shrinkable<T>(value, shrinksGen);
  }

  /// Concatenates the given stream to the horizontal dead-ends of shrinkable tree.
  /// Does not alter this shrinkable.
  /// Adds additional candidates to the tree with fixed stream.
  ///
  /// [then] the stream to concatenate
  /// Returns a new shrinkable with the concatenation of each stream in shrinkable tree and the given stream
  Shrinkable<T> concatStatic(LazyStream<Shrinkable<T>> Function() then) {
    return withShrinks(() =>
        shrinks().transform((shr) => shr.concatStatic(then)).concat(then()));
  }

  /// Concatenates the stream generated with given stream generator to the horizontal dead-ends of shrinkable tree.
  /// Does not alter this shrinkable.
  /// Adds additional candidates to the tree, represented as stream generated based on the parent shrinkable of the horizontal dead-end.
  ///
  /// [then] the stream generator to generate stream for concatenation. the function takes parent shrinkable as input.
  /// Returns a new shrinkable with the concatenation of each stream in shrinkable tree and the given stream
  Shrinkable<T> concat(LazyStream<Shrinkable<T>> Function(Shrinkable<T>) then) {
    return withShrinks(() =>
        shrinks().transform((shr) => shr.concat(then)).concat(then(this)));
  }

  /// Inserts the given stream to the vertical dead-ends of shrinkable tree.
  /// Does not alter this shrinkable.
  ///
  /// [then] the stream to insert at the vertical dead-ends
  /// Returns a new shrinkable with the insertion of the given stream at the vertical dead-ends
  Shrinkable<T> andThenStatic(LazyStream<Shrinkable<T>> Function() then) {
    if (shrinks().isEmpty()) {
      return withShrinks(then);
    } else {
      return withShrinks(
          () => shrinks().transform((shr) => shr.andThenStatic(then)));
    }
  }

  /// Inserts the stream generated with given stream generator to the vertical dead-ends of shrinkable tree.
  /// Does not alter this shrinkable.
  /// Adds additional candidates to the tree, represented as stream generated based on the parent shrinkable of the vertical dead-end.
  /// This effectively appends new shrinking strategy to the shrinkable
  ///
  /// [then] the stream generator to generate stream for insertion. the function takes parent shrinkable as input.
  /// Returns a new shrinkable with the insertion of the given stream at the vertical dead-ends
  Shrinkable<T> andThen(
      LazyStream<Shrinkable<T>> Function(Shrinkable<T>) then) {
    if (shrinks().isEmpty()) {
      // filter: remove duplicates
      return withShrinks(() => then(this).filter((shr) => shr.value != value));
    } else {
      return withShrinks(() => shrinks().transform((shr) => shr.andThen(then)));
    }
  }

  /// Transforms the value and its shrinks using the provided function.
  Shrinkable<U> map<U>(U Function(T) transformer) {
    return Shrinkable<U>(transformer(value),
        () => shrinksGen().transform((shr) => shr.map<U>(transformer)));
  }

  /// Transforms the value using a function that returns a Shrinkable.
  Shrinkable<U> flatMap<U>(Shrinkable<U> Function(T) transformer) {
    return transformer(value).withShrinks(
        () => shrinks().transform((shr) => shr.flatMap(transformer)));
  }

  /// Filters the shrinkable based on a predicate.
  /// Throws an exception if the current value doesn't satisfy the criteria.
  Shrinkable<T> filter(bool Function(T) criteria) {
    if (!criteria(value)) throw Exception('cannot apply criteria');
    return withShrinks(() => shrinksGen()
        .filter((shr) => criteria(shr.value))
        .transform((shr) => shr.filter(criteria)));
  }

  /// Limits the number of shrinks to take.
  Shrinkable<T> take(int n) {
    return withShrinks(() => shrinksGen().take(n));
  }

  /// Returns the nth child of this shrinkable.
  ///
  /// Throws an exception if n is out of bound.
  /// [n] the index of the child
  /// Returns the nth child
  Shrinkable<T> getNthChild(int n) {
    if (n < 0)
      throw Exception(
          'Shrinkable getNthChild failed: index out of bound: $n < 0');

    final shrinksStream = shrinks();
    int i = 0;
    for (final iter = shrinksStream.iterator(); iter.hasNext(); i++) {
      if (i == n)
        return iter.next();
      else
        iter.next();
    }
    throw Exception(
        'Shrinkable getNthChild failed: index out of bound: $n >= $i');
  }

  /// Returns the child shrinkable at the given steps, traversing the tree of children.
  ///
  /// Throws an exception if any step is out of bound.
  /// [steps] the indices of the children
  /// Returns the child shrinkable at the given steps
  Shrinkable<T> retrieve(List<int> steps) {
    Shrinkable<T> shr = this;
    for (int i = 0; i < steps.length; i++) {
      shr = Try.of(() => shr.getNthChild(steps[i])).getOrThrow((e) => Exception(
          'Shrinkable retrieval failed at step $i: $e for steps: ${steps.join(',')}'));
    }
    return shr;
  }
}
