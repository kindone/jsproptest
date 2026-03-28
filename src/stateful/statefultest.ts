import { Generator } from '../Generator'
import { Random } from '../Random'
import { Shrinkable } from '../Shrinkable'
import { shrinkableArray } from '../shrinker/array'
import { Try, TryResult } from '../Try'
import { GenerationError } from '../util/error'
import { JSONStringify } from '../util/JSON'
import { ActionGenFactory, SimpleActionGenFactory } from './actionof'
import { Action, EmptyModel } from './statefulbase'

/**
 * Represents the result of a shrinking attempt, indicating whether shrinking
 * successfully found a smaller failing case and holding the relevant data.
 */
class ShrinkResult {
    readonly isSuccessful: boolean
    constructor(readonly initialObj: unknown, readonly actions: unknown[], readonly error?: Error) {
        this.isSuccessful = typeof error !== 'undefined'
    }
}

/**
 * Holds the state of a specific test execution, including the steps to reproduce
 * the initial state, the sequence of actions (potentially shrunk), the random seeds
 * used for generation, and the error encountered. Used during the shrinking process.
 */
class TestResult {
    constructor(
        readonly initialSteps: number[],
        readonly actions: Shrinkable<unknown>[],
        readonly randoms: Random[],
        readonly error: Error
    ) {}
}

/**
 * Stateful property test: random initial state, then a random-length sequence of actions whose
 * generators may depend on the current `(object, model)` pair.
 *
 * Each run: build a model from the initial object via `modelFactory`, then for each step call
 * `actionGenFactory(obj, model)` to sample the next `Action`, and run `action.call(obj, model)`.
 * Use this when you maintain a reference model in parallel with the real implementation (dual updates).
 *
 * Failures (thrown from an action or from optional `postCheck`) trigger shrinking: first the
 * random states used to generate actions, then the initial object via the `initialGen` shrink tree.
 *
 * Action generation can fail transiently; those steps are retried up to
 * `maxAllowedConsecutiveGenerationFailures` (not configurable from outside today).
 *
 * Prefer {@link simpleStatefulProperty} when you only need `SimpleAction`s and no real model
 * (`EmptyModel`).
 *
 * @template ObjectType The system under test.
 * @template ModelType The reference model state type.
 * @see {@link statefulProperty} — usual way to construct.
 */
export class StatefulProperty<ObjectType, ModelType> {
    /**
     * @internal
     * Seed for `Random`; empty string uses a fresh seed each process.
     */
    private seed: string = ''
    /**
     * @internal
     * Number of full runs (initial state + action sequence per run).
     */
    private numRuns = 100
    /**
     * @internal
     * Minimum actions sampled per run (length is uniform in `[minActions, maxActions]`).
     */
    private minActions = 1
    /**
     * @internal
     * Maximum actions per run.
     */
    private maxActions = 100
    /**
     * @internal
     * When action generation throws repeatedly, stop retrying after this many consecutive failures.
     */
    private maxAllowedConsecutiveGenerationFailures = 20
    /**
     * @internal
     * When true, log discarded actions and shrink-time generation failures.
     */
    private verbose = false
    /**
     * @internal
     * Optional hook before each run and before shrink replays.
     */
    private onStartup?: () => void
    /**
     * @internal
     * Optional hook after a successful run (all actions and `postCheck`, including replays).
     */
    private onCleanup?: () => void
    /**
     * @internal
     * Optional invariant run after the action sequence completes without throwing.
     */
    private postCheck?: (obj: ObjectType, mdl: ModelType) => void

    /**
     * @param initialGen Samples the starting `ObjectType` (shrunk on failure).
     * @param modelFactory Builds the model from the initial object (typically a pure spec of expected behavior).
     * @param actionGenFactory Given current `(obj, model)`, returns a generator of the next `Action` to apply.
     */
    constructor(
        readonly initialGen: Generator<ObjectType>,
        readonly modelFactory: (_: ObjectType) => ModelType,
        readonly actionGenFactory: ActionGenFactory<ObjectType, ModelType>
    ) {}

    /** Reproducible RNG for all runs; empty string uses a fresh seed each process. */
    setSeed(seed: string) {
        this.seed = seed
        return this
    }

