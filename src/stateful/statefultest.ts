import { Generator } from '../Generator'
import { Random } from '../Random'
import { Shrinkable } from '../Shrinkable'
import { shrinkableArray } from '../shrinker/array'
import { Try, TryResult } from '../Try'
import { GenerationError } from '../util/error'
import { JSONStringify } from '../util/JSON'
import { ActionGenFactory, SimpleActionGenFactory } from './actionof'
import { Action, EmptyModel } from './statefulbase'

class ShrinkResult {
    readonly isSuccessful: boolean
    constructor(readonly initialObj: unknown, readonly actions: unknown[], readonly error?: object) {
        this.isSuccessful = typeof error !== 'undefined'
    }
}

class TestResult {
    constructor(readonly actions: Shrinkable<unknown>[], readonly randoms: Random[], readonly error: object) {}
}

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

    go() {
        if (this.minActions <= 0 || this.minActions > this.maxActions)
            throw new Error('invalid minSize or maxSize: ' + this.minActions + ', ' + this.maxActions)

        var rand = this.seed === '' ? new Random() : new Random(this.seed)

        for (let i = 0; i < this.numRuns; i++) {
            const savedRand = rand.clone()
            if (this.onStartup) this.onStartup()
            // generate initial object and model
            const [obj, model] = this.generateInitial(rand).getOrThrow()

            // actions executed so far
            const actionShrArr: Shrinkable<Action<ObjectType, ModelType>>[] = []
            const randomArr: Random[] = []
            const numActions = rand.interval(this.minActions, this.maxActions)
            let numConsecutiveFailures = 0
            for (let j = 0; j < numActions; ) {
                // one by one, generate action by calling actionGenFactory with current state
                let actionShr: Shrinkable<Action<ObjectType, ModelType>>
                try {
                    const randCopy = rand.clone()
                    actionShr = this.actionGenFactory(obj.value, model).generate(rand)
                    randomArr.push(randCopy)
                    actionShrArr.push(actionShr)
                } catch (e) {
                    // tolerate generation failures
                    // exception while generating action can happen: ignore and retry unless limit is reached
                    console.info('discarded action: ' + (e as Error).message)
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
                // execute the action to update obj and model
                try {
                    const action = actionShr.value
                    action.call(obj.value, model)
                    if (this.verbose) console.info('action generated. run: ', i, 'action: ', j)
                    j++
                } catch (e) {
                    // shrink based on actionShrArr
                    const originalActions = actionShrArr.map(actionShr => actionShr.value)
                    const shrinkResult = this.shrink(originalActions, savedRand, randomArr)
                    throw this.processFailureAsError(e as Error, originalActions, shrinkResult)
                }
            }
            if (this.postCheck) this.postCheck(obj.value, model)

            if (this.onCleanup) this.onCleanup()
        }
    }

    private shrink(
        originalActions: Action<ObjectType, ModelType>[],
        initialRand: Random,
        randomArr: Random[]
    ): ShrinkResult {
        if (originalActions.length != randomArr.length) throw new Error('action and random arrays have different sizes')

        let { shrunk, result } = this.shrinkRandomwise(initialRand, randomArr)
        if (shrunk) {
            result = this.shrinkInitialObject(initialRand, result!)
            //result = this.shrinkActionwise(initialRand, result!)
        }

        // initial object is the same regardless of shrinking, as current shrinking strategy does not alter initial object
        // (initial object is recreated in each test run)
        const initialObj = this.initialGen.generate(initialRand.clone()).value
        // shrinking done
        if (shrunk) {
            // if error was an exception object
            if (result instanceof TestResult) {
                const testResult: TestResult = result
                return new ShrinkResult(initialObj, testResult.actions, result)
            }
            // or it was a false
            else {
                const error = new Error('  action returned false\n')
                Error.captureStackTrace(error, this.go)
                return new ShrinkResult(initialObj, originalActions, error)
            }
        }
        // unable to shrink -> return originally failed combination
        else return new ShrinkResult(initialObj, originalActions)
    }

    private shrinkRandomwise(initialRand: Random, randomArr: Random[]): { shrunk: boolean; result?: TestResult } {
        const randomShrinkables: Shrinkable<Random>[] = randomArr.map(rand => new Shrinkable(rand))
        let nextArrayShr = shrinkableArray(randomShrinkables, 0)
        let shrinks = nextArrayShr.shrinks()
        let shrunk = false
        let result: TestResult | undefined
        while (!shrinks.isEmpty()) {
            let iter = shrinks.iterator()
            let shrinkFound = false
            while (iter.hasNext()) {
                nextArrayShr = iter.next()
                const testResult: boolean | TestResult = this.testWithRandoms(initialRand.clone(), nextArrayShr.value)
                // found a shrink (a non-generation error occurred)
                if (testResult instanceof TestResult) {
                    result = testResult
                    shrinks = nextArrayShr.shrinks()
                    shrinkFound = true
                } else if (testResult) {
                    // test succeeded
                } else {
                    // generation error
                }
            }
            if (shrinkFound) shrunk = true
            else break
        }

        return { shrunk, result }
    }

    /*
    private shrinkActionwise(initialRand: Random, prevTestResult: TestResult): TestResult {
        let nextArrayShr = shrinkableArray(prevTestResult.actions, 0)
        let shrinks = nextArrayShr.shrinks()
        let result: TestResult = prevTestResult
        while (!shrinks.isEmpty()) {
            let iter = shrinks.iterator()
            let shrinkFound = false
            while (iter.hasNext()) {
                nextArrayShr = iter.next()
                const testResult: boolean | TestResult = this.testWithActions(
                    initialRand.clone(),
                    nextArrayShr.value as Action<ObjectType, ModelType>[]
                )
                // found a shrink (a non-generation error occurred)
                if (testResult instanceof TestResult) {
                    result = testResult
                    shrinks = nextArrayShr.shrinks()
                    shrinkFound = true
                } else if (testResult) {
                    // test succeeded
                } else {
                    // generation error
                }
            }
            if (!shrinkFound) break
        }

        return result as TestResult
    }

    */

    private shrinkInitialObject(initialRand: Random, prevTestResult: TestResult): TestResult {
        const [obj, model] = this.generateInitial(initialRand.clone()).getOrThrow()
        return prevTestResult
    }

    /** test a action squence:
     * @return true iff action sequence is ok, false iff a generation error occurred, error iff a non-generation error occurred
     */
    private testWithRandoms(initialRand: Random, randoms: Random[]): boolean | TestResult {
        let actionShrs: Shrinkable<Action<ObjectType, ModelType>>[] = []
        try {
            if (this.onStartup) this.onStartup()

            const [obj, model] = this.generateInitial(initialRand.clone()).getOrThrow()

            for (const rand of randoms) {
                let action: Action<ObjectType, ModelType>
                try {
                    let actionShr = this.actionGenFactory(obj.value, model).generate(rand)
                    actionShrs.push(actionShr)
                    action = actionShr.value
                } catch (e) {
                    if (this.verbose)
                        console.info('failure in action generation during shrinking: ' + (e as Error).toString())
                    throw new GenerationError('failure in action generation during shrinking')
                }
                action.call(obj.value, model)
            }

            if (this.postCheck) this.postCheck(obj.value, model)
            if (this.onCleanup) this.onCleanup()
            return true
        } catch (e) {
            if (e instanceof GenerationError) return false

            return new TestResult(actionShrs, randoms, e as Error)
        }
    }

    private testWithActions(initialRand: Random, actions: Action<ObjectType, ModelType>[]): boolean | TestResult {
        let actionShrs: Shrinkable<Action<ObjectType, ModelType>>[] = []
        try {
            if (this.onStartup) this.onStartup()

            const [obj, model] = this.generateInitial(initialRand.clone()).getOrThrow()

            for (const action of actions) {
                action.call(obj.value, model)
            }

            if (this.postCheck) this.postCheck(obj.value, model)
            if (this.onCleanup) this.onCleanup()
            return true
        } catch (e) {
            if (e instanceof GenerationError) return false

            return new TestResult(actionShrs, [], e as Error)
        }
    }

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

    private generateInitial(initialRand: Random): TryResult<[Shrinkable<ObjectType>, ModelType]> {
        return Try<[Shrinkable<ObjectType>, ModelType]>(() => {
            const obj = this.initialGen.generate(initialRand.clone())
            const model = this.modelFactory(obj.value)
            return [obj, model]
        }).mapError(e => {
            if (this.verbose) console.info('failure in initialization: ' + (e as Error).toString())
            return new GenerationError('failure in initialization: ' + (e as Error).toString())
        })
    }
}

export function statefulProperty<ObjectType, ModelType>(
    initialGen: Generator<ObjectType>,
    modelFactory: (_: ObjectType) => ModelType,
    actionGenFactory: ActionGenFactory<ObjectType, ModelType>
) {
    return new StatefulProperty(initialGen, modelFactory, actionGenFactory)
}

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
