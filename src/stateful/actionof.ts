import { Generator, Arbitrary } from '../Generator';
import { WeightedValue, normalizeWeightedValues } from '../combinator/elementof'
import { Random } from '../Random';
import { Action, SimpleAction } from './stateful';

export type SimpleActionGenFactory<ObjectType> = (obj:ObjectType) => Generator<SimpleAction<ObjectType>>
export type ActionGenFactory<ObjectType,ModelType> = (obj:ObjectType, model:ModelType) => Generator<Action<ObjectType,ModelType>>

export function simpleActionGenFactoryOf<ObjectType>(
    ...simpleActionGenFactories: Array<SimpleActionGenFactory<ObjectType> | WeightedValue<SimpleActionGenFactory<ObjectType>>>
): SimpleActionGenFactory<ObjectType> {
    const weightedFactories = normalizeWeightedValues(simpleActionGenFactories)
    return (obj:ObjectType) => new Arbitrary<SimpleAction<ObjectType>>((rand: Random) => {
        while (true) {
            const dice = rand.inRange(0, weightedFactories.length);
            if (rand.nextBoolean(weightedFactories[dice].weight)) {
                const factory = weightedFactories[dice].value
                return factory(obj).generate(rand)
            }
        }
    })
}

export function actionGenFactoryOf<ObjectType,ModelType>(
    ...actionGenFactories: Array<ActionGenFactory<ObjectType,ModelType> | WeightedValue<ActionGenFactory<ObjectType,ModelType>>>
): ActionGenFactory<ObjectType,ModelType> {
    const weightedFactories = normalizeWeightedValues(actionGenFactories)

    return (obj:ObjectType, model:ModelType) => new Arbitrary<Action<ObjectType,ModelType>>((rand: Random) => {
        while (true) {
            const dice = rand.inRange(0, weightedFactories.length);
            if (rand.nextBoolean(weightedFactories[dice].weight)) {
                const factory = weightedFactories[dice].value
                return factory(obj, model).generate(rand)
            }
        }
    })
}