    /** Number of full runs (each: new initial state + action sequence). Default 100. */
    setNumRuns(numRuns: number) {
        this.numRuns = numRuns
        return this
    }

    /** Minimum number of actions attempted per run (length is random in `[min, max]`). */
    setMinActions(num: number) {
        this.minActions = num
        return this
    }

    /** Maximum number of actions per run. */
    setMaxActions(num: number) {
        this.maxActions = num
        return this
    }

    /**
     * Hook before each run and before replay during shrinking (same semantics as {@link Property#setOnStartup}).
     */
    setOnStartup(onStartup: () => void) {
        this.onStartup = onStartup
        return this
    }

    /**
     * Hook after a run completes without throwing through all actions and `postCheck` (also after replays that succeed).
     */
    setOnCleanup(onCleanup: () => void) {
        this.onCleanup = onCleanup
        return this
    }

    /**
     * Final assertion after the action sequence: e.g. compare `obj` with an independently recomputed result.
     * Runs only when no action threw.
     */
    setPostCheck(postCheck: (obj: ObjectType, mdl: ModelType) => void) {
        this.postCheck = postCheck
        return this
    }

    /** Same as {@link setPostCheck} but only receives `obj` (model ignored). */
    setPostCheckWithoutModel(postCheck: (obj: ObjectType) => void) {
        this.postCheck = (obj: ObjectType, _: ModelType) => postCheck(obj)
        return this
    }

    /** Log discarded actions and shrink internals to the console when `true`. */
    setVerbosity(verbose: boolean) {
        this.verbose = verbose
        return this
    }

    /**
     * Run the suite: `numRuns` iterations, each with a random action count in `[minActions, maxActions]`.
     * On first thrown error from an action, stops that iteration and shrinks toward a smaller failing case.
     *
     * @throws With a message that includes shrunk or original args when an action or `postCheck` fails.
     */
    go() {
        if (this.minActions <= 0 || this.minActions > this.maxActions)
            throw new Error('invalid minSize or maxSize: ' + this.minActions + ', ' + this.maxActions)

        const rand = this.seed === '' ? new Random() : new Random(this.seed)

        for (let i = 0; i < this.numRuns; i++) {
            const savedRand = rand.clone()
            if (this.onStartup) this.onStartup()
            // generate initial object and model
            const { obj, model } = this.generateInitial(rand)
                .map(shr => {
                    return { obj: shr.value.obj, model: shr.value.model }
                })
                .getOrThrow()

            // actions executed so far
            const actionShrArr: Shrinkable<Action<ObjectType, ModelType>>[] = []
            const randomArr: Random[] = []
            const numActions = rand.interval(this.minActions, this.maxActions)
            let numConsecutiveFailures = 0
            for (let j = 0; j < numActions; ) {
                // Phase 1: Generate an action
                // one by one, generate action by calling actionGenFactory with current state
                let actionShr: Shrinkable<Action<ObjectType, ModelType>>
                try {
                    const randCopy = rand.clone()
                    actionShr = this.actionGenFactory(obj, model).generate(rand)
                    // save the action and random generator state for shrinking on successful generation
                    randomArr.push(randCopy)
                    actionShrArr.push(actionShr)
                } catch (e) {
                    // tolerate generation failures
                    // exception while generating action can happen: ignore and retry unless limit is reached
                    if (this.verbose) console.info('discarded action: ' + (e as Error).message)
                    numConsecutiveFailures++
                    if (numConsecutiveFailures >= this.maxAllowedConsecutiveGenerationFailures) {
                        console.warn(
                            'could not generate a suitable action. Tried ' +
                                this.maxAllowedConsecutiveGenerationFailures +
                                ' failures'
                        )
                        break
                    }
                    continue
                }
                numConsecutiveFailures = 0

                // Phase 2: Execute the action - execute the action to update obj and model
                try {
                    const action = actionShr.value
                    action.call(obj, model)
                    if (this.verbose) console.info('action generated. run: ', i, 'action: ', j)
                    j++
                } catch (e) {
                    // shrink based on actionShrArr
                    const originalActions = actionShrArr.map(actionShr => actionShr.value)
                    const shrinkResult = this.shrink(originalActions, savedRand, randomArr, e as Error)
                    throw this.processFailureAsError(e as Error, originalActions, shrinkResult)
                }
            }
            if (this.postCheck) this.postCheck(obj, model)

            if (this.onCleanup) this.onCleanup()
        }
    }

