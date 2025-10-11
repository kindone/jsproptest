import '../generator.dart';
import '../generator/tuple.dart';

/// Creates a generator for instances of a class `Type`.
///
/// It takes the class `Type` and a sequence of generators `gens` corresponding
/// to the constructor arguments of `Type`. It generates a tuple of values using
/// the provided generators and then uses these values to instantiate `Type`.
///
/// [Type] The constructor function of the class to instantiate.
/// [gens] A sequence of generators for the constructor arguments.
/// Returns a Generator that produces instances of `Type`.
///
/// Example:
/// ```dart
/// class User {
///   User(this.id, this.name);
///   final int id;
///   final String name;
/// }
///
/// final userGenerator = construct<User>(
///   (id, name) => User(id, name),
///   [integerGen(1, 100), stringGen(5, 10)]
/// );
/// // userGenerator can now produce instances of User with id between 1 and 100
/// // and name with length between 5 and 10.
/// ```
Generator<T> construct<T>(
    T Function(List<dynamic>) constructor, List<Generator<dynamic>> gens) {
  final tupleGenerator = tupleGen(gens);
  return Arbitrary<T>((rand) {
    final tuple = tupleGenerator.generate(rand);
    return tuple.map((values) => constructor(values));
  });
}
