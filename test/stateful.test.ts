import { Arbitrary, Gen, Shrinkable, Stream } from '../src'
import { Action, SimpleAction } from '../src/stateful/statefulbase'
import { simpleStatefulProperty, statefulProperty } from '../src/stateful/statefultest'

describe('stateful', () => {
    const NUM_RUNS = 10
    const MAX_ACTIONS = 200

    /**
     * Tests the simple stateful property execution without a model.
     * It uses basic array operations (push, pop, clear) as actions.
     */
    it('simple', () => {
        type T = Array<number>
        // Action generator: Pushes a random integer onto the array and asserts length increases.
        const pushGen = Gen.interval(0, 10000).map(
            (value: number) =>
                new SimpleAction((obj: T) => {
                    const size = obj.length
                    obj.push(value)
                    expect(obj.length).toBe(size + 1)
                })
        )

        // Action generator: Pops an element if the array is not empty and asserts length decreases.
        const popGen = Gen.just(
            new SimpleAction((obj: T) => {
                const size = obj.length
                if (obj.length === 0) return
                obj.pop()
                expect(obj.length).toBe(size - 1)
            })
        )

        // Action generator: Removes all elements if the array is not empty and asserts length is 0.
        const clearGen = Gen.just(
            new SimpleAction((obj: T) => {
                if (obj.length === 0) return
                while (obj.length > 0) obj.pop()
                expect(obj.length).toBe(0)
            })
        )

        const simpleArrayActionGen = Gen.simpleActionOf<T>(pushGen, popGen, Gen.weightedValue(clearGen, 0.1))
        const prop = simpleStatefulProperty(Gen.array(Gen.integers(0, 10000), 0, 20), simpleArrayActionGen)
        prop.go()

        let startupCallCount = 0
        let cleanupCallCount = 0
        prop.setOnStartup(() => {
            startupCallCount++
        })
        prop.setOnCleanup(() => {
            cleanupCallCount++
        })

        prop.setSeed('1')
            .setNumRuns(NUM_RUNS)
            .run()

        // Check counters after the run
        expect(startupCallCount).toBe(NUM_RUNS)
        expect(cleanupCallCount).toBe(NUM_RUNS)
    })

    /**
     * Tests the stateful property execution with a model.
     * The model (`M`) tracks the expected state (count) alongside the actual state (`T`).
     * Actions update both the actual object and the model.
     */
    it('normal', () => {
        type T = Array<number>
        type M = { count: number }
        // Action generator: Pushes a value, updates model count, asserts length increases.
        const pushGen = Gen.interval(0, 10000).map(
            (value: number) =>
                new Action((obj: T, model: M) => {
                    const size = obj.length
                    obj.push(value)
                    expect(obj.length).toBe(size + 1)
                    model.count++
                })
        )

        // Action generator: Pops element (if possible), updates model count, asserts length decreases.
        const popGen = Gen.just(
            new Action((obj: T, model: M) => {
                const size = obj.length
                if (obj.length === 0) return
                obj.pop()
                expect(obj.length).toBe(size - 1)
                model.count--
            })
        )

        // Action generator: Clears array (if possible), resets model count, asserts length is 0.
        const clearGen = Gen.just(
            new Action((obj: T, model: M) => {
                if (obj.length === 0) return
                while (obj.length > 0) obj.pop()
                expect(obj.length).toBe(0)
                model.count = 0
            })
        )

        const arrayModelActionGen = Gen.actionOf(
            pushGen,
            (_: T, __: M) => popGen,
            Gen.weightedValue((_: T, __: M) => clearGen, 0.1)
        )
        const modelFactory = (obj: T): M => {
            return { count: obj.length }
        }
        const prop = statefulProperty(Gen.array(Gen.integers(0, 10000), 0, 20), modelFactory, arrayModelActionGen)
        prop.setVerbosity(false)
            .setMaxActions(MAX_ACTIONS)
            .go()

        let startupCallCount = 0
        let cleanupCallCount = 0
        prop.setOnStartup(() => {
            startupCallCount++
        })
        prop.setOnCleanup(() => {
            cleanupCallCount++
        })
        prop.setPostCheck((_: T, __: M) => {
            throw new Error('error')
        })

        expect(() =>
            prop
                .setSeed('1')
                .setNumRuns(NUM_RUNS)
                .setVerbosity(false)
                .go()
        ).toThrow('error')

        // Check counters after the run
        expect(startupCallCount).toBeGreaterThanOrEqual(1)
        expect(cleanupCallCount).toBe(0)
    })

    /**
     * Tests the shrinking mechanism for stateful properties.
     * An intentional failure condition is introduced in the `pushGen` action
     * to verify that the test runner can shrink the failing sequence of actions.
     */
    it('shrink_stateful', () => {
        type T = Array<number>
        type M = { count: number }
        // Action generator: Pushes value (conditionally), updates model count, asserts length increases.
        // Includes an intentional failure condition for testing shrinking.
        const pushGen = Gen.interval(0, 10000).map(
            (value: number) =>
                new Action((obj: T, model: M) => {
                    const size = obj.length
                    if (value < 9000)
                        obj.push(value)
                    expect(obj.length).toBe(size + 1)
                    model.count++
                }, 'push(' + value + ')')
        )

        // Action generator: Pops element (if possible), updates model count, asserts length decreases.
        const popGen = Gen.just(
            new Action((obj: T, model: M) => {
                const size = obj.length
                if (obj.length === 0) return
                obj.pop()
                expect(obj.length).toBe(size - 1)
                model.count--
            }, 'pop')
        )

        // Action generator: Clears array (if possible), resets model count, asserts length is 0.
        const clearGen = Gen.just(
            new Action((obj: T, model: M) => {
                if (obj.length === 0) return
                while (obj.length > 0) obj.pop()
                expect(obj.length).toBe(0)
                model.count = 0
            }, 'clear')
        )

        const arrayModelActionGen = Gen.actionOf(
            pushGen,
            (_: T, __: M) => popGen,
            Gen.weightedValue((_: T, __: M) => clearGen, 0.1)
        )
        const modelFactory = (obj: T): M => {
            return { count: obj.length }
        }
        const prop = statefulProperty(Gen.array(Gen.integers(0, 10000), 0, 20), modelFactory, arrayModelActionGen)
        expect(() =>
            prop
                .setVerbosity(false)
                .setMaxActions(MAX_ACTIONS)
                .go()
        ).toThrow('error')

        let startupCallCount = 0
        let cleanupCallCount = 0
        prop.setOnStartup(() => {
            startupCallCount++
        })
        prop.setOnCleanup(() => {
            cleanupCallCount++
        })
        prop.setPostCheck((_: T, __: M) => {
            throw new Error('error')
        })

        expect(() =>
            prop
                .setSeed('1')
                .setNumRuns(NUM_RUNS)
                .setVerbosity(false)
                .go()
        ).toThrow('error')

        // Check counters after the run
        // When shrinking occurs, startup should run at least once.
        expect(startupCallCount).toBeGreaterThanOrEqual(1)
        // Cleanup won't run as error is thrown duringg postcheck
        expect(cleanupCallCount).toBe(0)
    })

    it('stateful shrink retry options collect stats and write shrink output', () => {
        type T = { value: number }
        type M = { value: number }
        const initialGen = new Arbitrary<T>(() => new Shrinkable({ value: 1 }, () => Stream.one(new Shrinkable({ value: 0 }))))
        const actionGen = Gen.actionOf<T, M>(Gen.just(new Action((_obj: T, _model: M) => {}, 'noop')))
        const stats: Array<{ numReproduced: number; totalRuns: number; elapsedSec: number; argsAsString: string }> = []
        const output: string[] = []

        const prop = statefulProperty(initialGen, obj => ({ value: obj.value }), actionGen)
        prop.setPostCheck(() => {
            throw new Error('stateful boom')
        })

        expect(() =>
            prop
                .setSeed('1')
                .setNumRuns(1)
                .setMinActions(1)
                .setMaxActions(1)
                .setShrinkMaxRetries(2)
                .setShrinkTimeoutMs(1000)
                .setShrinkRetryTimeoutMs(1000)
                .setOutputStream({ write: message => output.push(message) })
                .setOnReproductionStats(item => stats.push(item))
                .go()
        ).toThrow('stateful boom')

        expect(stats.length).toBeGreaterThan(0)
        expect(stats.every(item => item.totalRuns === 3)).toBe(true)
        expect(stats.some(item => item.numReproduced > 0)).toBe(true)
        expect(output.join('')).toContain('stateful shrinking found simpler')
        expect(prop.getLastReproductionStats()).toBeDefined()
    })

    it('stateful shrink parity options validate configured values', () => {
        const prop = simpleStatefulProperty(Gen.just({}), () => Gen.just(new SimpleAction(() => {}, 'noop')))

        expect(() => prop.setShrinkMaxRetries(-1)).toThrow(/non-negative integer/)
        expect(() => prop.setShrinkMaxRetries(1.5)).toThrow(/non-negative integer/)
        expect(() => prop.setShrinkTimeoutMs(-1)).toThrow(/finite non-negative/)
        expect(() => prop.setShrinkRetryTimeoutMs(Number.NaN)).toThrow(/finite non-negative/)
        expect(() => prop.setOutputStream({} as { write(message: string): void })).toThrow(/write/)
        expect(() => prop.setErrorStream({} as { write(message: string): void })).toThrow(/write/)
    })
})