    /**
     * Same as {@link go}. Familiar name used by several stateful / model-based testing APIs.
     */
    run() {
        this.go()
    }

    /**
     * @internal
     * Orchestrates the shrinking process when a test failure occurs.
     * It attempts to find a smaller or simpler failing test case by:
     * 1. Shrinking the sequence of random seeds used (`shrinkRandomwise`).
     * 2. Shrinking the initial state generated (`shrinkInitialObject`).
     *
     * @param originalActions The sequence of actions that led to the failure.
     * @param initialRand The initial random generator state for the failed run.
     * @param randomArr The array of random generator states used for each action generation.
     * @param originalError The error that triggered the shrinking.
     * @returns A `ShrinkResult` containing the shrunk test case or the original failure if shrinking was unsuccessful.
     */
    private shrink(
        originalActions: Action<ObjectType, ModelType>[],
        initialRand: Random,
        randomArr: Random[],
        originalError: Error
    ): ShrinkResult {
        if (originalActions.length !== randomArr.length)
            throw new Error('action and random arrays have different sizes')

        // phase 1: shrink random wise
        /* eslint-disable-next-line prefer-const */
        let { shrunk, result } = this.shrinkActionsRandomWise(initialRand, randomArr)
        // phase 2: shrink initial object
        if (shrunk) {
            result = this.shrinkInitialObject(initialRand, result!)
        } else {
            result = this.shrinkInitialObject(
                initialRand,
                new TestResult(
                    [],
                    originalActions.map(action => new Shrinkable(action)),
                    randomArr,
                    originalError
                )
            )
        }

        // phase 3: return the shrink result (rebuild the initial object from the shrink result)
        // (initial object is recreated in each test run)
        const initialObj = this.initialGen.generate(initialRand.clone())
        // shrinking done
        if (shrunk) {
            const testResult: TestResult = result as TestResult
            return new ShrinkResult(
                initialObj.retrieve(testResult.initialSteps),
                testResult.actions,
                testResult.error as Error
            )
        }
        // unable to shrink -> return originally failed combination
        else return new ShrinkResult(initialObj.value, originalActions)
    }

    /**
     * @internal
     * Attempts to shrink the failing test case by simplifying the sequence of random numbers
     * used to generate the actions. It iteratively tries smaller sets of random seeds derived
     * from the original sequence.
     *
     * @param initialRand The initial random generator state for the test run.
     * @param randomArr The original sequence of random generator states for each action.
     * @returns An object indicating if shrinking was successful and the resulting `TestResult` if it was.
     */
    private shrinkActionsRandomWise(initialRand: Random, randomArr: Random[]): { shrunk: boolean; result?: TestResult } {
        const randomShrinkables: Shrinkable<Random>[] = randomArr.map(rand => new Shrinkable(rand))
        let nextArrayShr = shrinkableArray(randomShrinkables, 0)
        let shrinks = nextArrayShr.shrinks()
        let shrunk = false
        let result: TestResult | undefined
        while (!shrinks.isEmpty()) {
            const iter = shrinks.iterator()
            let shrinkFound = false
            while (iter.hasNext()) {
                nextArrayShr = iter.next()
                const testResult: boolean | TestResult = this.testWithRandoms(initialRand.clone(), nextArrayShr.value)
                // found a shrink (a non-generation error occurred)
                if (testResult instanceof TestResult) {
                    result = testResult
                    shrinks = nextArrayShr.shrinks()
                    shrinkFound = true
                    break
                }
            }
            if (shrinkFound) shrunk = true
            else break
        }

        return { shrunk, result }
    }

