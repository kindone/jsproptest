import { ArbiContainer, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'
import { shrinkableString } from '../shrinker/string'
import { interval } from './integer'

/** Generates integers representing ASCII character codes (1-127). */
export const ASCIICharGen = interval(1, 0x7f)
/** Generates integers representing printable ASCII character codes (32-127). */
export const PrintableASCIICharGen = interval(0x20, 0x7f)
/**
 * Generates integers representing Unicode character codes.
 * Maps the interval to avoid generating surrogate pair code points directly (U+D800 to U+DFFF).
 */
export const UnicodeCharGen = interval(1, 0xd7ff + (0x10ffff - 0xe000 + 1)).map(code =>
    // Skip surrogate pair range D800-DFFF
    code < 0xd800 ? code : code + (0xe000 - 0xd800)
)

/**
 * Creates a generator for strings of a specified length range, using a given character code generator.
 *
 * @param minSize - The minimum length of the generated string (inclusive).
 * @param maxSize - The maximum length of the generated string (inclusive).
 * @param charGen - The generator used to produce character codes for the string. Defaults to `ASCIICharGen`.
 * @returns A generator that produces strings with shrinkable characters.
 */
export function StringGen(
    minSize: number,
    maxSize: number,
    charGen: Generator<number> = ASCIICharGen
): Generator<string> {
    return new ArbiContainer<string>(
        rand => {
            const size = rand.interval(minSize, maxSize)
            const array: Array<Shrinkable<number>> = []
            for (let i = 0; i < size; i++) array.push(charGen.generate(rand))

            return shrinkableString(array, minSize)
        },
        minSize,
        maxSize
    )
}

/**
 * Creates a generator for ASCII strings of a specified length range.
 * Equivalent to `StringGen(minSize, maxSize, ASCIICharGen)`.
 *
 * @param minSize - The minimum length of the generated string (inclusive).
 * @param maxSize - The maximum length of the generated string (inclusive).
 * @returns A generator that produces ASCII strings.
 */
export function ASCIIStringGen(minSize: number, maxSize: number): Generator<string> {
    return StringGen(minSize, maxSize)
}

/**
 * Creates a generator for Unicode strings of a specified length range.
 * Uses `UnicodeCharGen` which avoids generating surrogate pair code points directly.
 * Equivalent to `StringGen(minSize, maxSize, UnicodeCharGen)`.
 *
 * @param minSize - The minimum length of the generated string (inclusive).
 * @param maxSize - The maximum length of the generated string (inclusive).
 * @returns A generator that produces Unicode strings.
 */
export function UnicodeStringGen(minSize: number, maxSize: number): Generator<string> {
    return StringGen(minSize, maxSize, UnicodeCharGen)
}

/**
 * Creates a generator for printable ASCII strings of a specified length range.
 * Equivalent to `StringGen(minSize, maxSize, PrintableASCIICharGen)`.
 *
 * @param minSize - The minimum length of the generated string (inclusive).
 * @param maxSize - The maximum length of the generated string (inclusive).
 * @returns A generator that produces printable ASCII strings.
 */
export function PrintableASCIIStringGen(minSize: number, maxSize: number): Generator<string> {
    return StringGen(minSize, maxSize, PrintableASCIICharGen)
}
