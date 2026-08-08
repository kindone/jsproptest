/**
 * Contract: stateful properties should execute generated action sequences
 * against a real object and a simpler model, run lifecycle hooks at the right
 * boundary, shrink failing action traces, and expose reproduction information.
 *
 * Scope: this file covers successful lifecycle hooks, model comparison,
 * postcheck failure cleanup behavior, action-parameter shrinking,
 * prefix-parameter shrinking, and reproduction reporting.
 *
 * Helpers: action factories use public `Action`, `SimpleAction`, and
 * `statefulProperty` APIs. The model is intentionally simpler than the object
 * and assertions observe public error/output behavior.
 */

import { Action, Arbitrary, Gen, Shrinkable, SimpleAction, Stream, simpleStatefulProperty, statefulProperty } from '../src'
import { DOMAINS, RUNS, SAMPLES, STATEFUL } from './run-config'

describe('stateful workflow contracts', () => {
    it('simple stateful properties run lifecycle hooks once per successful generated sequence', () => {
        type Subject = number[]
        const pushGen = Gen.interval(DOMAINS.noShrinkValue.min - 5, DOMAINS.noShrinkValue.max).map(
            value =>
                new SimpleAction<Subject>(subject => {
                    const before = subject.length
                    subject.push(value)
                    expect(subject.length).toBe(before + 1)
                }, `push(${value})`)
        )
        const popGen = Gen.just(
            new SimpleAction<Subject>(subject => {
                const before = subject.length
                if (before === 0) return
                subject.pop()
                expect(subject.length).toBe(before - 1)
            }, 'pop')
        )

        const lifecycle: string[] = []
        simpleStatefulProperty(
            Gen.array(
                Gen.interval(DOMAINS.noShrinkValue.min - 5, DOMAINS.noShrinkValue.max),
                STATEFUL.simpleInitialSize.min,
                STATEFUL.simpleInitialSize.max
            ),
            Gen.simpleActionOf(pushGen, popGen)
        )
            .setNumRuns(SAMPLES.lifecycleRuns)
            .setMinActions(STATEFUL.simpleActions.min)
            .setMaxActions(STATEFUL.simpleActions.max)
            .setOnStartup(() => lifecycle.push('startup'))
            .setOnCleanup(() => lifecycle.push('cleanup'))
            .go()

        expect(lifecycle).toEqual(Array.from({ length: SAMPLES.lifecycleRuns }).flatMap(() => ['startup', 'cleanup']))
    })

    it('model-based stateful properties keep object and model observations equivalent', () => {
        type Subject = number[]
        type Model = { values: number[] }

        const actionFactory = (_subject: Subject, _model: Model) =>
            Gen.oneOf(
                Gen.interval(DOMAINS.mediumNatural.min, DOMAINS.mediumNatural.max).map(
                    value =>
                        new Action<Subject, Model>((subject, expected) => {
                            subject.push(value)
                            expected.values.push(value)
                        }, `push(${value})`)
                ),
                Gen.just(
                    new Action<Subject, Model>((subject, expected) => {
                        subject.pop()
                        expected.values.pop()
                    }, 'pop')
                ),
                Gen.weightedGen(
                    Gen.just(
                        new Action<Subject, Model>((subject, expected) => {
                            subject.splice(0, subject.length)
                            expected.values = []
                        }, 'clear')
                    ),
                    0.1
                ),
                Gen.weightedGen(
                    Gen.just(
                        new Action<Subject, Model>((subject, expected) => {
                            expect(subject).toEqual(expected.values)
                        }, 'observe')
                    ),
                    0.2
                )
            )

        statefulProperty(
            Gen.array(
                Gen.interval(DOMAINS.mediumNatural.min, DOMAINS.mediumNatural.max),
                STATEFUL.modelInitialSize.min,
                STATEFUL.modelInitialSize.max
            ),
            values => ({ values: [...values] }),
            actionFactory
        )
            .setNumRuns(RUNS.statefulModel)
            .setMinActions(STATEFUL.modelActions.min)
            .setMaxActions(STATEFUL.modelActions.max)
            .setPostCheck((subject, model) => {
                expect(subject).toEqual(model.values)
            })
            .go()
    })

    it('postcheck failures run startup but skip cleanup for the failing generated sequence', () => {
        type Subject = number[]
        type Model = { values: number[] }
        const lifecycle: string[] = []

        expect(() =>
            statefulProperty(
                Gen.array(
                    Gen.interval(DOMAINS.mediumNatural.min, DOMAINS.mediumNatural.max),
                    STATEFUL.modelInitialSize.min,
                    STATEFUL.modelInitialSize.max
                ),
                values => ({ values: [...values] }),
                Gen.actionOf<Subject, Model>(Gen.just(new Action((_subject, _model) => {}, 'noop')))
            )
                .setSeed('stateful-postcheck-cleanup')
                .setNumRuns(RUNS.tiny)
                .setMinActions(STATEFUL.singleReplayAction.min)
                .setMaxActions(STATEFUL.singleReplayAction.max)
                .setOnStartup(() => lifecycle.push('startup'))
                .setOnCleanup(() => lifecycle.push('cleanup'))
                .setPostCheck(() => {
                    throw new Error('postcheck failure')
                })
                .go()
        ).toThrow('postcheck failure')

        expect(lifecycle.filter(event => event === 'startup').length).toBeGreaterThanOrEqual(1)
        expect(lifecycle).not.toContain('cleanup')
    })

    it('regression replay: stateful shrinking reports the smallest boundary action parameter', () => {
        type Subject = number[]
        type Model = Record<string, never>
        const threshold = 5

        const pushGen = Gen.interval(DOMAINS.statefulBoundaryParam.min, DOMAINS.statefulBoundaryParam.max).map(
            value =>
                new Action<Subject, Model>((subject) => {
                    const before = subject.length
                    if (value < threshold) subject.push(value)
                    expect(subject.length).toBe(before + 1)
                }, `push(${value})`)
        )

        let message = ''
        try {
            statefulProperty(
                new Arbitrary<Subject>(() => new Shrinkable<Subject>([])),
                () => ({}) as Model,
                () => pushGen
            )
                .setSeed('stateful-boundary-shrink')
                .setNumRuns(RUNS.statefulBoundaryReplay)
                .setMinActions(STATEFUL.boundaryReplayActions.min)
                .setMaxActions(STATEFUL.boundaryReplayActions.max)
                .go()
        } catch (error) {
            message = (error as Error).message
        }

        expect(message).toContain('push(5)')
    })

    it('regression replay: stateful prefix-parameter shrinking improves non-last action slots', () => {
        type Subject = { sum: number }
        type Model = Record<string, never>
        const limit = 5
        const knownPrefixShrinkReplaySeed = '42'
        const prefixOutput: string[] = []

        const actionFactory = (_subject: Subject, _model: Model) =>
            Gen.interval(DOMAINS.statefulAddParam.min, DOMAINS.statefulAddParam.max).map(
                value =>
                    new Action<Subject, Model>((subject) => {
                        subject.sum += value
                        if (subject.sum > limit) throw new Error(`sum ${subject.sum} > ${limit}`)
                    }, `add(${value})`)
            )

        let message = ''
        try {
            statefulProperty(
                new Arbitrary<Subject>(() => new Shrinkable<Subject>({ sum: 0 })),
                () => ({}) as Model,
                actionFactory
            )
                .setSeed(knownPrefixShrinkReplaySeed)
                .setNumRuns(RUNS.statefulPrefixReplay)
                .setMinActions(STATEFUL.prefixReplayActions.min)
                .setMaxActions(STATEFUL.prefixReplayActions.max)
                .setOutputStream({
                    write: text => {
                        if (text.includes('prefix params')) prefixOutput.push(text)
                    },
                })
                .go()
        } catch (error) {
            message = (error as Error).message
        }

        expect(message).toContain('args found by shrinking')
        expect(message).toContain('add(1)')
        expect(message).toContain('add(5)')
        expect(prefixOutput.length).toBeGreaterThan(0)
    })

    it('regression replay: stateful shrink retries collect reproduction stats and write shrink output', () => {
        type Subject = { value: number }
        type Model = { value: number }
        const stats: Array<{ numReproduced: number; totalRuns: number; elapsedSec: number; argsAsString: string }> = []
        const output: string[] = []

        const prop = statefulProperty(
            new Arbitrary<Subject>(() => new Shrinkable({ value: 1 }, () => Stream.one(new Shrinkable({ value: 0 })))),
            subject => ({ value: subject.value }),
            Gen.actionOf<Subject, Model>(Gen.just(new Action((_subject, _model) => {}, 'noop')))
        )
        prop.setPostCheck(() => {
            throw new Error('stateful boom')
        })

        expect(() =>
            prop
                .setSeed('stateful-reproduction-stats')
                .setNumRuns(STATEFUL.singleReplayAction.max)
                .setMinActions(STATEFUL.singleReplayAction.min)
                .setMaxActions(STATEFUL.singleReplayAction.max)
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
})