    /**
     * @internal
     * Attempts to shrink the failing test case by simplifying the initial generated object.
     * It iteratively tries simpler versions of the initial object derived from its shrink tree.
     *
     * @param initialRand The initial random generator state for the test run.
     * @param prevTestResult The best failing test result found so far (potentially after random-wise shrinking).
     * @returns The TestResult corresponding to the smallest initial object found that still causes a failure.
     */
    private shrinkInitialObject(initialRand: Random, prevTestResult: TestResult): TestResult {
        let shr = this.generateInitial(initialRand.clone()).getOrThrow()
        let shrinks = shr.shrinks()
        let result: TestResult = prevTestResult
        const steps: number[] = []
        while (!shrinks.isEmpty()) {
            const iter = shrinks.iterator()
            let step = 0
            let shrinkFound = false
            while (iter.hasNext()) {
                shr = iter.next()
                const testSteps = steps.concat()
                testSteps.push(step)
                const testResult: boolean | TestResult = this.testWithInitial(
                    initialRand.clone(),
                    testSteps,
                    prevTestResult.randoms
                )
                // found a shrink (a non-generation error occurred)
                if (testResult instanceof TestResult) {
                    result = testResult
                    shrinks = shr.shrinks()
                    steps.push(step)
                    shrinkFound = true
                    break
                }
                step++
            }
            if (!shrinkFound) break
        }

        return result
    }

    /**
     * @internal
     * Runs a test sequence using the default initial state generation and
     * a given sequence of random generators for action generation. Used during random-wise shrinking.
     *
     * @param initialRand The random generator for the initial state.
     * @param randoms The sequence of random generators to use for action generation.
     * @returns `true` if the test passes, `false` if a generation error occurs, or a `TestResult` if a non-generation error occurs.
     */
    private testWithRandoms(initialRand: Random, randoms: Random[]): boolean | TestResult {
        const actionShrs: Shrinkable<Action<ObjectType, ModelType>>[] = []
        try {
            if (this.onStartup) this.onStartup()

            const { obj, model } = this.generateInitial(initialRand.clone())
                .map(shr => {
                    return { obj: shr.value.obj, model: shr.value.model }
                })
                .getOrThrow()

            for (const rand of randoms) {
                let action: Action<ObjectType, ModelType>
                try {
                    const actionShr = this.actionGenFactory(obj, model).generate(rand)
                    actionShrs.push(actionShr)
                    action = actionShr.value
                } catch (e) {
                    if (this.verbose)
                        console.info('failure in action generation during shrinking: ' + (e as Error).toString())
                    throw new GenerationError('failure in action generation during shrinking')
                }
                action.call(obj, model)
            }

            if (this.postCheck) this.postCheck(obj, model)
            if (this.onCleanup) this.onCleanup()
            return true
        } catch (e) {
            if (e instanceof GenerationError) return false

            return new TestResult([], actionShrs, randoms, e as Error)
        }
    }

    /**
     * @internal
     * Runs a test sequence using a specific initial state derived from shrink steps
     * and a fixed sequence of random generators for action generation. Used during initial object shrinking.
     *
     * @param initialRand The base random generator for generating the initial state.
     * @param steps The sequence of shrink steps to apply to the initial state generator.
     * @param randoms The fixed sequence of random generators to use for action generation.
     * @returns `true` if the test passes, `false` if a generation error occurs, or a `TestResult` if a non-generation error occurs.
     */
    private testWithInitial(initialRand: Random, steps: number[], randoms: Random[]): boolean | TestResult {
        const actionShrs: Shrinkable<Action<ObjectType, ModelType>>[] = []
        try {
            if (this.onStartup) this.onStartup()

            // Phase 1: Generate the initial object and model
            // retrieve initial state by shrink steps chosen
            const { obj, model } = this.generateInitial(initialRand.clone())
                .map(shr => shr.retrieve(steps))
                .map(shr => {
                    return { obj: shr.value.obj, model: shr.value.model }
                })
                .getOrThrow()

            // Phase 2: Generate actions with the initial object and model + stored randoms
            for (const rand of randoms) {
                let action: Action<ObjectType, ModelType>
                try {
                    const actionShr = this.actionGenFactory(obj, model).generate(rand)
                    actionShrs.push(actionShr)
                    action = actionShr.value
                } catch (e) {
                    if (this.verbose)
                        console.info('failure in action generation during shrinking: ' + (e as Error).toString())
                    throw new GenerationError('failure in action generation during shrinking')
                }
                action.call(obj, model)
            }

            if (this.postCheck) this.postCheck(obj, model)
            if (this.onCleanup) this.onCleanup()
            return true
        } catch (e) {
            if (e instanceof GenerationError) return false

            return new TestResult(steps, actionShrs, randoms, e as Error)
        }
    }

