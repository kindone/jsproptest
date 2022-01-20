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
    constructor(readonly initialObj: unknown, readonly actions: unknown[], readonly error?: Error) {
        this.isSuccessful = typeof error !== 'undefined'
    }
}

class TestResult {
    constructor(
        readonly initialSteps: number[],
        readonly actions: Shrinkable<unknown>[],
        readonly randoms: Random[],
        readonly error: Error
    ) {}
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
                // one by one, generate action by calling actionGenFactory with current state
                let actionShr: Shrinkable<Action<ObjectType, ModelType>>
                try {
                    const randCopy = rand.clone()
                    actionShr = this.actionGenFactory(obj, model).generate(rand)
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

    private shrink(
        originalActions: Action<ObjectType, ModelType>[],
        initialRand: Random,
        randomArr: Random[],
        originalError: Error
    ): ShrinkResult {
        if (originalActions.length != randomArr.length) throw new Error('action and random arrays have different sizes')

        let { shrunk, result } = this.shrinkRandomwise(initialRand, randomArr)
        if (shrunk) {
            result = this.shrinkInitialObject(initialRand, result!)
            //result = this.shrinkActionwise(initialRand, result!)
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

        // initial object is the same regardless of shrinking, as current shrinking strategy does not alter initial object
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
                    break
                }
            }
            if (shrinkFound) shrunk = true
            else break
        }

        return { shrunk, result }
    }

    private shrinkInitialObject(initialRand: Random, prevTestResult: TestResult): TestResult {
        let shr = this.generateInitial(initialRand.clone()).getOrThrow()
        let shrinks = shr.shrinks()
        let result: TestResult = prevTestResult
        const steps: number[] = []
        while (!shrinks.isEmpty()) {
            let iter = shrinks.iterator()
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

    private testWithInitial(initialRand: Random, steps: number[], randoms: Random[]): boolean | TestResult {
        let actionShrs: Shrinkable<Action<ObjectType, ModelType>>[] = []
        try {
            if (this.onStartup) this.onStartup()

            // retrieve initial state by shrink steps chosen
            const { obj, model } = this.generateInitial(initialRand.clone())
                .map(shr => shr.retrieve(steps))
                .map(shr => {
                    return { obj: shr.value.obj, model: shr.value.model }
                })
                .getOrThrow()

            for (const rand of randoms) {
                let action: Action<ObjectType, ModelType>
                try {
                    let actionShr = this.actionGenFactory(obj, model).generate(rand)
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

    /** test a action squence:
     * @return true iff action sequence is ok, false iff a generation error occurred, error iff a non-generation error occurred
     */
    private testWithRandoms(initialRand: Random, randoms: Random[]): boolean | TestResult {
        let actionShrs: Shrinkable<Action<ObjectType, ModelType>>[] = []
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
                    let actionShr = this.actionGenFactory(obj, model).generate(rand)
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
