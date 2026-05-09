import { Shrinkable } from '../Shrinkable'
import { Stream } from '../Stream'
import { binarySearchShrinkable } from './integer'

/**
 * Decomposes a floating point number into a fraction and exponent (base 2).
 * Similar to C++ frexp. Returns the fraction in [0.5, 1.0) or (-1.0, -0.5] and the exponent.
 * @param value The floating point number to decompose
 * @returns An object with fraction and exponent such that value = fraction * 2^exponent
 */
function decomposeFloat(value: number): { fraction: number; exponent: number } {
    if (value === 0.0 || !Number.isFinite(value)) {
        return { fraction: value, exponent: 0 }
    }

    // Extract the sign
    const sign = value < 0 ? -1 : 1
    const absValue = Math.abs(value)

    // Use Math.log2 to get the exponent
    const log2 = Math.log2(absValue)
    const exponent = Math.floor(log2) + 1
    const fraction = absValue * Math.pow(2, -exponent) * sign

    // Normalize fraction to be in [0.5, 1.0) or (-1.0, -0.5]
    // Math.log2 might give slightly off results due to floating point precision,
    // so we recompute to ensure exact decomposition
    const recomputed = fraction * Math.pow(2, exponent)
    if (Math.abs(recomputed - value) > 1e-10) {
        // Fallback: recompute exactly
        const exactExp = Math.floor(Math.log2(absValue)) + 1
        const exactFrac = absValue * Math.pow(2, -exactExp) * sign
        return { fraction: exactFrac, exponent: exactExp }
    }

    return { fraction, exponent }
}

/**
 * Composes a floating point number from fraction and exponent (base 2).
 * Similar to C++ ldexp. Returns fraction * 2^exponent.
 */
function composeFloat(fraction: number, exponent: number): number {
    return fraction * Math.pow(2.0, exponent)
}

function shrinkableFloatStream(value: number): Stream<Shrinkable<number>> {
    if (value === 0.0) {
        return Stream.empty<Shrinkable<number>>()
    } else if (Number.isNaN(value)) {
        return Stream.one(new Shrinkable<number>(0.0))
    } else {
        let fraction = 0.0
        let exponent = 0
        if (value === Number.POSITIVE_INFINITY) {
            const max = Number.MAX_VALUE
            const decomposed = decomposeFloat(max)
            fraction = decomposed.fraction
            exponent = decomposed.exponent
        } else if (value === Number.NEGATIVE_INFINITY) {
            const min = -Number.MAX_VALUE
            const decomposed = decomposeFloat(min)
            fraction = decomposed.fraction
            exponent = decomposed.exponent
        } else {
            const decomposed = decomposeFloat(value)
            fraction = decomposed.fraction
            exponent = decomposed.exponent
        }

        const expShrinkable = binarySearchShrinkable(exponent)
        // shrink exponent
        let doubleShrinkable = expShrinkable.map(exp => composeFloat(fraction, exp))

        // prepend 0.0
        // Note: capture shrinks() before reassigning doubleShrinkable to match C++ behavior
        const shrinksStream = doubleShrinkable.shrinks()
        doubleShrinkable = doubleShrinkable.with(() => {
            return Stream.one(new Shrinkable(0.0)).concat(shrinksStream)
        })

        // shrink fraction within (0.0 and 0.5)
        doubleShrinkable = doubleShrinkable.andThen(shr => {
            const value = shr.value
            if (value === 0.0) return Stream.empty<Shrinkable<number>>()
            const decomposed = decomposeFloat(value)
            const exp = decomposed.exponent
            if (value > 0) {
                return Stream.one(new Shrinkable(composeFloat(0.5, exp)))
            } else {
                return Stream.one(new Shrinkable(composeFloat(-0.5, exp)))
            }
        })

        // integerfy
        doubleShrinkable = doubleShrinkable.andThen(shr => {
            const value = shr.value
            const intValue = value > 0 ? Math.floor(value) : Math.ceil(value)
            if (intValue !== 0 && Math.abs(intValue) < Math.abs(value)) {
                return Stream.one(new Shrinkable(intValue))
            } else {
                return Stream.empty<Shrinkable<number>>()
            }
        })
        return doubleShrinkable.shrinks()
    }
}

export function shrinkableFloat(value: number): Shrinkable<number> {
    return new Shrinkable(value).with(() => shrinkableFloatStream(value))
}
