/**
 * Contract: exact Shrinkable composition shapes are compatibility surfaces for
 * code that inspects public shrink trees. These examples preserve public tree
 * topology without mixing them into broader utility algebra tests.
 *
 * Scope: this file covers serialized composition cases for concat, andThen,
 * map, filter, flatMap, and retrieve. Navigation and higher-level transform
 * laws live in `core-utility-contracts.test.ts`.
 */

import { Shrinkable, Stream } from '../src'
import { serializeShrinkable } from './helpers'

const genShrinkable21 = () => new Shrinkable(2).with(() => Stream.two(new Shrinkable(0), new Shrinkable(1)))

const genShrinkable40213 = () =>
    new Shrinkable(4).with(() =>
        Stream.three(
            new Shrinkable(0),
            new Shrinkable(2).with(() => Stream.one(new Shrinkable(1))),
            new Shrinkable(3)
        )
    )

describe('shrinkable composition compatibility', () => {
    it('serializes base and nested shrink trees exactly', () => {
        expect(serializeShrinkable(new Shrinkable(0))).toBe('{"value":0}')
        expect(serializeShrinkable(genShrinkable21())).toBe('{"value":2,"shrinks":[{"value":0},{"value":1}]}')
        expect(serializeShrinkable(genShrinkable40213())).toBe(
            '{"value":4,"shrinks":[{"value":0},{"value":2,"shrinks":[{"value":1}]},{"value":3}]}'
        )
    })

    it('preserves concatStatic and concat tree composition order exactly', () => {
        expect(serializeShrinkable(new Shrinkable(100).concatStatic(() => Stream.one(new Shrinkable(200)))))
            .toBe('{"value":100,"shrinks":[{"value":200}]}')

        expect(serializeShrinkable(genShrinkable21().concatStatic(() => Stream.one(new Shrinkable(3)))))
            .toBe('{"value":2,"shrinks":[{"value":0,"shrinks":[{"value":3}]},{"value":1,"shrinks":[{"value":3}]},{"value":3}]}')

        expect(serializeShrinkable(genShrinkable40213().concatStatic(() => Stream.one(new Shrinkable(5)))))
            .toBe('{"value":4,"shrinks":[{"value":0,"shrinks":[{"value":5}]},{"value":2,"shrinks":[{"value":1,"shrinks":[{"value":5}]},{"value":5}]},{"value":3,"shrinks":[{"value":5}]},{"value":5}]}')

        expect(serializeShrinkable(genShrinkable21().concat(parent => Stream.one(new Shrinkable(parent.value + 5)))))
            .toBe('{"value":2,"shrinks":[{"value":0,"shrinks":[{"value":5}]},{"value":1,"shrinks":[{"value":6}]},{"value":7}]}')

        expect(serializeShrinkable(genShrinkable40213().concat(parent => Stream.one(new Shrinkable(parent.value + 1)))))
            .toBe('{"value":4,"shrinks":[{"value":0,"shrinks":[{"value":1}]},{"value":2,"shrinks":[{"value":1,"shrinks":[{"value":2}]},{"value":3}]},{"value":3,"shrinks":[{"value":4}]},{"value":5}]}')
    })

    it('preserves andThenStatic and andThen tree composition order exactly', () => {
        expect(serializeShrinkable(new Shrinkable(100).andThenStatic(() => Stream.one(new Shrinkable(200)))))
            .toBe('{"value":100,"shrinks":[{"value":200}]}')

        expect(serializeShrinkable(genShrinkable21().andThenStatic(() => Stream.one(new Shrinkable(3)))))
            .toBe('{"value":2,"shrinks":[{"value":0,"shrinks":[{"value":3}]},{"value":1,"shrinks":[{"value":3}]}]}')

        expect(serializeShrinkable(genShrinkable40213().andThenStatic(() => Stream.one(new Shrinkable(5)))))
            .toBe('{"value":4,"shrinks":[{"value":0,"shrinks":[{"value":5}]},{"value":2,"shrinks":[{"value":1,"shrinks":[{"value":5}]}]},{"value":3,"shrinks":[{"value":5}]}]}')

        expect(serializeShrinkable(genShrinkable21().andThen(parent => Stream.one(new Shrinkable(parent.value + 5)))))
            .toBe('{"value":2,"shrinks":[{"value":0,"shrinks":[{"value":5}]},{"value":1,"shrinks":[{"value":6}]}]}')

        expect(serializeShrinkable(genShrinkable40213().andThen(parent => Stream.one(new Shrinkable(parent.value + 1)))))
            .toBe('{"value":4,"shrinks":[{"value":0,"shrinks":[{"value":1}]},{"value":2,"shrinks":[{"value":1,"shrinks":[{"value":2}]}]},{"value":3,"shrinks":[{"value":4}]}]}')
    })

    it('preserves map, filter, flatMap, and retrieval examples exactly', () => {
        const shrinkable = genShrinkable40213()

        expect(serializeShrinkable(shrinkable.map(value => value + 1)))
            .toBe('{"value":5,"shrinks":[{"value":1},{"value":3,"shrinks":[{"value":2}]},{"value":4}]}')
        expect(serializeShrinkable(shrinkable.map(value => [value, value + 2])))
            .toBe('{"value":[4,6],"shrinks":[{"value":[0,2]},{"value":[2,4],"shrinks":[{"value":[1,3]}]},{"value":[3,5]}]}')
        expect(serializeShrinkable(shrinkable.filter(value => value % 2 === 0)))
            .toBe('{"value":4,"shrinks":[{"value":0},{"value":2}]}')
        expect(serializeShrinkable(shrinkable.flatMap(value => new Shrinkable(value + 1))))
            .toBe('{"value":5,"shrinks":[{"value":1},{"value":3,"shrinks":[{"value":2}]},{"value":4}]}')

        expect(serializeShrinkable(shrinkable.retrieve([0]))).toBe('{"value":0}')
        expect(serializeShrinkable(shrinkable.retrieve([1]))).toBe('{"value":2,"shrinks":[{"value":1}]}')
        expect(serializeShrinkable(shrinkable.retrieve([2]))).toBe('{"value":3}')
        expect(serializeShrinkable(shrinkable.retrieve([1, 0]))).toBe('{"value":1}')
    })
})
