import { interval } from './generator/integer'
import { Random } from './Random'
import { Shrinkable } from './Shrinkable'
import { shrinkArrayLength } from './shrinker/array'
import { Stream } from './Stream'

/**
 * Defines the core interface for generating random values along with their shrinkable counterparts.
 * Shrinkable values are essential for property-based testing, allowing the system to find the smallest failing example.
 * @template T The type of value to generate.
 */
export interface Generator<T> {
    /**
     * Generates a random value wrapped in a Shrinkable container.
     * @param rand The random number generator instance.
     * @returns A Shrinkable containing the generated value and its potential smaller versions.
     */
    generate(rand: Random): Shrinkable<T>

    /**
     * Transforms the generated values using a provided function.
     * @template U The type of the transformed value.
     * @param transformer A function to apply to the generated value.
     * @returns A new Generator producing transformed values.
     */
    map<U>(transformer: (arg: T) => U): Generator<U>

    /**
     * Chains the generation process by using the output of this generator to create a new generator.
     * This is useful for creating dependent random values.
     * @template U The type produced by the subsequent generator.
     * @param genFactory A function that takes the generated value and returns a new Generator.
     * @returns A new Generator producing values from the chained generator.
     */
    flatMap<U>(genFactory: (arg: T) => Generator<U>): Generator<U>

    /**
     * Similar to flatMap, but preserves the original value, returning a tuple.
     * @template U The type produced by the subsequent generator.
     * @param genFactory A function that takes the generated value and returns a new Generator.
     * @returns A new Generator producing tuples of [originalValue, newValue].
     */
    chain<U>(genFactory: (arg: T) => Generator<U>): Generator<[T, U]>

    /**
     * Chains generation assuming the current generator produces tuples, appending the new value.
     * Requires the current generator to produce an array/tuple.
     * @template Ts The tuple type produced by the current generator.
     * @template U The type produced by the subsequent generator.
     * @param genFactory A function that takes the generated tuple and returns a new Generator.
     * @returns A new Generator producing tuples with the new value appended.
     */
    chainAsTuple<Ts extends unknown[], U>(genFactory: (arg: Ts) => Generator<U>): Generator<[...Ts, U]>

