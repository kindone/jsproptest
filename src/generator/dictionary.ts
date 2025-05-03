import { ArbiContainer, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'
import { Dictionary, shrinkableDictionary } from '../shrinker/dictionary'

/**
 * Generates a dictionary (object) with keys of type string and values of type T.
 *
 * @template T The type of elements in the dictionary values.
 * @param keyGen The generator for the dictionary keys (must generate strings).
 * @param elemGen The generator for the dictionary values.
 * @param minSize The minimum number of key-value pairs in the dictionary.
 * @param maxSize The maximum number of key-value pairs in the dictionary.
 * @returns A generator for dictionaries.
 */
export function DictionaryGen<T>(
    keyGen: Generator<string>,
    elemGen: Generator<T>,
    minSize: number,
    maxSize: number
): Generator<Dictionary<T>> {
    return new ArbiContainer<Dictionary<T>>(
        rand => {
            const size = rand.interval(minSize, maxSize)
            const dict: Dictionary<Shrinkable<T>> = {}
            // Use the provided keyGen to generate keys.
            // Rely on the loop condition and existence check to ensure uniqueness eventually.
            // This might be inefficient for larger dictionaries or stricter key requirements.
            while (Object.keys(dict).length < size) {
                const keyShr = keyGen.generate(rand)
                if (!dict[keyShr.value]) dict[keyShr.value] = elemGen.generate(rand)
            }

            return shrinkableDictionary(dict, minSize)
        },
        minSize,
        maxSize
    )
}
