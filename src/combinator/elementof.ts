import { Generator, Arbitrary } from '../Generator';
import { Random } from '../Random';
import { Shrinkable } from '../Shrinkable';

export class WeightedValue<T> {
    constructor(readonly value: T, readonly weight: number) {}
}

export function isWeighted<T>(
    element: WeightedValue<T> | T
): element is WeightedValue<T> {
    return (element as WeightedValue<T>).weight !== undefined;
}

export function weightedValue<T>(value: T, weight: number) {
    return new WeightedValue(value, weight);
}

export function normalizeWeightedValues<T>(arr:Array<T|WeightedValue<T>>):WeightedValue<T>[] {
    let sum = 0.0;
    let numUnassigned = 0;
    let weightedValues = arr.map(rawOrWeighted => {
        if (isWeighted(rawOrWeighted)) {
            sum += rawOrWeighted.weight;
            return rawOrWeighted;
        } else {
            numUnassigned++;
            return new WeightedValue(rawOrWeighted, 0.0);
        }
    });

    if (sum < 0.0 || sum >= 1.0) throw Error('invalid weights');

    if (numUnassigned > 0) {
        let rest = 1.0 - sum;
        const perUnassigned = rest / numUnassigned;
        weightedValues = weightedValues.map(weightedGenerator => {
            if (weightedGenerator.weight === 0.0)
                return new WeightedValue(
                    weightedGenerator.value,
                    perUnassigned
                );
            else return weightedGenerator;
        });
    }
    return weightedValues
}

export function elementOf<T>(
    ...values: Array<T | WeightedValue<T>>
): Generator<T> {
    const weightedValues = normalizeWeightedValues(values)

    return new Arbitrary<T>((rand: Random) => {
        while (true) {
            const dice = rand.inRange(0, weightedValues.length);
            if (rand.nextBoolean(weightedValues[dice].weight)) {
                return new Shrinkable(weightedValues[dice].value);
            }
        }
    });
}
