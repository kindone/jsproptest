import { Shrinkable } from '../Shrinkable'
import { Stream } from '../Stream'
import { binarySearchShrinkable } from './integer'

function getExponent(value: number) {
    const exponentialStr = value.toExponential().toString()
    const exponentStr = exponentialStr.split('e')[1]
    return parseInt(exponentStr)
}

function getMantissa(value: number) {
    const exponentialStr = value.toExponential().toString()
    const mantissaStr = exponentialStr.split('e')[0]
    return parseFloat(mantissaStr)
}

function shrinkableFloatStream(value: number): Stream<Shrinkable<number>> {
    if (value === 0.0) {
        return Stream.empty<Shrinkable<number>>()
    } else if (value === Number.NaN) {
        return Stream.one(new Shrinkable<number>(0.0))
    } else {
        var fraction = 0.0
        var exponent = 0
        if (value === Number.POSITIVE_INFINITY) {
            const max = Number.MAX_VALUE
            exponent = getExponent(max)
            fraction = getMantissa(max)
        } else if (value === Number.NEGATIVE_INFINITY) {
            const min = Number.MIN_VALUE
            exponent = getExponent(min)
            fraction = getMantissa(min)
        } else {
            exponent = getExponent(value)
            fraction = getMantissa(value)
        }

        const expShrinkable = binarySearchShrinkable(exponent)
        var doubleShrinkable = expShrinkable.map(exp => fraction * Math.pow(2.0, exp))
        // prepend 0.0
        doubleShrinkable = doubleShrinkable.with(() => {
            const zero = Stream.one(new Shrinkable(0.0))
            return zero.concat(Stream.one(doubleShrinkable))
        })

        doubleShrinkable = doubleShrinkable.andThen(shr => {
            const value = shr.value
            const exponent = getExponent(value)
            if (value === 0.0) return Stream.empty<Shrinkable<number>>()
            else if (value > 0) return Stream.one(new Shrinkable(0.5 * Math.pow(2.0, exponent)))
            else return Stream.one(new Shrinkable(-0.5 * Math.pow(2.0, exponent)))
        })

        doubleShrinkable = doubleShrinkable.andThen(shr => {
            const value = shr.value
            const intValue = value > 0 ? Math.floor(value) : Math.floor(value) + 1
            if (intValue !== 0 && Math.abs(intValue) < Math.abs(value)) return Stream.one(new Shrinkable(intValue))
            else return Stream.empty<Shrinkable<number>>()
        })
        return doubleShrinkable.shrinks()
    }
}

export function shrinkableFloat(value: number): Shrinkable<number> {
    return new Shrinkable(value).with(() => shrinkableFloatStream(value))
}
