import 'generator.dart';
import 'generator/integer.dart' as int_gen;
import 'generator/boolean.dart' as bool_gen;
import 'generator/string.dart' as str_gen;
import 'generator/floating.dart' as float_gen;
import 'generator/array.dart' as array_gen;
import 'generator/set.dart' as set_gen;
import 'generator/tuple.dart' as tuple_gen;
import 'generator/dictionary.dart' as dict_gen;
import 'combinator/just.dart' as just_gen;
import 'combinator/lazy.dart' as lazy_gen;
import 'combinator/elementof.dart' as element_gen;
import 'combinator/elementof.dart' show WeightedValue;
import 'combinator/oneof.dart' as oneof_gen;
import 'combinator/oneof.dart' show Weighted;
import 'combinator/construct.dart' as construct_gen;
import 'combinator/chaintuple.dart' as chain_gen;
import 'stateful/action_factory.dart' as action_gen;
import 'stateful/action_factory.dart'
    show SimpleActionGenFactory, ActionGenFactory;
import 'stateful/stateful_base.dart';

/// The Gen namespace provides a clean API for all generators and combinators
///
/// This class serves as a namespace similar to the JavaScript version's Gen object,
/// organizing all generator functions under a single, clear namespace.
class Gen {
  // Private constructor to prevent instantiation
  Gen._();

  // ============================================================================
  // PRIMITIVE GENERATORS
  // ============================================================================

  /// Generates boolean values (true/false)
  static Generator<bool> boolean([double trueProb = 0.5]) =>
      bool_gen.booleanGen(trueProb);

  /// Generates integers in the range [min, max] (inclusive)
  static Generator<int> interval([int? min, int? max]) =>
      int_gen.interval(min, max);

  /// Generates integers in the range [min, max) (exclusive of max)
  static Generator<int> inRange(int min, int max) => int_gen.inRange(min, max);

  /// Generates integers (alias for integer)
  static Generator<int> integers() => int_gen.integer();

  /// Generates floating-point numbers (including special values like NaN, Infinity)
  static Generator<double> float() => float_gen.floatingGen();

  // ============================================================================
  // CHARACTER GENERATORS
  // ============================================================================

  /// Generates single ASCII characters (code 0-127)
  static Generator<int> ascii() => str_gen.asciiCharGen;

  /// Generates single Unicode characters
  static Generator<int> unicode() => str_gen.unicodeCharGen;

  /// Generates single printable ASCII characters
  static Generator<int> printableAscii() => str_gen.printableAsciiCharGen;

  // ============================================================================
  // STRING GENERATORS
  // ============================================================================

  /// Generates strings (defaults to ASCII)
  static Generator<String> string({int minLength = 0, int maxLength = 10}) =>
      str_gen.asciiStringGen(minLength, maxLength);

  /// Generates strings containing only ASCII characters (0-127)
  static Generator<String> asciiString(
          {int minLength = 0, int maxLength = 10}) =>
      str_gen.asciiStringGen(minLength, maxLength);

  /// Generates strings containing Unicode characters
  static Generator<String> unicodeString(
          {int minLength = 0, int maxLength = 10}) =>
      str_gen.unicodeStringGen(minLength, maxLength);

  /// Generates strings containing only printable ASCII characters
  static Generator<String> printableAsciiString(
          {int minLength = 0, int maxLength = 10}) =>
      str_gen.printableAsciiStringGen(minLength, maxLength);

  // ============================================================================
  // CONTAINER GENERATORS
  // ============================================================================

  /// Generates arrays with elements from the provided generator
  static Generator<List<T>> array<T>(Generator<T> elementGen,
          {int minLength = 0, int maxLength = 10}) =>
      array_gen.arrayGen(elementGen, minLength, maxLength);

  /// Generates arrays with unique elements from the provided generator
  static Generator<List<T>> uniqueArray<T>(Generator<T> elementGen,
          {int minLength = 0, int maxLength = 10}) =>
      array_gen.uniqueArrayGen(elementGen, minLength, maxLength);

  /// Generates Set objects with elements from the provided generator
  static Generator<Set<T>> set<T>(Generator<T> elementGen,
          {int minSize = 0, int maxSize = 10}) =>
      set_gen.setGen(elementGen, minSize, maxSize);

  /// Generates fixed-size arrays (tuples) from the provided generators
  static Generator<List<dynamic>> tuple(List<Generator<dynamic>> elementGens) =>
      tuple_gen.tupleGen(elementGens);

  /// Generates Map objects with keys and values from the provided generators
  static Generator<Map<String, V>> dictionary<K, V>(
          Generator<String> keyGen, Generator<V> valueGen,
          {int minSize = 0, int maxSize = 10}) =>
      dict_gen.dictionaryGen(keyGen, valueGen, minSize, maxSize);

  /// Alias for dictionary
  static Generator<Map<String, V>> dict<K, V>(
          Generator<String> keyGen, Generator<V> valueGen,
          {int minSize = 0, int maxSize = 10}) =>
      dict_gen.dictionaryGen(keyGen, valueGen, minSize, maxSize);

  // ============================================================================
  // COMBINATORS
  // ============================================================================

  /// Always generates the provided value
  static Generator<T> just<T>(T value) => just_gen.just(value);

  /// Defers execution of a function to produce a value until needed
  static Generator<T> lazy<T>(T Function() valueFactory) =>
      lazy_gen.lazy(valueFactory);

  /// Randomly picks one generator from the provided list
  static Generator<T> oneOf<T>(List<Generator<T>> generators) =>
      oneof_gen.oneOf(generators);

  /// Randomly picks one value from the provided list
  static Generator<T> elementOf<T>(List<T> values) =>
      element_gen.elementOf(values);

  /// Wraps a generator with a weight for oneOf
  static Weighted<T> weightedGen<T>(Generator<T> generator, double weight) =>
      oneof_gen.weightedGen(generator, weight);

  /// Wraps a value with a weight for elementOf
  static WeightedValue<T> weightedValue<T>(T value, double weight) =>
      element_gen.weightedValue(value, weight);

  /// Constructs class instances using the provided constructor and argument generators
  static Generator<T> construct<T>(T Function(List<dynamic>) constructor,
          List<Generator<dynamic>> argGens) =>
      construct_gen.construct(constructor, argGens);

  /// Appends a new value to a tuple generated by the first generator
  static Generator<List<dynamic>> chainTuple(Generator<List<dynamic>> tupleGen,
          Generator<dynamic> Function(List<dynamic>) nextGen) =>
      chain_gen.chainTuple(tupleGen, nextGen);

  // ============================================================================
  // STATEFUL TESTING
  // ============================================================================

  /// Combines multiple simple action generators
  static SimpleActionGenFactory<T> simpleActionOf<T>(
          List<Generator<SimpleAction<T>>> actionGens) =>
      action_gen.simpleActionGenOf(actionGens);

  /// Combines multiple action generators
  static ActionGenFactory<T, M> actionOf<T, M>(
          List<Generator<Action<T, M>>> actionGens) =>
      action_gen.actionGenOf(actionGens);
}