    /**
     * Repeatedly applies a generator factory to the last generated value a specified number of times.
     * The final value is returned.
     * @param genFactory A function that takes the last value and returns the next generator.
     * @param minSize The minimum number of aggregation steps.
     * @param maxSize The maximum number of aggregation steps.
     * @returns A new Generator producing the aggregated value.
     */
    aggregate(genFactory: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<T>

    /**
     * Similar to aggregate, but collects all intermediate values into an array.
     * @param genFactory A function that takes the last value and returns the next generator.
     * @param minSize The minimum number of accumulation steps.
     * @param maxSize The maximum number of accumulation steps.
     * @returns A new Generator producing an array of accumulated values.
     */
    accumulate(genFactory: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<Array<T>>

    /**
     * Filters the generated values based on a predicate.
     * It will keep generating values until one satisfies the predicate.
     * @param filterer A function that returns true if the value should be kept.
     * @returns A new Generator producing only values that satisfy the predicate.
     */
    filter(filterer: (value: T) => boolean): Generator<T>

    /**
     * Strips all shrink candidates from this generator.
     * Values are generated with the same distribution but carry no shrink tree.
     * Use for seeds, UUIDs, timestamps, or to suppress context shrinking in flatMap.
     * @returns A new Generator producing the same values but with empty shrink streams.
     */
    noShrink(): Generator<T>
}

/**
 * A concrete implementation of the Generator interface.
 * @template T The type of value to generate.
 */
export class Arbitrary<T> implements Generator<T> {
    /**
     * Creates an instance of Arbitrary.
     * @param genFunction The core function used to generate Shrinkable values.
     */
    constructor(readonly genFunction: GenFunction<T>) {}

    generate(rand: Random): Shrinkable<T> {
        return this.genFunction(rand)
    }

    map<U>(transformer: (arg: T) => U): Generator<U> {
        // Creates a new Arbitrary that applies the transformer to the generated Shrinkable's value.
        return new Arbitrary<U>((rand: Random) => this.generate(rand).map(transformer))
    }

    aggregate(genFactory: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<T> {
        // Uses an integer generator to determine the number of aggregation steps.
        return interval(minSize, maxSize).flatMap(
            size =>
                new Arbitrary<T>((rand: Random) => {
                    // Start with the initial value.
                    let shr = this.generate(rand)
                    // Apply the factory repeatedly.
                    for (let i = 1; i < size; i++) shr = genFactory(shr.value).generate(rand)
                    return shr
                })
        )
    }

    accumulate(genFactory: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<Array<T>> {
        return new Arbitrary<Array<T>>((rand: Random) => {
            const size = rand.interval(minSize, maxSize)
            if (size === 0) return new Shrinkable([]) // Handle empty accumulation.

            let shr = this.generate(rand)
            const shrArr = [shr] // Store all generated shrinkables.
            for (let i = 1; i < size; i++) {
                shr = genFactory(shr.value).generate(rand)
                shrArr.push(shr)
            }
            // Shrink the array primarily by length, then by shrinking the last element.
            // concat (not andThen) appends element shrinks at EVERY length node, not just the
            // minimum-length leaf. This makes element shrinks reachable from any array length.
            return shrinkArrayLength(shrArr, minSize)
                .concat(parent => {
                    const arr = parent.value
                    if (arr.length === 0) return new Stream()
                    const lastElemShr = arr[arr.length - 1]
                    const elemShrinks = lastElemShr.shrinks()
                    if (elemShrinks.isEmpty()) return new Stream()
                    // Create shrinks by replacing the last element with its own shrinks.
                    return elemShrinks.transform(elem => {
                        const copy = arr.concat()
                        copy[copy.length - 1] = elem
                        return new Shrinkable(copy)
                    })
                })
                .map(arr => arr.map(shr => shr.value)) // Extract values from Shrinkables.
        })
    }

    flatMap<U>(genFactory: (arg: T) => Generator<U>): Generator<U> {
        return new Arbitrary<U>((rand: Random) => {
            // Generate the initial value and map it to the *next* generator's Shrinkable.
            const intermediate: Shrinkable<Shrinkable<U>> = this
                .generate(rand)
                .map(value => genFactory(value).generate(rand))
            // Shrinking involves two steps:
            // 1. Shrink the intermediate Shrinkable (which shrinks the *outer* value T, T-axis).
            // 2. Shrink the inner Shrinkable (which shrinks the *inner* value U, U-axis).
            // concat (not andThen) appends U-axis shrinks at EVERY T-axis node, not just the
            // T-axis leaf. This makes U-axis shrinks reachable from the root value.
            return intermediate
                .concat(interShr =>
                    // This flatMap combines shrinks from the inner Shrinkable<U>.
                    interShr.value.flatMap<Shrinkable<U>>(second => new Shrinkable(new Shrinkable(second))).shrinks()
                )
                .map(shr => shr.value) // Extract the final U value.
        })
    }

    chain<U>(genFactory: (arg: T) => Generator<U>): Generator<[T, U]> {
        return new Arbitrary<[T, U]>((rand: Random) => {
            // Similar to flatMap, but keeps the original value T.
            const intermediate: Shrinkable<[T, Shrinkable<U>]> = this
                .generate(rand)
                .map(value => [value, genFactory(value).generate(rand)]) // Keep 'value' (type T).
            // Shrinking:
            // 1. Shrink the intermediate Shrinkable (shrinks T, T-axis).
            // 2. Shrink the inner Shrinkable (shrinks U, U-axis).
            // concat (not andThen) appends U-axis shrinks at EVERY T-axis node, not just the
            // T-axis leaf. This makes U-axis shrinks reachable from the root value.
            return intermediate
                .concat(interShr =>
                    // Combine shrinks from the inner Shrinkable<U>.
                    interShr.value[1]
                        .flatMap<[T, Shrinkable<U>]>(
                            second => new Shrinkable([interShr.value[0], new Shrinkable(second)]) // Reconstruct the pair.
                        )
                        .shrinks()
                )
                .map(pair => [pair[0], pair[1].value]) // Extract the final U value from the inner Shrinkable.
        })
    }

    chainAsTuple<Ts extends unknown[], U>(genFactory: (arg: Ts) => Generator<U>): Generator<[...Ts, U]> {
        return new Arbitrary<[...Ts, U]>((rand: Random) => {
            const intermediate: Shrinkable<[...Ts, Shrinkable<U>]> = this.generate(rand).map(value => {
                // Expects the current generator to produce an array/tuple.
                if (!Array.isArray(value)) throw new Error('method unsupported for the type')
                const tuple = (value as unknown) as Ts
                // Append the new Shrinkable<U> to the tuple.
                return [...tuple, genFactory(tuple).generate(rand)]
            })
            // Shrinking logic similar to chain, adapted for tuples.
            // concat (not andThen) appends U-axis shrinks at EVERY T-axis node, not just the leaf.
            return intermediate
                .concat(interShr => {
                    const head = interShr.value.slice(0, interShr.value.length - 1) as Ts
                    const tail = interShr.value[interShr.value.length - 1] as Shrinkable<U>
                    // Combine shrinks from the tail element (Shrinkable<U>).
                    return tail
                        .flatMap<[...Ts, Shrinkable<U>]>(second => new Shrinkable([...head, new Shrinkable(second)]))
                        .shrinks()
                })
                .map(pair => [
                    ...(pair.slice(0, pair.length - 1) as Ts),
                    // Extract the final U value from the last element.
                    (pair[pair.length - 1] as Shrinkable<U>).value,
                ])
        })
    }

    filter(filterer: (value: T) => boolean): Generator<T> {
        return new Arbitrary<T>((rand: Random) => {
            // Keep generating until a value satisfies the filter.
            // Note: This can potentially loop infinitely if the filter is too restrictive.
            while (true) {
                const shr = this.generate(rand)
                if (filterer(shr.value)) return shr.filter(filterer) // Apply filter to shrinks as well.
            }
        })
    }

    noShrink(): Generator<T> {
        return new Arbitrary<T>((rand: Random) => new Shrinkable<T>(this.generate(rand).value))
    }
}

/**
 * A Generator implementation specifically designed for container-like structures (e.g., arrays, strings),
 * incorporating default size constraints.
 * @template T The type of value the container holds or the container type itself.
 */
export class ArbiContainer<T> implements Generator<T> {
    /** Default minimum size for generated containers. */
    public static defaultMinSize: number = 0
    /** Default maximum size for generated containers. */
    public static defaultMaxSize: number = 100

    /**
     * Creates an instance of ArbiContainer.
     * @param genFunction The core function used to generate Shrinkable values.
     * @param minSize Minimum size constraint for the generated container.
     * @param maxSize Maximum size constraint for the generated container.
     */
    constructor(
        readonly genFunction: GenFunction<T>,
        public minSize: number = ArbiContainer.defaultMinSize,
        public maxSize: number = ArbiContainer.defaultMaxSize
    ) {}

    // Most methods delegate to the underlying genFunction but wrap the result
    // in a new ArbiContainer to preserve the size constraints.

    generate(rand: Random): Shrinkable<T> {
        // Potentially use minSize/maxSize within the genFunction if needed,
        // although the standard implementation doesn't directly enforce it here.
        // Size enforcement often happens within specific container generator functions (like array, string).
        return this.genFunction(rand)
    }

    map<U>(transformer: (arg: T) => U): Generator<U> {
        // Preserve size constraints when mapping.
        return new ArbiContainer<U>((rand: Random) => this.generate(rand).map(transformer), this.minSize, this.maxSize)
    }

    flatMap<U>(genFactory: (arg: T) => Generator<U>): Generator<U> {
        // Preserve size constraints when flatMapping.
        return new ArbiContainer<U>(
            (rand: Random) => {
                const intermediate: Shrinkable<Shrinkable<U>> = this
                    .generate(rand)
                    .map(value => genFactory(value).generate(rand))
                return intermediate
                    .concat(interShr =>
                        interShr.value
                            .flatMap<Shrinkable<U>>(second => new Shrinkable(new Shrinkable(second)))
                            .shrinks()
                    )
                    .map(pair => pair.value)
            },
            this.minSize,
            this.maxSize
        )
    }

    chain<U>(genFactory: (arg: T) => Generator<U>): Generator<[T, U]> {
        // Preserve size constraints when chaining.
        return new ArbiContainer<[T, U]>(
            (rand: Random) => {
                const intermediate: Shrinkable<[T, Shrinkable<U>]> = this
                    .generate(rand)
                    .map(value => [value, genFactory(value).generate(rand)])
                return intermediate
                    .concat(interShr =>
                        interShr.value[1]
                            .flatMap<[T, Shrinkable<U>]>(
                                second => new Shrinkable([interShr.value[0], new Shrinkable(second)])
                            )
                            .shrinks()
                    )
                    .map(pair => [pair[0], pair[1].value])
            },
            this.minSize,
            this.maxSize
        )
    }

    chainAsTuple<Ts extends unknown[], U>(genFactory: (arg: Ts) => Generator<U>): Generator<[...Ts, U]> {
        return new Arbitrary<[...Ts, U]>((rand: Random) => {
            const intermediate: Shrinkable<[...Ts, Shrinkable<U>]> = this.generate(rand).map(value => {
                if (!Array.isArray(value)) throw new Error('method unsupported for the type')
                const tuple = (value as unknown) as Ts
                return [...tuple, genFactory(tuple).generate(rand)]
            })
            return intermediate
                .concat(interShr => {
                    const head = interShr.value.slice(0, interShr.value.length - 1) as Ts
                    const tail = interShr.value[interShr.value.length - 1] as Shrinkable<U>
                    return tail
                        .flatMap<[...Ts, Shrinkable<U>]>(second => new Shrinkable([...head, new Shrinkable(second)]))
                        .shrinks()
                })
                .map(pair => [
                    ...(pair.slice(0, pair.length - 1) as Ts),
                    (pair[pair.length - 1] as Shrinkable<U>).value,
                ])
        })
    }

    aggregate(genFactory: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<T> {
        // Preserve size constraints for the resulting generator.
        return interval(minSize, maxSize).flatMap(
            size =>
                new ArbiContainer<T>(
                    (rand: Random) => {
                        // Standard aggregate logic.
                        let shr = this.generate(rand)
                        for (let i = 1; i < size; i++) shr = genFactory(shr.value).generate(rand)
                        return shr
                    },
                    minSize, // Use the aggregate's size for the new container constraints.
                    maxSize
                )
        )
    }

    accumulate(genFactory: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<Array<T>> {
        // Preserve size constraints for the resulting generator.
        return new ArbiContainer<Array<T>>(
            (rand: Random) => {
                // Standard accumulate logic with shrinking.
                const size = rand.interval(minSize, maxSize)
                if (size === 0) return new Shrinkable([])

                let shr = this.generate(rand)
                const shrArr = [shr]
                for (let i = 1; i < size; i++) {
                    shr = genFactory(shr.value).generate(rand)
                    shrArr.push(shr)
                }
                return shrinkArrayLength(shrArr, minSize)
                    .concat(parent => {
                        const arr = parent.value
                        if (arr.length === 0) return new Stream()
                        const lastElemShr = arr[arr.length - 1]
                        const elemShrinks = lastElemShr.shrinks()
                        if (elemShrinks.isEmpty()) return new Stream()
                        return elemShrinks.transform(elem => {
                            const copy = arr.concat()
                            copy[copy.length - 1] = elem
                            return new Shrinkable(copy)
                        })
                    })
                    .map(arr => arr.map(shr => shr.value))
            },
            minSize, // Use the accumulate's size for the new container constraints.
            maxSize
        )
    }

    filter(filterer: (value: T) => boolean): Generator<T> {
        // Preserve size constraints when filtering.
        return new ArbiContainer<T>(
            (rand: Random) => {
                // Standard filter logic.
                // Potential infinite loop risk remains.
                while (true) {
                    const shr = this.generate(rand)
                    if (filterer(shr.value)) return shr.filter(filterer)
                }
            },
            this.minSize,
            this.maxSize
        )
    }

    noShrink(): Generator<T> {
        return new Arbitrary<T>((rand: Random) => new Shrinkable<T>(this.generate(rand).value))
    }

    /**
     * Updates the minimum and maximum size constraints for this container generator instance.
     * @param min The new minimum size.
     * @param max The new maximum size.
     */
    setSize(min: number, max: number) {
        this.minSize = min
        this.maxSize = max
    }
}

/**
 * Type alias for the core function within a Generator that produces a Shrinkable value.
 * @template ARG The type of value to generate.
 * @param rand The random number generator instance.
 * @returns A Shrinkable value.
 */
export type GenFunction<ARG> = (rand: Random) => Shrinkable<ARG>
