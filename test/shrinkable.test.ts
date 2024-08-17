import { Shrinkable } from '../src/Shrinkable'
import { Stream } from '../src/Stream'
import { serializeShrinkable } from './testutil'

describe('shrinkable', () => {
    it('basic', () => {
        const shr = new Shrinkable(0)
        expect(serializeShrinkable(shr)).toEqual('{"value":0}')
    })

    const genShrinkable21 = () => new Shrinkable(2).with(() => Stream.two(new Shrinkable(0), new Shrinkable(1)))

    const genShrinkable40213 = () =>
        new Shrinkable(4).with(() =>
            Stream.three(
                new Shrinkable(0),
                new Shrinkable(2).with(() => Stream.one(new Shrinkable(1))),
                new Shrinkable(3)
            )
        )

    it('Shrinkable:40213', () => {
        const shr = genShrinkable40213()
        expect(serializeShrinkable(shr)).toEqual(
            `{
            "value": 4,
            "shrinks": [
                {
                    "value": 0
                },
                {
                    "value": 2,
                    "shrinks": [
                        {
                            "value": 1
                        }
                    ]
                },
                {
                    "value": 3
                }
            ]
        }`.replace(/\s/g, '')
        )
    })

    it('Shrinkable::concatStatic', () => {
        {
            const shr0 = new Shrinkable(100)
            const shr1 = shr0.concatStatic(() => Stream.one(new Shrinkable(200)))
            expect(serializeShrinkable(shr1)).toEqual('{"value":100,"shrinks":[{"value":200}]}')
        }
        {
            const shr2 = genShrinkable21()
            const shr3 = shr2.concatStatic(() => Stream.one(new Shrinkable(3)))
            expect(serializeShrinkable(shr3)).toEqual(
                '{"value":2,"shrinks":[{"value":0,"shrinks":[{"value":3}]},{"value":1,"shrinks":[{"value":3}]},{"value":3}]}'
            )
        }
        {
            const shr4 = genShrinkable40213()
            const shr5 = shr4.concatStatic(() => Stream.one(new Shrinkable(5)))
            expect(serializeShrinkable(shr5)).toEqual(
                '{"value":4,"shrinks":[{"value":0,"shrinks":[{"value":5}]},{"value":2,"shrinks":[{"value":1,"shrinks":[{"value":5}]},{"value":5}]},{"value":3,"shrinks":[{"value":5}]},{"value":5}]}'
            )
        }
    })

    it('Shrinkable::concat', () => {
        {
            const shr0 = new Shrinkable(100)
            const shr1 = shr0.concat(_ => Stream.one(new Shrinkable(200)))
            expect(serializeShrinkable(shr1)).toEqual('{"value":100,"shrinks":[{"value":200}]}')
        }
        {
            const shr0 = genShrinkable21()
            expect(serializeShrinkable(shr0)).toEqual('{"value":2,"shrinks":[{"value":0},{"value":1}]}')
            const shr1 = shr0.concat((parent: Shrinkable<number>) => Stream.one(new Shrinkable(parent.value + 5)))
            expect(serializeShrinkable(shr1)).toEqual(
                '{"value":2,"shrinks":[{"value":0,"shrinks":[{"value":5}]},{"value":1,"shrinks":[{"value":6}]},{"value":7}]}'
            )
        }
        {
            const shr = genShrinkable40213()
            const shr2 = shr.concat((parent: Shrinkable<number>) => Stream.one(new Shrinkable(parent.value + 1)))
            expect(serializeShrinkable(shr2)).toEqual(
                `{
                "value": 4,
                "shrinks": [
                    {
                        "value": 0,
                        "shrinks": [
                            {
                                "value": 1
                            }
                        ]
                    },
                    {
                        "value": 2,
                        "shrinks": [
                            {
                                "value": 1,
                                "shrinks": [
                                    {
                                        "value": 2
                                    }
                                ]
                            },
                            {
                                "value": 3
                            }
                        ]
                    },
                    {
                        "value": 3,
                        "shrinks": [
                            {
                                "value": 4
                            }
                        ]
                    },
                    {
                        "value": 5
                    }
                ]
            }`.replace(/\s/g, '')
            )
        }
    })

    it('Shrinkable::andThenStatic', () => {
        {
            const shr = new Shrinkable(100)
            const shr2 = shr.andThenStatic(() => Stream.one(new Shrinkable(200)))
            expect(serializeShrinkable(shr2)).toEqual('{"value":100,"shrinks":[{"value":200}]}')
        }
        {
            const shr = genShrinkable21()
            const shr2 = shr.andThenStatic(() => Stream.one(new Shrinkable(3)))
            expect(serializeShrinkable(shr2)).toEqual(
                '{"value":2,"shrinks":[{"value":0,"shrinks":[{"value":3}]},{"value":1,"shrinks":[{"value":3}]}]}'
            )
        }
        {
            const shr = genShrinkable40213()
            const shr2 = shr.andThenStatic(() => Stream.one(new Shrinkable(5)))
            expect(serializeShrinkable(shr2)).toEqual(
                '{"value":4,"shrinks":[{"value":0,"shrinks":[{"value":5}]},{"value":2,"shrinks":[{"value":1,"shrinks":[{"value":5}]}]},{"value":3,"shrinks":[{"value":5}]}]}'
            )
        }
    })

    it('Shrinkable::andThen', () => {
        {
            const shr = new Shrinkable(100)
            const shr2 = shr.andThen((_: Shrinkable<number>) => Stream.one(new Shrinkable(200)))
            expect(serializeShrinkable(shr2)).toEqual('{"value":100,"shrinks":[{"value":200}]}')
        }
        {
            const shr = genShrinkable21()
            const shr2 = shr.andThen((parent: Shrinkable<number>) => Stream.one(new Shrinkable(parent.value + 5)))
            expect(serializeShrinkable(shr2)).toEqual(
                '{"value":2,"shrinks":[{"value":0,"shrinks":[{"value":5}]},{"value":1,"shrinks":[{"value":6}]}]}'
            )
        }
        {
            const shr = genShrinkable40213()
            const shr2 = shr.andThen((parent: Shrinkable<number>) => Stream.one(new Shrinkable(parent.value + 1)))
            expect(serializeShrinkable(shr2)).toEqual(
                `{
                "value": 4,
                "shrinks": [
                    {
                        "value": 0,
                        "shrinks": [
                            {
                                "value": 1
                            }
                        ]
                    },
                    {
                        "value": 2,
                        "shrinks": [
                            {
                                "value": 1,
                                "shrinks": [
                                    {
                                        "value": 2
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "value": 3,
                        "shrinks": [
                            {
                                "value": 4
                            }
                        ]
                    }
                ]
            }`.replace(/\s/g, '')
            )
        }
    })

    it('Shrinkable::map', () => {
        const shr = genShrinkable40213()
        const shr2 = shr.map(i => i + 1)
        expect(serializeShrinkable(shr2)).toEqual(
            '{"value":5,"shrinks":[{"value":1},{"value":3,"shrinks":[{"value":2}]},{"value":4}]}'
        )
        const shr3 = shr.map(i => [i, i + 2])
        expect(serializeShrinkable(shr3)).toEqual(
            '{"value":[4,6],"shrinks":[{"value":[0,2]},{"value":[2,4],"shrinks":[{"value":[1,3]}]},{"value":[3,5]}]}'
        )
    })

    it('Shrinkable::filter', () => {
        const shr = genShrinkable40213()
        const shr2 = shr.filter(i => i % 2 === 0)
        expect(serializeShrinkable(shr2)).toEqual('{"value":4,"shrinks":[{"value":0},{"value":2}]}')
        expect(() => shr.filter(i => i > 10)).toThrow() // self cannot be filtered out
    })

    it('Shrinkable::flatMap', () => {
        const shr = genShrinkable40213()
        const shr2 = shr.flatMap(i => new Shrinkable(i + 1))
        expect(serializeShrinkable(shr2)).toEqual(
            '{"value":5,"shrinks":[{"value":1},{"value":3,"shrinks":[{"value":2}]},{"value":4}]}'
        )
    })

    it('Shrinkable::getNthChild', () => {
        const shr = genShrinkable40213()
        expect(shr.getNthChild(0).value).toEqual(0)
        expect(shr.getNthChild(1).value).toEqual(2)
        expect(shr.getNthChild(2).value).toEqual(3)
        expect(() => shr.getNthChild(-1)).toThrow()
        expect(() => shr.getNthChild(3)).toThrow()
    })

    it('Shrinkable::retrieve', () => {
        const shr = genShrinkable40213()
        expect(shr.retrieve([])).toEqual(shr)
        expect(serializeShrinkable(shr.retrieve([0]))).toEqual(serializeShrinkable(new Shrinkable(0)))
        expect(serializeShrinkable(shr.retrieve([1]))).toEqual('{"value":2,"shrinks":[{"value":1}]}')
        expect(serializeShrinkable(shr.retrieve([2]))).toEqual('{"value":3}')
        expect(serializeShrinkable(shr.retrieve([1, 0]))).toEqual('{"value":1}')
        expect(() => shr.retrieve([-1])).toThrow()
        expect(() => shr.retrieve([1, 1])).toThrow()
        expect(() => shr.retrieve([2, 0])).toThrow()
        expect(() => shr.retrieve([3])).toThrow()
        expect(() => shr.retrieve([3, 0])).toThrow()
    })
})
