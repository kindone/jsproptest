import { just } from '../src/combinator/just'
import { interval } from '../src/generator/integer'
import { TupleGen } from '../src/generator/tuple'
import { Random } from '../src/Random'
import { Shrinkable } from '../src/Shrinkable'
import { exhaustive } from './testutil'

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

    it('flatMap', () => {
        const numGen1 = interval(0, 4)
        const numGen2 = interval(-8, -4)
        const tupleGen = numGen1.flatMap(num => TupleGen(just(num), numGen2))
        exhaustive(tupleGen.generate(new Random('1')))
        exhaustive(tupleGen.generate(new Random('2')))
        exhaustive(tupleGen.generate(new Random('3')))

        const justGen = interval(0, 4).flatMap(num => just(num))
        exhaustive(justGen.generate(new Random('1')))
        exhaustive(justGen.generate(new Random('2')))
        exhaustive(justGen.generate(new Random('3')))
        const justGen2 = just(5).flatMap(num => interval(0, num))
        exhaustive(justGen2.generate(new Random('1')))
        exhaustive(justGen2.generate(new Random('2')))
        exhaustive(justGen2.generate(new Random('3')))
    })
})
