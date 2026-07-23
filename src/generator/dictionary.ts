import { ArbiContainer, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'
import { Dictionary, shrinkableDictionary } from '../shrinker/dictionary'

const DEFAULT_MIN_SIZE = 0
const DEFAULT_MAX_SIZE = 20

/**
 * Configuration for {@link DictionaryGen}.
 *
 * @example
 * ```ts
 * Gen.dict({ keyGen: Gen.asciiString(1, 4), elemGen: Gen.interval(0, 99) })
 * Gen.dict({ keyGen: Gen.asciiString(1, 4), elemGen: Gen.interval(0, 99), minSize: 1, maxSize: 6 })
 * ```
 */
export interface DictGenConfig<T> {
    /** Generator for dictionary keys (must produce strings). Required. */
    keyGen: Generator<string>
    /** Generator for dictionary values. Required. */
    elemGen: Generator<T>
    /** Minimum number of key-value pairs. Default: 0. */
    minSize?: number
    /** Maximum number of key-value pairs. Default: 20. */
    maxSize?: number
}

/**
 * Generates a dictionary (object) with keys of type string and values of type T.
 * Supports both a positional form and a config-object form.
 *
 * @example
 * ```ts
 * // positional (existing)
 * Gen.dict(Gen.asciiString(1, 4), Gen.interval(0, 99), 0, 6)
 * // config object — size fields optional
 * Gen.dict({ keyGen: Gen.asciiString(1, 4), elemGen: Gen.interval(0, 99) })
 * Gen.dict({ keyGen: Gen.asciiString(1, 4), elemGen: Gen.interval(0, 99), maxSize: 6 })
 * ```
 */
export function DictionaryGen<T>(config: DictGenConfig<T>): Generator<Dictionary<T>>
export function DictionaryGen<T>(keyGen: Generator<string>, elemGen: Generator<T>, minSize: number, maxSize: number): Generator<Dictionary<T>>
export function DictionaryGen<T>(
    first: DictGenConfig<T> | Generator<string>,
    elemGen?: Generator<T>,
    minSize?: number,
    maxSize?: number
): Generator<Dictionary<T>> {
    const isPosForm = elemGen !== undefined
    const resolvedKeyGen = isPosForm ? (first as Generator<string>) : (first as DictGenConfig<T>).keyGen
    const resolvedElemGen = isPosForm ? elemGen! : (first as DictGenConfig<T>).elemGen
    const resolvedMinSize = isPosForm ? minSize! : ((first as DictGenConfig<T>).minSize ?? DEFAULT_MIN_SIZE)
    const resolvedMaxSize = isPosForm ? maxSize! : ((first as DictGenConfig<T>).maxSize ?? DEFAULT_MAX_SIZE)

    return new ArbiContainer<Dictionary<T>>(
        rand => {
            const size = rand.interval(resolvedMinSize, resolvedMaxSize)
            // Collect [Shrinkable<string>, Shrinkable<T>] pairs, keeping both
            // shrink trees so the shrinker can shrink keys and values independently.
            const pairs: Array<[Shrinkable<string>, Shrinkable<T>]> = []
            const seenKeys = new Set<string>()
            while (pairs.length < size) {
                const keyShr = resolvedKeyGen.generate(rand)
                if (!seenKeys.has(keyShr.value)) {
                    seenKeys.add(keyShr.value)
                    pairs.push([keyShr, resolvedElemGen.generate(rand)])
                }
            }
            return shrinkableDictionary(pairs, resolvedMinSize)
        },
        resolvedMinSize,
        resolvedMaxSize
    )
}
