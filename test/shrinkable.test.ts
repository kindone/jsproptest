import { interval } from "../src/generator/integer"
import { Random } from "../src/Random"
import { Shrinkable } from "../src/Shrinkable"
import { exhaustive } from "./testutil"

describe('shrinkable', () => {
    it('basic', () => {
        const shr = new Shrinkable(0)
        exhaustive(shr)
    })

    it('numeric', () => {
        exhaustive(interval(0, 7).generate(new Random('1')))
        exhaustive(interval(0, 7).generate(new Random('2')))
        exhaustive(interval(0, 7).generate(new Random('3')))
    })
})