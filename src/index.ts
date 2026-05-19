import { construct as Construct } from './combinator/construct'
import { elementOf as ElementOf, weightedValue as WeightedValue } from './combinator/elementof'
import { oneOf as OneOf, weightedGen as WeightedGen } from './combinator/oneof'
import { lazy as Lazy } from './combinator/lazy'
import { just as Just } from './combinator/just'
import { chainTuple as ChainTuple } from './combinator/chaintuple'
import { noShrink as NoShrink } from './combinator/noshrink'

import { BooleanGen } from './generator/boolean'
import { inRange as InRange, integers as Integers, interval as Interval } from './generator/integer'
import { FloatingGen } from './generator/floating'
import {
    ASCIICharGen,
    PrintableASCIICharGen,
    UnicodeCharGen,
    ASCIIStringGen,
    PrintableASCIIStringGen,
    UnicodeStringGen,
    StringGen,
} from './generator/string'
import { ArrayGen, UniqueArrayGen } from './generator/array'
import { SetGen } from './generator/set'
import { TupleGen } from './generator/tuple'
import { DictionaryGen } from './generator/dictionary'

import { simpleActionGenOf as SimpleActionGenOf, actionGenOf as ActionGenOf } from './stateful/actionof'

export { Generator, Arbitrary, GenFunction } from './Generator'
export type { FloatGenConfig } from './generator/floating'
export { Property, forAll } from './Property'
export type { PropertyWriteStream, ReproductionStats } from './Property'
export { Random } from './Random'
export { Shrinkable } from './Shrinkable'
export { Stream } from './Stream'

export { SimpleAction, Action, SimpleActionGen, ActionGen } from './stateful/statefulbase'
export { SimpleActionGenOrFactory, ActionGenOrFactory } from './stateful/actionof'
export { simpleStatefulProperty, statefulProperty } from './stateful/statefultest'
export { precond } from './util/assert'

/**
 * Built-in generators and combinators (`Gen.boolean`, `Gen.array`, …).
 * Each property aliases the implementation named in the first line; JSDoc matches that API (parameters and returns).
 */
