import { Generator, Arbitrary } from '../Generator'
import { Random } from '../Random'
import { Shrinkable } from '../Shrinkable'

/**
 * Represents a value with an associated weight, used for weighted random selection.
 */
export class WeightedValue<T> {
    constructor(readonly value: T, readonly weight: number) {}
}

export function isWeighted<T>(element: WeightedValue<T> | T): element is WeightedValue<T> {
    return (element as WeightedValue<T>).weight !== undefined
}

export function weightedValue<T>(value: T, weight: number) {
    return new WeightedValue(value, weight)
}

/**
 * Takes an array of values or weighted values and returns an array of weighted values
 * where the weights are normalized to sum to 1.0. If some values are unweighted,
 * they are assigned equal portions of the remaining weight after accounting for
 * explicitly weighted values.
 */
export function normalizeWeightedValues<T>(arr: Array<T | WeightedValue<T>>): WeightedValue<T>[] {
    let sum = 0.0
    let numUnassigned = 0
    let weightedValues = arr.map(rawOrWeighted => {
        if (isWeighted(rawOrWeighted)) {
            sum += rawOrWeighted.weight
            return rawOrWeighted
        } else {
            numUnassigned++
            return new WeightedValue(rawOrWeighted, 0.0)
        }
    })

    // Validate the sum of explicitly assigned weights.
    if (sum < 0.0 || sum > 1.0) throw Error('invalid weights: sum must be between 0.0 (exclusive) and 1.0 (inclusive)')

    if (numUnassigned > 0) {
        const rest = 1.0 - sum
        if (rest <= 0.0) throw Error('invalid weights: rest of weights must be greater than 0.0')

        const perUnassigned = rest / numUnassigned
        weightedValues = weightedValues.map(weightedGenerator => {
            if (weightedGenerator.weight === 0.0) return new WeightedValue(weightedGenerator.value, perUnassigned)
            else return weightedGenerator
        })
    }
    return weightedValues
}

/**
 * Creates a generator that produces values randomly selected from the provided array,
 * respecting the weights if provided. Uses normalized weights to ensure fair selection.
 * @param values An array containing either plain values of type T or WeightedValue<T> objects.
 *               Weights should be between 0 and 1 (exclusive). If weights are provided, they don't need
 *               to sum to 1 initially; they will be normalized. Unweighted values will share
 *               the remaining probability mass equally.
 * @returns A Generator that produces values of type T based on the weighted distribution.
 */
export function elementOf<T>(...values: Array<T | WeightedValue<T>>): Generator<T> {
    const weightedValues = normalizeWeightedValues(values)

    return new Arbitrary<T>((rand: Random) => {
        while (true) {
            const dice = rand.inRange(0, weightedValues.length)
            if (rand.nextBoolean(weightedValues[dice].weight)) {
                return new Shrinkable(weightedValues[dice].value)
            }
        }
    })
}
