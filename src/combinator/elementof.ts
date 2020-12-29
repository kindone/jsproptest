import { Generator,Arbitrary } from "../Generator";
import { Random } from "../Random";
import { Shrinkable } from "../Shrinkable";

// type GeneratorType<Gen> = Gen extends Generator<infer T> ? T : any

class WeightedValue<T> {
    constructor(readonly value:T, readonly weight:number) {
    }
}

function isWeighted<T>(element: WeightedValue<T> | T): element is WeightedValue<T> {
    return (element as WeightedValue<T>).weight !== undefined;
}

export function weightedValue<T>(value:T, weight:number) {
    return new WeightedValue(value, weight)
}

export function elementOf<T>(...values:Array<T|WeightedValue<T>>):Generator<T> {
    let sum = 0.0
    let numUnassigned = 0
    let weightedGenerators = values.map(value => {
        if(isWeighted(value)) {
            sum += value.weight
            return value
        }
        else {
            numUnassigned ++
            return new WeightedValue(value, 0.0)
        }
    })

    if(sum < 0.0 || sum >= 1.0)
        throw Error('invalid weights')

    if(numUnassigned > 0) {
        let rest = 1.0 - sum
        const perUnassigned = rest / numUnassigned
        weightedGenerators = weightedGenerators.map(weightedGenerator => {
            if(weightedGenerator.weight == 0.0)
                return new WeightedValue(weightedGenerator.value, perUnassigned)
            else
                return weightedGenerator
        })
    }

    return new Arbitrary<T>((rand:Random) => {
        while(true) {
            const dice = rand.inRange(0, weightedGenerators.length)
            if(rand.nextBoolean(weightedGenerators[dice].weight)) {
                return new Shrinkable(weightedGenerators[dice].value)
            }
        }
    })
}
