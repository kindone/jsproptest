import { Generator, Arbitrary } from '../Generator'
import { WeightedValue, normalizeWeightedValues } from '../combinator/elementof'
import { Random } from '../Random'
import { Action, ActionGen, SimpleAction, SimpleActionGen } from './statefulbase'

/**
 * Factory returning a generator for SimpleActions for a given object.
 * @template ObjectType The type of the object.
 */
export type SimpleActionGenFactory<ObjectType> = (obj: ObjectType) => Generator<SimpleAction<ObjectType>>

/**
 * Factory returning a generator for Actions for a given object and model.
 * @template ObjectType The type of the object.
 * @template ModelType The type of the model.
 */
export type ActionGenFactory<ObjectType, ModelType> = (
    obj: ObjectType,
    model: ModelType
) => Generator<Action<ObjectType, ModelType>>

/** Union of SimpleActionGenFactory and SimpleActionGen. */
export type SimpleActionGenOrFactory<ObjectType> = SimpleActionGenFactory<ObjectType> | SimpleActionGen<ObjectType>

/** Union of ActionGenFactory and ActionGen. */
export type ActionGenOrFactory<ObjectType, ModelType> =
    | ActionGenFactory<ObjectType, ModelType>
    | ActionGen<ObjectType, ModelType>

// Type guard for ActionGen (checks for generate method).
function isActionGen<ObjectType, ModelType>(
    element: ActionGenOrFactory<ObjectType, ModelType>
): element is ActionGen<ObjectType, ModelType> {
    return (element as ActionGen<ObjectType, ModelType>).generate !== undefined
}

// Type guard for SimpleActionGen (checks for generate method).
function isSimpleActionGen<ObjectType>(
    element: SimpleActionGenOrFactory<ObjectType>
): element is SimpleActionGen<ObjectType> {
    return (element as SimpleActionGen<ObjectType>).generate !== undefined
}

/**
 * Creates a SimpleActionGenFactory combining multiple weighted SimpleActionGen or SimpleActionGenFactory instances.
 *
 * @template ObjectType The type of the object.
 * @param simpleActionGenFactories Array of SimpleActionGen, SimpleActionGenFactory, or weighted versions.
 * @returns A SimpleActionGenFactory selecting based on weights.
 */
export function simpleActionGenOf<ObjectType>(
    ...simpleActionGenFactories: Array<
        SimpleActionGenOrFactory<ObjectType> | WeightedValue<SimpleActionGenOrFactory<ObjectType>>
    >
): SimpleActionGenFactory<ObjectType> {
    // Normalize weights.
    const weightedFactories = normalizeWeightedValues(simpleActionGenFactories)
    return (obj: ObjectType) =>
        new Arbitrary<SimpleAction<ObjectType>>((rand: Random) => {
            // Loop until an action is generated based on weight.
            while (true) {
                // Select a generator/factory index.
                const dice = rand.inRange(0, weightedFactories.length)
                // Check weight probability.
                if (rand.nextBoolean(weightedFactories[dice].weight)) {
                    const genOrFactory = weightedFactories[dice].value
                    // Generate action: directly if generator, via factory otherwise.
                    if (isSimpleActionGen(genOrFactory)) {
                        return genOrFactory.generate(rand)
                    } else {
                        return genOrFactory(obj).generate(rand)
                    }
                }
            }
        })
}

/**
 * Creates an ActionGenFactory combining multiple weighted ActionGen or ActionGenFactory instances.
 *
 * @template ObjectType The type of the object.
 * @template ModelType The type of the model.
 * @param actionGenFactories Array of ActionGen, ActionGenFactory, or weighted versions.
 * @returns An ActionGenFactory selecting based on weights.
 */
export function actionGenOf<ObjectType, ModelType>(
    ...actionGenFactories: Array<
        ActionGenOrFactory<ObjectType, ModelType> | WeightedValue<ActionGenOrFactory<ObjectType, ModelType>>
    >
): ActionGenFactory<ObjectType, ModelType> {
    // Normalize weights.
    const weightedFactories = normalizeWeightedValues(actionGenFactories)

    return (obj: ObjectType, model: ModelType) =>
        new Arbitrary<Action<ObjectType, ModelType>>((rand: Random) => {
             // Loop until an action is generated based on weight.
            while (true) {
                // Select a generator/factory index.
                const dice = rand.inRange(0, weightedFactories.length)
                 // Check weight probability.
                if (rand.nextBoolean(weightedFactories[dice].weight)) {
                    const genOrFactory = weightedFactories[dice].value
                    // Generate action: directly if generator, via factory otherwise.
                    if (isActionGen(genOrFactory)) {
                         return genOrFactory.generate(rand)
                    } else {
                        return genOrFactory(obj, model).generate(rand)
                    }
                }
            }
        })
}