export const Gen = {
    /**
     * Same API as {@link BooleanGen}.
     *
     * Creates a generator for boolean values.
     *
     * @param trueProb The probability of generating `true`. Must be between 0 and 1. Defaults to 0.5.
     * @returns A generator that produces shrinkable boolean values.
     */
    boolean: BooleanGen,

    /**
     * Same API as {@link InRange}.
     *
     * Generates integers within the specified range [fromInclusive, toExclusive).
     *
     * @param fromInclusive The minimum value of the range (inclusive).
     * @param toExclusive The maximum value of the range (exclusive).
     * @returns A generator for integers within the specified range.
     * @throws If fromInclusive is greater than or equal to toExclusive.
     */
    inRange: InRange,

    /**
     * Same API as {@link Integers}.
     *
     * Generates a sequence of `count` integers starting from `start`.
     * Equivalent to `inRange(start, start + count)`.
     *
     * @deprecated Use `Gen.interval` or `Gen.inRange` instead.
     * @param start The starting integer (inclusive).
     * @param count The number of integers to generate.
     * @returns A generator for the sequence of integers.
     */
    integers: Integers,

    /**
     * Same API as {@link Interval}.
     *
     * Generates integers within the specified inclusive range [min, max].
     *
     * @param min The minimum value of the range (inclusive). Defaults to `Number.MIN_SAFE_INTEGER`.
     * @param max The maximum value of the range (inclusive). Defaults to `Number.MAX_SAFE_INTEGER`.
     * @returns A generator for integers within the specified range.
     * @throws If min is greater than max.
     */
    interval: Interval,

    /**
     * Same API as {@link FloatingGen}.
     *
     * Generates floating-point numbers. By default generates only finite IEEE-754 doubles,
     * shrinkable towards 0. Pass a {@link FloatGenConfig} to enable probabilistic
     * generation of `NaN`, `+Infinity`, and `-Infinity`.
     *
     * @param config Optional probability configuration for special float values.
     * @returns A Generator for floating-point numbers.
     *
     * @example
     * ```ts
     * Gen.float()                                                              // finite only
     * Gen.float({ nanProb: 0.05 })                                             // 5 % NaN
     * Gen.float({ nanProb: 0.05, posInfProb: 0.02, negInfProb: 0.02 })
     * ```
     */
    float: FloatingGen,

    /**
     * Same value as {@link ASCIICharGen}.
     *
     * Generates integers representing ASCII character codes (1–127).
     * @returns A `Generator<number>` of code points.
     */
    ascii: ASCIICharGen,

    /**
     * Same value as {@link UnicodeCharGen}.
     *
     * Generates integers representing Unicode character codes.
     * Maps the interval to avoid generating surrogate pair code points directly (U+D800 to U+DFFF).
     * @returns A `Generator<number>` of code points.
     */
    unicode: UnicodeCharGen,

    /**
     * Same value as {@link PrintableASCIICharGen}.
     *
     * Generates integers representing printable ASCII character codes (32–127).
     * @returns A `Generator<number>` of code points.
     */
    printableAscii: PrintableASCIICharGen,

    /**
     * Same API as {@link StringGen}.
     *
     * Creates a generator for strings of a specified length range, using a given character code generator.
     *
     * @param minSize - The minimum length of the generated string (inclusive).
     * @param maxSize - The maximum length of the generated string (inclusive).
     * @param charGen - The generator used to produce character codes for the string. Defaults to `ASCIICharGen`.
     * @returns A generator that produces strings with shrinkable characters.
     *
     * @example
     * ```ts
     * Gen.string(0, 8) // default ASCII char codes
     * Gen.string(0, 4, Gen.unicode) // Unicode code units
     * ```
     */
    string: StringGen,

    /**
     * Same API as {@link ASCIIStringGen}.
     *
     * Creates a generator for ASCII strings of a specified length range.
     * Equivalent to `StringGen(minSize, maxSize, ASCIICharGen)`.
     *
     * @param minSize - The minimum length of the generated string (inclusive).
     * @param maxSize - The maximum length of the generated string (inclusive).
     * @returns A generator that produces ASCII strings.
     *
     * @example
     * ```ts
     * Gen.asciiString(1, 12)
     * ```
     */
    asciiString: ASCIIStringGen,

    /**
     * Same API as {@link UnicodeStringGen}.
     *
     * Creates a generator for Unicode strings of a specified length range.
     * Uses `UnicodeCharGen` which avoids generating surrogate pair code points directly.
     * Equivalent to `StringGen(minSize, maxSize, UnicodeCharGen)`.
     *
     * @param minSize - The minimum length of the generated string (inclusive).
     * @param maxSize - The maximum length of the generated string (inclusive).
     * @returns A generator that produces Unicode strings.
     *
     * @example
     * ```ts
     * Gen.unicodeString(0, 20)
     * ```
     */
    unicodeString: UnicodeStringGen,

    /**
     * Same API as {@link PrintableASCIIStringGen}.
     *
     * Creates a generator for printable ASCII strings of a specified length range.
     * Equivalent to `StringGen(minSize, maxSize, PrintableASCIICharGen)`.
     *
     * @param minSize - The minimum length of the generated string (inclusive).
     * @param maxSize - The maximum length of the generated string (inclusive).
     * @returns A generator that produces printable ASCII strings.
     *
     * @example
     * ```ts
     * Gen.printableAsciiString(3, 40)
     * ```
     */
    printableAsciiString: PrintableASCIIStringGen,

    /**
     * Same API as {@link ArrayGen}.
     *
     * Generates an array of elements using the provided element generator.
     * The generated array adheres to the specified minimum and maximum size constraints.
     * It utilizes `shrinkableArray` to enable shrinking towards smaller arrays and simpler element values
     * during property-based testing failures.
     *
     * @template T The type of elements in the array.
     * @param elemGen The generator for individual elements.
     * @param minSize The minimum number of elements in the generated array.
     * @param maxSize The maximum number of elements in the generated array.
     * @returns A generator producing arrays of type T.
     *
     * @example
     * ```ts
     * Gen.array(Gen.interval(-5, 5), 0, 10)
     * ```
     */
    array: ArrayGen,

    /**
     * Same API as {@link UniqueArrayGen}.
     *
     * Generates an array containing unique elements, sorted in ascending order.
     * It achieves uniqueness by first generating a Set using `SetGen` and then converting the Set into an array.
     * Sorting ensures a canonical representation for the generated unique arrays.
     *
     * @template T The type of elements in the array.
     * @param elemGen The generator for individual elements.
     * @param minSize The minimum number of unique elements in the generated array.
     * @param maxSize The maximum number of unique elements in the generated array.
     * @returns A generator producing sorted arrays of unique elements of type T.
     *
     * @example
     * ```ts
     * Gen.uniqueArray(Gen.interval(0, 100), 1, 8)
     * ```
     */
    uniqueArray: UniqueArrayGen,

    /**
     * Same API as {@link SetGen}.
     *
     * Creates a Generator for producing `Set<T>` instances.
     *
     * @param elemGen - The generator for the elements to be included in the set.
     * @param minSize - The minimum number of elements the generated set should contain.
     * @param maxSize - The maximum number of elements the generated set should contain.
     * @returns A Generator that produces `Set<T>` instances with sizes between minSize and maxSize (inclusive).
     *
     * @example
     * ```ts
     * Gen.set(Gen.asciiString(1, 3), 0, 5)
     * ```
     */
    set: SetGen,

    /**
     * Same API as {@link TupleGen}.
     *
     * Creates a generator that produces tuples by combining the results of the provided element generators.
     * The resulting tuple's type is derived from the types generated by the input generators.
     *
     * @param elemGens - A rest parameter array of `Generator` instances.
     * @returns A `Generator` that produces tuples where each element corresponds to the value generated by the respective generator in `elemGens`.
     *
     * @example
     * ```ts
     * Gen.tuple(Gen.boolean(), Gen.interval(0, 9), Gen.asciiString(0, 4))
     * ```
     */
    tuple: TupleGen,

    /**
     * Same API as {@link DictionaryGen}.
     *
     * Generates a dictionary (object) with keys of type string and values of type T.
     *
     * @template T The type of elements in the dictionary values.
     * @param keyGen The generator for the dictionary keys (must generate strings).
     * @param elemGen The generator for the dictionary values.
     * @param minSize The minimum number of key-value pairs in the dictionary.
     * @param maxSize The maximum number of key-value pairs in the dictionary.
     * @returns A generator for dictionaries.
     *
     * @example
     * ```ts
     * Gen.dict(Gen.asciiString(1, 4), Gen.interval(0, 99), 0, 6)
     * ```
     */
    dict: DictionaryGen,

    /** Same API as {@link DictionaryGen}. Alias of `dict`. */
    dictionary: DictionaryGen,

    /**
     * Same API as {@link SimpleActionGenOf}.
     *
     * Creates a SimpleActionGenFactory combining multiple weighted SimpleActionGen or SimpleActionGenFactory instances.
     *
     * @template ObjectType The type of the object.
     * @param simpleActionGenFactories Array of SimpleActionGen, SimpleActionGenFactory, or weighted versions.
     * @returns A SimpleActionGenFactory selecting based on weights.
     *
     * @example
     * ```ts
     * const choose = Gen.simpleActionGenOf(
     *     Gen.just(new SimpleAction((xs: number[]) => xs.push(1), 'push')),
     *     Gen.weightedValue((xs: number[]) => Gen.just(new SimpleAction(() => xs.pop(), 'pop')), 0.3)
     * )
     * ```
     */
    simpleActionOf: SimpleActionGenOf,

    /**
     * Same API as {@link ActionGenOf}.
     *
     * Creates an ActionGenFactory combining multiple weighted ActionGen or ActionGenFactory instances.
     *
     * @template ObjectType The type of the object.
     * @template ModelType The type of the model.
     * @param actionGenFactories Array of ActionGen, ActionGenFactory, or weighted versions.
     * @returns An ActionGenFactory selecting based on weights.
     *
     * @example
     * ```ts
     * const choose = Gen.actionOf(
     *     Gen.just(new Action((_o: object, _m: object) => {}, 'a')),
     *     Gen.just(new Action((_o: object, _m: object) => {}, 'b'))
     * )
     * ```
     */
    actionOf: ActionGenOf,

    /**
     * Same API as {@link Construct}.
     *
     * Creates a generator for instances of a class `Type`.
     *
     * It takes the class `Type` and a sequence of generators `gens` corresponding
     * to the constructor arguments of `Type`. It generates a tuple of values using
     * the provided generators and then uses these values to instantiate `Type`.
     *
     * @template T The type of the class instances to generate.
     * @template Gens An array of Generator types, corresponding to the constructor argument types.
     * @param Type The constructor function of the class to instantiate.
     * @param gens A sequence of generators for the constructor arguments.
     * @returns A Generator that produces instances of `Type`.
     *
     * @example
     * ```ts
     * class User {
     *     constructor(public id: number, public name: string) {}
     * }
     *
     * const userGen = Gen.construct(User, Gen.interval(1, 100), Gen.asciiString(1, 20))
     * ```
     */
    construct: Construct,

    /**
     * Same API as {@link ElementOf}.
     *
     * Creates a generator that produces values randomly selected from the provided array,
     * respecting the weights if provided. Uses normalized weights to ensure fair selection.
     *
     * @param values An array containing either plain values of type T or `WeightedValue<T>` objects.
     *               Weights should be between 0 and 1 (exclusive). If weights are provided, they don't need
     *               to sum to 1 initially; they will be normalized. Unweighted values will share
     *               the remaining probability mass equally.
     * @returns A `Generator<T>` that produces values based on the weighted distribution.
     *
     * @example
     * ```ts
     * Gen.elementOf(1, 2, 3)
     * Gen.elementOf(Gen.weightedValue('x', 0.8), 'y')
     * ```
     */
    elementOf: ElementOf,

    /**
     * Same API as {@link WeightedValue} (the `weightedValue` helper from `combinator/elementof`).
     *
     * Wraps a value with a weight for `elementOf` / `normalizeWeightedValues`.
     *
     * @param value The value to associate with a weight.
     * @param weight Relative weight; normalized with other weighted entries when building a distribution.
     * @returns A `WeightedValue` class instance (same as calling the helper at module scope).
     *
     * @example
     * ```ts
     * Gen.elementOf(Gen.weightedValue('a', 0.7), 'b', 'c')
     * ```
     */
    weightedValue: WeightedValue,

    /**
     * Same API as {@link OneOf}.
     *
     * Creates a generator that randomly selects one of the provided generators
     * based on their assigned weights. If some generators are not explicitly
     * weighted (using `weightedGen`), the remaining probability mass (1.0 - sum of weights)
     * is distributed equally among them.
     *
     * @param generators A list of generators, optionally wrapped with `weightedGen`.
     * @returns A `Generator<T>` that samples one of the inputs according to weights.
     *
     * @example
     * ```ts
     * Gen.oneOf(Gen.just('a'), Gen.just('b'))
     * Gen.oneOf(Gen.weightedGen(Gen.float(), 0.2), Gen.interval(0, 10))
     * ```
     */
    oneOf: OneOf,

    /**
     * Same API as {@link WeightedGen}.
     *
     * Wraps a generator with a weight for `oneOf`.
     *
     * @param gen The generator to weight.
     * @param weight Relative weight; normalized with other weighted entries when building a distribution.
     * @returns A weighted generator wrapper accepted by {@link OneOf}.
     *
     * @example
     * ```ts
     * Gen.oneOf(Gen.weightedGen(Gen.interval(0, 5), 0.5), Gen.just(100))
     * ```
     */
    weightedGen: WeightedGen,

    /**
     * Same API as {@link Lazy}.
     *
     * Creates a generator that delays the evaluation of the provided function until the generator is sampled.
     * This is particularly useful for defining recursive generators or generators that depend on expensive computations.
     *
     * @param func A function that returns the value to be generated.
     * @returns A Generator that produces the value returned by `func` upon generation.
     *
     * @example
     * ```ts
     * const g = Gen.lazy(() => JSON.parse('{"n":1}'))
     * ```
     */
    lazy: Lazy,

    /**
     * Same API as {@link Just}.
     *
     * Creates a generator that always produces the same given value.
     *
     * @param value The constant value to be generated.
     * @returns A generator that yields the provided value.
     *
     * @example
     * ```ts
     * Gen.just({ k: 1 })
     * ```
     */
    just: Just,

    /**
     * Same API as {@link ChainTuple}.
     *
     * Chains the generation of a tuple with the generation of a subsequent value
     * that depends on the tuple's contents.
     *
     * This allows creating generators where the parameters of one generator depend
     * on the output of a previous one, specifically within the context of building up a tuple.
     *
     * @param tupleGen The generator for the initial tuple elements `Ts`.
     * @param genFactory A function that takes the generated tuple `Ts` and returns a generator for the final element `U`.
     * @returns A generator for the combined tuple `[...Ts, U]`.
     *
     * @example
     * ```ts
     * Gen.chainTuple(Gen.tuple(Gen.interval(0, 3), Gen.interval(0, 3)), ([x, y]) => Gen.just(x + y))
     * ```
     */
    chainTuple: ChainTuple,

    /**
     * Same API as {@link NoShrink}.
     *
     * Wraps a generator to produce the same values but with an empty shrink stream.
     * Use when shrinking is meaningless or undesirable — e.g. seeds, UUIDs, timestamps,
     * or when you want to suppress context shrinking in a `flatMap` chain.
     *
     * @template T The type produced by the base generator.
     * @param gen The base generator.
     * @returns A Generator<T> that produces the same distribution of values but no shrink candidates.
     *
     * @example
     * ```ts
     * // Seed value that should not be shrunk
     * const seedGen = Gen.noShrink(Gen.interval(0, 1000))
     *
     * // Suppress context (T) shrinking in a flatMap:
     * // Only the inner value (U) will shrink — T is locked to the generated value.
     * const gen = Gen.noShrink(Gen.interval(0, 10)).flatMap(n => Gen.array(Gen.interval(0, n), 1, 5))
     * ```
     */
    noShrink: NoShrink,
}
