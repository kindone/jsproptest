import { Gen } from '../src'
import { Action, SimpleAction } from '../src/stateful/statefulbase'
import { simpleStatefulProperty, statefulProperty } from '../src/stateful/statefultest'

describe('stateful', () => {
    it('simple', () => {
        type T = Array<number>
        const pushGen = Gen.interval(0, 10000).map(
            (value: number) =>
                new SimpleAction((obj: T) => {
                    const size = obj.length
                    obj.push(value)
                    expect(obj.length).toBe(size + 1)
                })
        )

        const popGen = Gen.just(
            new SimpleAction((obj: T) => {
                const size = obj.length
                if (obj.length === 0) return
                obj.pop()
                expect(obj.length).toBe(size - 1)
            })
        )

        const clearGen = Gen.just(
            new SimpleAction((obj: T) => {
                if (obj.length === 0) return
                while (obj.length > 0) obj.pop()
                expect(obj.length).toBe(0)
            })
        )

        const actionGenFactory = Gen.simpleActionOf<T>(pushGen, popGen, Gen.weightedValue(clearGen, 0.1))
        const prop = simpleStatefulProperty(Gen.array(Gen.integers(0, 10000), 0, 20), actionGenFactory)
        prop.go()
        prop.setOnStartup(() => console.log('startup'))
        prop.setOnCleanup(() => console.log('cleanup'))
        prop.setSeed('1')
            .setNumRuns(10)
            .go()
    })

    it('normal', () => {
        type T = Array<number>
        type M = { count: number }
        const pushGen = Gen.interval(0, 10000).map(
            (value: number) =>
                new Action((obj: T, model: M) => {
                    const size = obj.length
                    obj.push(value)
                    expect(obj.length).toBe(size + 1)
                    model.count++
                    // console.log('pushGen')
                })
        )

        const popGen = Gen.just(
            new Action((obj: T, model: M) => {
                const size = obj.length
                if (obj.length === 0) return
                obj.pop()
                expect(obj.length).toBe(size - 1)
                model.count--
                // console.log('popGen')
            })
        )

        const clearGen = Gen.just(
            new Action((obj: T, model: M) => {
                if (obj.length === 0) return
                while (obj.length > 0) obj.pop()
                expect(obj.length).toBe(0)
                model.count = 0
                // console.log('clear')
            })
        )

        const actionGen = Gen.actionOf(
            pushGen,
            (_: T, __: M) => popGen,
            Gen.weightedValue((_: T, __: M) => clearGen, 0.1)
        )
        const modelFactory = (obj: T): M => {
            return { count: obj.length }
        }
        const prop = statefulProperty(Gen.array(Gen.integers(0, 10000), 0, 20), modelFactory, actionGen)
        prop.setVerbosity(false)
            .setMaxActions(200)
            .go()
        prop.setOnStartup(() => console.log('startup'))
        prop.setOnCleanup(() => console.log('cleanup'))
        prop.setPostCheck((_: T, __: M) => {
            throw new Error('error')
        })
        expect(() =>
            prop
                .setSeed('1')
                .setNumRuns(10)
                .setVerbosity(false)
                .go()
        ).toThrow()
    })

    it('shrink_stateful', () => {
        type T = Array<number>
        type M = { count: number }
        const pushGen = Gen.interval(0, 10000).map(
            (value: number) =>
                new Action((obj: T, model: M) => {
                    const size = obj.length
                    if (value < 9000)
                        // cause expect to fail
                        obj.push(value)
                    expect(obj.length).toBe(size + 1)
                    model.count++
                }, 'push(' + value + ')')
        )

        const popGen = Gen.just(
            new Action((obj: T, model: M) => {
                const size = obj.length
                if (obj.length === 0) return
                obj.pop()
                expect(obj.length).toBe(size - 1)
                model.count--
            }, 'pop')
        )

        const clearGen = Gen.just(
            new Action((obj: T, model: M) => {
                if (obj.length === 0) return
                while (obj.length > 0) obj.pop()
                expect(obj.length).toBe(0)
                model.count = 0
            }, 'clear')
        )

        const actionGen = Gen.actionOf(
            pushGen,
            (_: T, __: M) => popGen,
            Gen.weightedValue((_: T, __: M) => clearGen, 0.1)
        )
        const modelFactory = (obj: T): M => {
            return { count: obj.length }
        }
        const prop = statefulProperty(Gen.array(Gen.integers(0, 10000), 0, 20), modelFactory, actionGen)
        expect(() =>
            prop
                .setVerbosity(false)
                .setMaxActions(200)
                .go()
        ).toThrow()
        // prop.setVerbosity(false).setMaxActions(1000).go()

        prop.setOnStartup(() => console.log('startup'))
        prop.setOnCleanup(() => console.log('cleanup'))
        prop.setPostCheck((_: T, __: M) => {
            throw new Error('error')
        })
        expect(() =>
            prop
                .setSeed('1')
                .setNumRuns(10)
                .setVerbosity(false)
                .go()
        ).toThrow()
    })
})