    /**
     * @internal
     * Generates the initial object and its corresponding model using the provided
     * initial generator and model factory. Wraps the generation in a `Try` to handle
     * potential generation errors gracefully.
     *
     * @param initialRand The random generator to use for initial state generation.
     * @returns A `TryResult` containing the shrinkable initial object/model pair or a `GenerationError`.
     */
    private generateInitial(initialRand: Random): TryResult<Shrinkable<{ obj: ObjectType; model: ModelType }>> {
        return Try<Shrinkable<{ obj: ObjectType; model: ModelType }>>(() => {
            const obj = this.initialGen.generate(initialRand.clone())
            return obj.map(o => {
                return { obj: o, model: this.modelFactory(o) }
            })
        }).mapError(e => {
            if (this.verbose) console.info('failure in initialization: ' + (e as Error).toString())
            return new GenerationError('failure in initialization: ' + (e as Error).toString())
        })
    }

    /**
     * @internal
     * Formats and enhances the error message after a failure, incorporating details
     * from both the original failure and the shrunk failure (if shrinking was successful).
     * Provides context about the initial object and action sequence that caused the error.
     *
     * @param originalError The error initially caught during the test run.
     * @param originalActions The original sequence of actions that failed.
     * @param shrinkResult The result of the shrinking process.
     * @returns A new Error object with a detailed message.
     */
    private processFailureAsError(
        originalError: Error,
        originalActions: Action<ObjectType, ModelType>[],
        shrinkResult: ShrinkResult
    ) {
        // shrink
        if (shrinkResult.isSuccessful) {
            const newError = new Error(
                'stateful property failed (args found by shrinking): ' +
                    JSONStringify(shrinkResult.initialObj) +
                    ', ' +
                    JSONStringify(shrinkResult.actions.map(shr => (shr as Shrinkable<{ name: string }>).value.name))
            )
            const shrinkError = shrinkResult.error as Error
            newError.message += '\n  shrink error: ' + shrinkError.message
            newError.stack = '\n' + shrinkError.stack
            newError.message +=
                '\n  original args: ' +
                JSONStringify(shrinkResult.initialObj) +
                ', ' +
                JSONStringify(originalActions.map(action => action.name))
            newError.message += '\n  original error: ' + originalError.message
            newError.message += '\n  original error stack: ' + originalError.stack
            return newError
        }
        // not shrunk
        else {
            const newError = new Error(
                'stateful property failed (args found): ' +
                    JSONStringify(shrinkResult.initialObj) +
                    ', ' +
                    JSONStringify(shrinkResult.actions)
            )
            newError.message += '\n  error: ' + originalError.message
            newError.stack = '\n' + originalError.stack
            return newError
        }
    }
}

/**
 * Builds a {@link StatefulProperty} with an explicit model: use when actions update both a real object and a reference model.
 *
 * @template ObjectType The system under test.
 * @template ModelType The model type (often a pure functional spec).
 */
export function statefulProperty<ObjectType, ModelType>(
    initialGen: Generator<ObjectType>,
    modelFactory: (_: ObjectType) => ModelType,
    actionGenFactory: ActionGenFactory<ObjectType, ModelType>
) {
    return new StatefulProperty(initialGen, modelFactory, actionGenFactory)
}

/**
 * Same as {@link statefulProperty} but with `EmptyModel`: actions are {@link SimpleAction}s wrapped via
 * {@link Action.fromSimpleAction}, so you only write object-only logic. Use for invariants or SUT-only state machines.
 *
 * @template ObjectType The system under test.
 */
export function simpleStatefulProperty<ObjectType>(
    initialGen: Generator<ObjectType>,
    simpleActionGenFactory: SimpleActionGenFactory<ObjectType>
) {
    const actionGenFactory = (obj: ObjectType, _: EmptyModel) => {
        return simpleActionGenFactory(obj).map(action => Action.fromSimpleAction<ObjectType, EmptyModel>(action))
    }
    const emptyModel: EmptyModel = {}
    const modelFactory = (_: ObjectType) => emptyModel
    return new StatefulProperty(initialGen, modelFactory, actionGenFactory)
}
