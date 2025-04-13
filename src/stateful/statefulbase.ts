import { Generator } from '../Generator'
import { ArrayGen } from '../generator/array'
import { TupleGen } from '../generator/tuple'
import { Property } from '../Property'

/**
 * Represents a simple action that can be performed on an object.
 * It doesn't involve a model.
 * @template ObjectType The type of the object the action acts upon.
 */
export class SimpleAction<ObjectType> {
    /**
     * @param func The function to execute when the action is called.
     * @param name An optional name for the action, used for reporting.
     */
    constructor(readonly func: (obj: ObjectType) => void, readonly name = 'unnamed') {}

    /** Calls the underlying function with the given object. */
    call(obj: ObjectType) {
        this.func(obj)
    }

    /** Returns the name of the action. */
    toString() {
        return this.name
    }
}

/**
 * Represents an action that involves both a real object and a model.
 * Used for stateful property-based testing to compare system-under-test and model states.
 * @template ObjectType The type of the real object.
 * @template ModelType The type of the model object.
 */
export class Action<ObjectType, ModelType> {
    /**
     * Creates an `Action` from a `SimpleAction`, ignoring the model.
     * @param simpleAction The simple action to convert.
     * @returns A new `Action` instance.
     */
    static fromSimpleAction<ObjectType, ModelType>(simpleAction: SimpleAction<ObjectType>) {
        return new Action((object: ObjectType, _: ModelType) => simpleAction.call(object), simpleAction.name)
    }

    /**
     * @param func The function to execute, taking both the object and the model.
     * @param name An optional name for the action.
     */
    constructor(readonly func: (obj: ObjectType, mdl: ModelType) => void, readonly name = 'unnamed') {}

    /** Calls the underlying function with the object and model. */
    call(obj: ObjectType, mdl: ModelType) {
        this.func(obj, mdl)
    }

    /** Returns the name of the action. */
    toString() {
        return this.name
    }
}

/** A generator for `SimpleAction` instances. */
export type SimpleActionGen<ObjectType> = Generator<SimpleAction<ObjectType>>
/** A generator for `Action` instances involving an object and a model. */
export type ActionGen<ObjectType, ModelType> = Generator<Action<ObjectType, ModelType>>

/** Represents an empty model, often used when no model is needed. */
export type EmptyModel = {} // eslint-disable-line @typescript-eslint/no-empty-object-type

/**
 * DEPRECATED: Facilitates stateful property-based testing by generating sequences of actions
 * and verifying system behavior against a model.
 * @template ObjectType The type of the system under test.
 * @template ModelType The type of the model used for verification.
 *
 * @deprecated Use the newer StatefulProperty implementation if available.
 */
export class StatefulPropertyDeprecated<ObjectType, ModelType> {
    private seed: string = ''
    private numRuns = 0
    private onStartup?: () => void
    private onCleanup?: () => void
    private postCheck?: (obj: ObjectType, mdl: ModelType) => void

    /**
     * @param initialGen Generator for the initial state of the object under test.
     * @param modelFactory Function to create a model instance based on the initial object state.
     * @param actionGen Generator for sequences of actions to apply.
     */
    constructor(
        readonly initialGen: Generator<ObjectType>,
        readonly modelFactory: (_: ObjectType) => ModelType,
        readonly actionGen: Generator<Action<ObjectType, ModelType>>
    ) {}

    /** Sets the seed for the random number generator. */
    setSeed(seed: string) {
        this.seed = seed
        return this
    }

    /** Sets the number of test runs to execute. */
    setNumRuns(numRuns: number) {
        this.numRuns = numRuns
        return this
    }

    /** Sets a function to run once before all tests. */
    setOnStartup(onStartup: () => void) {
        this.onStartup = onStartup
        return this
    }

    /** Sets a function to run once after all tests. */
    setOnCleanup(onCleanup: () => void) {
        this.onCleanup = onCleanup
        return this
    }

    /**
     * Sets a function to run after each sequence of actions,
     * comparing the object and the model.
     */
    setPostCheck(postCheck: (obj: ObjectType, mdl: ModelType) => void) {
        this.postCheck = postCheck
        return this
    }

    /** Sets a post-check function that only considers the object, ignoring the model. */
    setPostCheckWithoutModel(postCheck: (obj: ObjectType) => void) {
        this.postCheck = (obj: ObjectType, _: ModelType) => postCheck(obj)
        return this
    }

    /**
     * Configures and runs the stateful property test.
     * It generates initial states and action sequences, executes them on both
     * the object and the model, and performs checks.
     */
    go() {
        // Define the structure needed for the underlying Property test
        type StatefulArgs = { initial: ObjectType; actions: Array<Action<ObjectType, ModelType>> }
        // Generate arrays of actions (0 to 100 actions per run)
        const actionArrayGen = ArrayGen(this.actionGen, 0, 100)
        // Combine the initial object generator and action array generator
        const tupleGen = TupleGen(this.initialGen, actionArrayGen).map(tuple => {
            return { initial: tuple[0], actions: tuple[1] }
        })

        // Create the core property test
        const prop = new Property<[StatefulArgs]>((statefulArgs: StatefulArgs) => {
            const obj = statefulArgs.initial
            const actions = statefulArgs.actions
            // Create the model based on the initial object state
            const model = this.modelFactory(obj)
            // Apply each action to both the object and the model
            actions.map(action => action.call(obj, model))
            // Perform the post-check if defined
            if (this.postCheck) this.postCheck(obj, model)
            return true // Property holds if no exception is thrown
        })

        // Apply optional configurations
        if (this.onStartup) prop.setOnStartup(this.onStartup)

        if (this.onCleanup) prop.setOnCleanup(this.onCleanup)

        if (this.seed !== '') prop.setSeed(this.seed)

        if (this.numRuns !== 0) prop.setNumRuns(this.numRuns)

        // Run the property test
        prop.forAll(tupleGen)
    }
}
