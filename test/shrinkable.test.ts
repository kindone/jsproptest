import { just } from '../src/combinator/just'
import { interval } from '../src/generator/integer'
import { TupleGen } from '../src/generator/tuple'
import { Random } from '../src/Random'
import { Shrinkable } from '../src/Shrinkable'
import { Stream } from '../src/Stream'
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

    const genShrinkable40213 = () =>
        new Shrinkable(4).with(() =>
            Stream.three(
                new Shrinkable(0),
                new Shrinkable(2).with(() => Stream.one(new Shrinkable(1))),
                new Shrinkable(3)
            )
        )

    it('Shrinkable::map', () => {
        const shr = genShrinkable40213()
        const shr2 = shr.map(i => [i, i + 2])
        exhaustive(shr2)
    })

    it('Shrinkable::filter', () => {
        const shr = genShrinkable40213()
        const shr2 = shr.filter(i => i % 2 == 0)
        exhaustive(shr2)
        const shr3 = shr.filter(i => i > 10)
        expect(exhaustive(shr3)).toThrow() // self cannot be filtered out
    })

    it('Shrinkable::flatMap', () => {
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

    it('Shrinkable::getNthChild', () => {
        const shr = genShrinkable40213()
        exhaustive(shr.getNthChild(0))
        exhaustive(shr.getNthChild(1))
        exhaustive(shr.getNthChild(2))
        expect(() => shr.getNthChild(3)).toThrow()
    })
    it('Shrinkable::retrieve', () => {
        const shr = genShrinkable40213()
        exhaustive(shr.retrieve([]))
        exhaustive(shr.retrieve([0]))
        exhaustive(shr.retrieve([1]))
        exhaustive(shr.retrieve([2]))
        expect(() => shr.retrieve([3])).toThrow()
        expect(() => shr.retrieve([2, 0])).toThrow()
        expect(() => shr.retrieve([3, 0])).toThrow()
        exhaustive(shr.retrieve([1, 0]))
        expect(() => shr.retrieve([1, 1])).toThrow()
    })
})
