import { ArbiContainer, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'
import { shrinkableString } from '../shrinker/string'
import { interval } from './integer'

/**
 * Generates integers representing ASCII character codes (1–127).
 * @returns A `Generator<number>` of code points.
 */
export const ASCIICharGen = interval(1, 0x7f)
/**
 * Generates integers representing printable ASCII character codes (32–127).
 * @returns A `Generator<number>` of code points.
 */
export const PrintableASCIICharGen = interval(0x20, 0x7f)
/**
 * Generates integers representing Unicode character codes.
 * Maps the interval to avoid generating surrogate pair code points directly (U+D800 to U+DFFF).
 * @returns A `Generator<number>` of code points.
 */
export const UnicodeCharGen = interval(1, 0xd7ff + (0x10ffff - 0xe000 + 1)).map(code =>
    // Skip surrogate pair range D800-DFFF
    code < 0xd800 ? code : code + (0xe000 - 0xd800)
)

const DEFAULT_MIN_SIZE = 0
const DEFAULT_MAX_SIZE = 20

/**
 * Configuration for {@link StringGen}.
 *
 * All fields are optional — omitted sizes use defaults and `charGen` defaults to ASCII.
 *
 * @example
 * ```ts
 * Gen.string({ maxSize: 8 })
 * Gen.string({ minSize: 1, maxSize: 20, charGen: Gen.unicode })
 * ```
 */
export interface StringGenConfig {
    /** Minimum string length. Default: 0. */
    minSize?: number
    /** Maximum string length. Default: 20. */
    maxSize?: number
    /** Character code generator. Default: `ASCIICharGen` (1–127). */
    charGen?: Generator<number>
}

/**
 * Creates a generator for strings of a specified length range, using a given character code generator.
 * Supports both a positional form and a config-object form.
 *
 * @example
 * ```ts
 * // positional (existing)
 * Gen.string(0, 8)
 * Gen.string(0, 4, Gen.unicode)
 * // config object — all fields optional
 * Gen.string({ maxSize: 8 })
 * Gen.string({ minSize: 1, maxSize: 20, charGen: Gen.unicode })
 * ```
 */
export function StringGen(config: StringGenConfig): Generator<string>
export function StringGen(minSize: number, maxSize: number, charGen?: Generator<number>): Generator<string>
export function StringGen(
    first: StringGenConfig | number,
    maxSize?: number,
    charGen?: Generator<number>
): Generator<string> {
    const isPosForm = typeof first === 'number'
    const resolvedMinSize = isPosForm ? first : ((first as StringGenConfig).minSize ?? DEFAULT_MIN_SIZE)
    const resolvedMaxSize = isPosForm ? maxSize! : ((first as StringGenConfig).maxSize ?? DEFAULT_MAX_SIZE)
    const resolvedCharGen = isPosForm ? (charGen ?? ASCIICharGen) : ((first as StringGenConfig).charGen ?? ASCIICharGen)

    return new ArbiContainer<string>(
        rand => {
            const size = rand.interval(resolvedMinSize, resolvedMaxSize)
            const array: Array<Shrinkable<number>> = []
            for (let i = 0; i < size; i++) array.push(resolvedCharGen.generate(rand))

            return shrinkableString(array, resolvedMinSize)
        },
        resolvedMinSize,
        resolvedMaxSize
    )
}

/**
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
 *
 * @example
 * ```ts
 * Gen.unicodeString(0, 20)
 * ```
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
 *
 * @example
 * ```ts
 * Gen.printableAsciiString(3, 40)
 * ```
 */
export function PrintableASCIIStringGen(minSize: number, maxSize: number): Generator<string> {
    return StringGen(minSize, maxSize, PrintableASCIICharGen)
}
