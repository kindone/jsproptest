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
 * Orchestrates stateful property-based testing.
 * It generates an initial state, then a sequence of actions based on the current state,
 * executes these actions against both the real object and a model, and checks for discrepancies
 * or errors. If a failure occurs, it attempts to shrink the sequence of actions and the initial
 * state to find a minimal failing test case.
 *
 * @template ObjectType The type of the system under test.
 * @template ModelType The type of the model used for checking correctness.
 */
export class StatefulProperty<ObjectType, ModelType> {
    private seed: string = ''
    private numRuns = 100
    private minActions = 1
    private maxActions = 100
    private maxAllowedConsecutiveGenerationFailures = 20
    private verbose = false
    private onStartup?: () => void
    private onCleanup?: () => void
    private postCheck?: (obj: ObjectType, mdl: ModelType) => void

    constructor(
        readonly initialGen: Generator<ObjectType>,
        readonly modelFactory: (_: ObjectType) => ModelType,
        readonly actionGenFactory: ActionGenFactory<ObjectType, ModelType>
    ) {}

    setSeed(seed: string) {
        this.seed = seed
        return this
    }

    setNumRuns(numRuns: number) {
        this.numRuns = numRuns
        return this
    }

    setMinActions(num: number) {
        this.minActions = num
        return this
    }

    setMaxActions(num: number) {
        this.maxActions = num
        return this
    }

    setOnStartup(onStartup: () => void) {
        this.onStartup = onStartup
        return this
    }

    setOnCleanup(onCleanup: () => void) {
        this.onCleanup = onCleanup
        return this
    }

    setPostCheck(postCheck: (obj: ObjectType, mdl: ModelType) => void) {
        this.postCheck = postCheck
        return this
    }

    setPostCheckWithoutModel(postCheck: (obj: ObjectType) => void) {
        this.postCheck = (obj: ObjectType, _: ModelType) => postCheck(obj)
        return this
    }

    setVerbosity(verbose: boolean) {
        this.verbose = verbose
        return this
    }

    /**
     * Executes the stateful property test suite.
     * Runs `numRuns` test iterations. In each iteration:
     * 1. Generates an initial object and model.
     * 2. Generates a sequence of actions based on the evolving state.
     * 3. Executes each action, updating the object and model.
     * 4. If an action fails (throws an error), initiates the shrinking process.
     * 5. Performs a final check (if `postCheck` is set) after all actions complete.
     * 6. Calls cleanup hooks (`onCleanup`).
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
 * Factory function to create a `StatefulProperty` instance.
 *
 * @template ObjectType The type of the system under test.
 * @template ModelType The type of the model used for checking correctness.
 * @param initialGen Generator for the initial state of the object under test.
 * @param modelFactory Function to create the initial model state based on the initial object state.
 * @param actionGenFactory Factory to generate actions based on the current object and model state.
 * @returns A new `StatefulProperty` instance configured with the provided generators and factories.
 */
export function statefulProperty<ObjectType, ModelType>(
    initialGen: Generator<ObjectType>,
    modelFactory: (_: ObjectType) => ModelType,
    actionGenFactory: ActionGenFactory<ObjectType, ModelType>
) {
    return new StatefulProperty(initialGen, modelFactory, actionGenFactory)
}

/**
 * Factory function to create a `StatefulProperty` instance for cases where
 * no explicit model is needed (using an `EmptyModel`). Simplifies setup when
 * checks only involve the object under test or invariants.
 *
 * @template ObjectType The type of the system under test.
 * @param initialGen Generator for the initial state of the object under test.
 * @param simpleActionGenFactory Factory to generate actions based only on the current object state.
 * @returns A new `StatefulProperty` instance configured for model-less stateful testing.
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
