import { ArbiContainer, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'
import { shrinkableString } from '../shrinker/string'
import { interval } from './integer'

export const ASCIICharGen = interval(1, 0x7f)
export const PrintableASCIICharGen = interval(0x20, 0x7f)
export const UnicodeCharGen = interval(1, 0xd7ff + (0x10ffff - 0xe000 + 1)).map(code =>
    code < 0xd800 ? code : code + (0xe000 - 0xd800)
)

export function stringGen(
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

export function ASCIIStringGen(minSize: number, maxSize: number): Generator<string> {
    return stringGen(minSize, maxSize)
}

export function UnicodeStringGen(minSize: number, maxSize: number): Generator<string> {
    return stringGen(minSize, maxSize, UnicodeCharGen)
}

export function PrintableASCIIStringGen(minSize: number, maxSize: number): Generator<string> {
    return stringGen(minSize, maxSize, PrintableASCIICharGen)
}
