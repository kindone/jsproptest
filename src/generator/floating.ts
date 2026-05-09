import { Arbitrary, Generator } from '../Generator'
import { Random } from '../Random'
import { just } from '../combinator/just'
import { oneOf, weightedGen } from '../combinator/oneof'
import { shrinkableFloat } from '../shrinker/floating'

const floatBuffer = new ArrayBuffer(8)
const floatView = new DataView(floatBuffer)

/**
 * Configuration for {@link FloatingGen}.
 *
 * All probability values must be in [0.0, 1.0] and their sum must be ≤ 1.0.
 * The remaining probability mass (1.0 − sum) is used for finite value generation.
 *
 * @example
 * ```ts
 * // 5 % NaN, 2 % +Infinity, 2 % -Infinity, 91 % finite
 * Gen.float({ nanProb: 0.05, posInfProb: 0.02, negInfProb: 0.02 })
 * ```
 */
export interface FloatGenConfig {
    /** Probability of generating `NaN`. Default: 0.0 */
    nanProb?: number
    /** Probability of generating `Number.POSITIVE_INFINITY`. Default: 0.0 */
    posInfProb?: number
    /** Probability of generating `Number.NEGATIVE_INFINITY`. Default: 0.0 */
    negInfProb?: number
}

/**
 * Generates a finite IEEE-754 double by interpreting random bits as a number
 * and rejecting NaN/infinities.
 */
function nextFiniteDouble(random: Random): number {
    while (true) {
        floatView.setUint32(0, random.nextInt(0) >>> 0)
        floatView.setUint32(4, random.nextInt(0) >>> 0)
        const value = floatView.getFloat64(0)
        if (Number.isFinite(value)) return value
    }
}

/**
 * Base finite-only generator: generates finite IEEE-754 doubles shrinkable towards 0.
 */
function finiteFloatingGen(): Generator<number> {
    return new Arbitrary<number>((random: Random) => {
        const value = nextFiniteDouble(random)
        return shrinkableFloat(value)
    })
}

/**
 * Generates floating-point numbers. By default generates only finite IEEE-754 doubles.
 *
 * Pass a {@link FloatGenConfig} to control the probability of also generating
 * `NaN`, `Number.POSITIVE_INFINITY`, and `Number.NEGATIVE_INFINITY`.
 *
 * @param config Optional probability configuration for special float values.
 * @returns A Generator for floating-point numbers.
 *
 * @example
 * ```ts
 * Gen.float()                                           // finite only
 * Gen.float({ nanProb: 0.05 })                          // 5 % NaN, rest finite
 * Gen.float({ nanProb: 0.05, posInfProb: 0.02, negInfProb: 0.02 })
 * ```
 */
export function FloatingGen(config?: FloatGenConfig): Generator<number> {
    const nanProb    = config?.nanProb    ?? 0.0
    const posInfProb = config?.posInfProb ?? 0.0
    const negInfProb = config?.negInfProb ?? 0.0

    // Validate individual probabilities
    if (!Number.isFinite(nanProb)    || nanProb    < 0.0 || nanProb    > 1.0) throw new Error(`nanProb must be in [0.0, 1.0], got ${nanProb}`)
    if (!Number.isFinite(posInfProb) || posInfProb < 0.0 || posInfProb > 1.0) throw new Error(`posInfProb must be in [0.0, 1.0], got ${posInfProb}`)
    if (!Number.isFinite(negInfProb) || negInfProb < 0.0 || negInfProb > 1.0) throw new Error(`negInfProb must be in [0.0, 1.0], got ${negInfProb}`)

    const specialSum = nanProb + posInfProb + negInfProb
    if (specialSum > 1.0) throw new Error(`sum of nanProb + posInfProb + negInfProb must be ≤ 1.0, got ${specialSum}`)

    // Fast path: no special values requested
    if (specialSum === 0.0) return finiteFloatingGen()

    // Build weighted oneOf: special-value generators + finite generator for remainder
    const gens: Generator<number>[] = []
    if (nanProb    > 0.0) gens.push(weightedGen(just(NaN),                       nanProb))
    if (posInfProb > 0.0) gens.push(weightedGen(just(Number.POSITIVE_INFINITY),  posInfProb))
    if (negInfProb > 0.0) gens.push(weightedGen(just(Number.NEGATIVE_INFINITY),  negInfProb))
    const finiteProb = 1.0 - specialSum
    if (finiteProb > 0.0) gens.push(weightedGen(finiteFloatingGen(), finiteProb))

    return oneOf(...gens)
}
