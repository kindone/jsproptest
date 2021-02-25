import { Generator, Arbitrary } from '../Generator';
import { WeightedValue, normalizeWeightedValues } from '../combinator/elementof'
import { Random } from '../Random';
import { Action, ActionGen, SimpleAction, SimpleActionGen } from './statefulbase';

export type SimpleActionGenFactory<ObjectType> = (obj:ObjectType) => Generator<SimpleAction<ObjectType>>
export type ActionGenFactory<ObjectType,ModelType> = (obj:ObjectType, model:ModelType) => Generator<Action<ObjectType,ModelType>>

export type SimpleActionGenOrFactory<ObjectType> = SimpleActionGenFactory<ObjectType> | SimpleActionGen<ObjectType>
export type ActionGenOrFactory<ObjectType,ModelType> = ActionGenFactory<ObjectType,ModelType> | ActionGen<ObjectType,ModelType>


function isActionGen<ObjectType,ModelType>(
    element: ActionGenOrFactory<ObjectType,ModelType>
): element is ActionGen<ObjectType,ModelType> {
    return (element as ActionGen<ObjectType,ModelType>).generate !== undefined;
}

function isSimpleActionGen<ObjectType>(
    element: SimpleActionGenOrFactory<ObjectType>
): element is SimpleActionGen<ObjectType> {
    return (element as SimpleActionGen<ObjectType>).generate !== undefined;
}

export function simpleActionGenOf<ObjectType>(
    ...simpleActionGenFactories: Array<SimpleActionGenOrFactory<ObjectType> | WeightedValue<SimpleActionGenOrFactory<ObjectType>>>
): SimpleActionGenFactory<ObjectType> {
    const weightedFactories = normalizeWeightedValues(simpleActionGenFactories)
    return (obj:ObjectType) => new Arbitrary<SimpleAction<ObjectType>>((rand: Random) => {
        while (true) {
            const dice = rand.inRange(0, weightedFactories.length);
            if (rand.nextBoolean(weightedFactories[dice].weight)) {
                const genOrFactory = weightedFactories[dice].value
                if(isSimpleActionGen(genOrFactory)) {
                    return genOrFactory.generate(rand)
                }
                else {
                    return genOrFactory(obj).generate(rand)
                }
            }
        }
    })
}

export function actionGenOf<ObjectType,ModelType>(
    ...actionGenFactories: Array<ActionGenOrFactory<ObjectType,ModelType> | WeightedValue<ActionGenOrFactory<ObjectType,ModelType>>>
): ActionGenFactory<ObjectType,ModelType> {
    const weightedFactories = normalizeWeightedValues(actionGenFactories)

    return (obj:ObjectType, model:ModelType) => new Arbitrary<Action<ObjectType,ModelType>>((rand: Random) => {
        while (true) {
            const dice = rand.inRange(0, weightedFactories.length);
            if (rand.nextBoolean(weightedFactories[dice].weight)) {
                const genOrFactory = weightedFactories[dice].value
                if(isActionGen(genOrFactory))
                    return genOrFactory.generate(rand)
                else {
                    return genOrFactory(obj, model).generate(rand)
                }
            }
        }
    })
}
