import { ArbiContainer, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'
import { Dictionary, shrinkableDictionary } from '../shrinker/dictionary'
import { StringGen } from './string'

/**
 * Generates a dictionary (object) with string keys and values of type T.
 *
 * @template T The type of elements in the dictionary values.
 * @param elemGen The generator for the dictionary values.
 * @param minSize The minimum number of key-value pairs in the dictionary.
 * @param maxSize The maximum number of key-value pairs in the dictionary.
 * @returns A generator for dictionaries.
 */
export function DictionaryGen<T>(elemGen: Generator<T>, minSize: number, maxSize: number): Generator<Dictionary<T>> {
    return new ArbiContainer<Dictionary<T>>(
        rand => {
            const size = rand.interval(minSize, maxSize)
            const dict: Dictionary<Shrinkable<T>> = {}
            // Use a StringGen with a small length to generate keys,
            // relying on the loop condition and existence check to ensure uniqueness eventually.
            // This might be inefficient for larger dictionaries or stricter key requirements.
            const strGen = StringGen(1, 2)
            while (Object.keys(dict).length < size) {
                const strShr = strGen.generate(rand)
                if (!dict[strShr.value]) dict[strShr.value] = elemGen.generate(rand)
            }

            return shrinkableDictionary(dict, minSize)
        },
        minSize,
        maxSize
    )
}
