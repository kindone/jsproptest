import { ArbiContainer, Generator } from "../Generator";
import { Shrinkable } from "../Shrinkable";
import { shrinkableString } from "../shrinker/string";
import { interval } from "./integer";

export const ASCIICharGen = interval(1, 0x7f)
export const UnicodeCharGen = interval(1, 0xD7FF+(0x10FFFF-0xE000+1)).map(code => (code < 0xD800 ? code : code + (0xE000-0xD800) ))

export function stringGen(minSize:number, maxSize:number, charGen:Generator<number> = ASCIICharGen):Generator<string> {
    return new ArbiContainer<string>(rand => {
        const size = rand.interval(minSize, maxSize)
        const array:Array<Shrinkable<number>> = []
        for(let i = 0; i < size; i++)
            array.push(charGen.generate(rand))

        return shrinkableString(array, minSize)
    })
}

export function ASCIIStringGen(minSize:number, maxSize:number):Generator<string> {
    return stringGen(minSize, maxSize)
}

export function UnicodeStringGen(minSize:number, maxSize:number):Generator<string> {
    return stringGen(minSize, maxSize, UnicodeCharGen)
}