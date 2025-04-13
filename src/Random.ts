// import Rand from 'rand-seed'
import { MersenneTwister19937, int32, int53, real, bool } from 'random-js'

/**
 * Provides methods for generating pseudo-random numbers using the Mersenne Twister 19937 algorithm.
 * Allows seeding for reproducible sequences and cloning the generator state.
 */
export class Random {
    /**
     * Predefined boundary values useful for testing edge cases involving safe integers.
     */
    static readonly LONG_BOUNDS = [
        0,
        -128,
        127,
        -32768,
        32767,
        -2147483648,
        2147483647,
        Number.MIN_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
    ]
    /**
     * Predefined boundary values useful for testing edge cases involving 32-bit integers.
     */
    static readonly INT_BOUNDS = [0, -128, 127, -32768, 32767, -2147483648, 2147483647]
    private mt: MersenneTwister19937

    /**
     * Creates a new Random instance.
     * @param initialSeed Optional seed value. If empty, an auto-generated seed is used.
     * @param useCount Optional number of times the generator has been used, to restore state.
     */
    constructor(readonly initialSeed: string = '', useCount: number = 0) {
        if (initialSeed === '') {
            const autoSeed = MersenneTwister19937.autoSeed().next()
            this.mt = MersenneTwister19937.seed(autoSeed).discard(useCount)
            this.initialSeed = autoSeed.toString()
        }
        else this.mt = MersenneTwister19937.seed(Number.parseInt(this.initialSeed)).discard(useCount)
    }

    // FIXME: not an exact implementation [0,1) * N. How about some large number with same precisions?
    /**
     * Generates a random floating-point number within the specified range (inclusive).
     * Defaults to the range of `Number.MIN_SAFE_INTEGER` to `Number.MAX_SAFE_INTEGER`.
     * @param min The minimum value (inclusive).
     * @param max The maximum value (inclusive).
     * @returns A random number.
     */
    nextNumber(min: number = Number.MIN_SAFE_INTEGER, max: number = Number.MAX_SAFE_INTEGER): number {
        return real(min, max, true)(this.mt)
    }

    /**
     * Generates a random floating-point number between 0 (inclusive) and 1 (exclusive).
     * @returns A random probability value.
     */
    nextProb(): number {
        return real(0, 1, false)(this.mt)
    }

    //FIXME: find good reason for reliable min and max
    /**
     * Generates a random "long" (safe integer) number.
     * With a certain probability (`boundProb`), it returns a boundary value from `LONG_BOUNDS`.
     * Otherwise, it returns a random 53-bit integer.
     * @param boundProb The probability (0 to 1) of returning a boundary value. Defaults to 0.2.
     * @returns A random safe integer, potentially a boundary value.
     */
    nextLong(boundProb = 0.2): number {
        // add boundary number generation with some probability
        if (this.nextBoolean(boundProb)) {
            return Random.LONG_BOUNDS[this.interval(0, Random.LONG_BOUNDS.length - 1)]
        }
        return int53(this.mt)
    }

    /**
     * Generates a random 32-bit integer.
     * With a certain probability (`boundProb`), it returns a boundary value from `INT_BOUNDS`.
     * Otherwise, it returns a random 32-bit integer.
     * @param boundProb The probability (0 to 1) of returning a boundary value. Defaults to 0.2.
     * @returns A random 32-bit integer, potentially a boundary value.
     */
    nextInt(boundProb = 0.2): number {
        // add integer boundary number generation with some probability
        if (this.nextBoolean(boundProb)) {
            return Random.INT_BOUNDS[this.interval(0, Random.INT_BOUNDS.length - 1)]
        } else return int32(this.mt)
    }

    /**
     * Generates a random boolean value.
     * @param trueProb The probability (0 to 1) of returning `true`. Defaults to 0.5.
     * @returns A random boolean.
     */
    nextBoolean(trueProb: number = 0.5): boolean {
        return bool(trueProb)(this.mt)
    }

    /**
     * Generates a random safe integer within the specified inclusive interval [min, max].
     * Uses the underlying 53-bit integer generator.
     * @param min The minimum value (inclusive).
     * @param max The maximum value (inclusive).
     * @returns A random safe integer within the interval.
     */
    interval(min: number, max: number): number {
        // return integer(min, max)(this.mt)
        return this._interval(int53(this.mt), -0x20000000000000, 0x1fffffffffffff, min, max)
    }

    /**
     * Generates a random safe integer within the specified range [fromInclusive, toExclusive).
     * @param fromInclusive The minimum value (inclusive).
     * @param toExclusive The maximum value (exclusive).
     * @returns A random safe integer within the range.
     */
    inRange(fromInclusive: number, toExclusive: number): number {
        return this.interval(fromInclusive, toExclusive - 1)
    }

    /**
     * Generates a random 32-bit integer within the specified inclusive interval [min, max].
     * Uses the underlying 32-bit integer generator.
     * @param min The minimum value (inclusive).
     * @param max The maximum value (inclusive).
     * @returns A random 32-bit integer within the interval.
     */
    intInterval(min: number, max: number): number {
        return this._interval(int32(this.mt), -0x80000000, 0x7fffffff, min, max)
    }

    /**
     * Generates a random 32-bit integer within the specified range [fromInclusive, toExclusive).
     * @param fromInclusive The minimum value (inclusive).
     * @param toExclusive The maximum value (exclusive).
     * @returns A random 32-bit integer within the range.
     */
    intInRange(fromInclusive: number, toExclusive: number): number {
        return this.intInterval(fromInclusive, toExclusive - 1)
    }

    /**
     * Creates a clone of the current Random instance, preserving the generator state.
     * @returns A new Random instance with the same seed and usage count.
     */
    clone(): Random {
        return new Random(this.initialSeed, this.mt.getUseCount())
    }

    // Internal helper to map a generated number within its native range [genMin, genMax]
    // to a target range [min, max].
    _interval(genNum: number, genMin: number, genMax: number, min: number, max: number): number {
        if (genNum < genMin) throw new RangeError('genMin(' + genMin + ') greater than num(' + genNum + ')')
        if (genNum > genMax) throw new RangeError('num(' + genNum + ') greater than genMax(' + genMax + ')')
        if (genMin >= genMax) throw new RangeError('genMin(' + genMin + ') greater or equal to genMax(' + genMax + ')')

        if (min > max) throw new RangeError('min(' + min + ') greater or equal to max(' + max + ')')

        // Avoid division by zero if the generator range has only one value (shouldn't happen with MT)
        // or if the target range has only one value.
        if (genMin === genMax || min === max) {
            return min;
        }

        // min: 2 max: 3 num: 2 or 3
        // (2-2) / (3-2) = 0 / 1 = 0
        // (3-2) / (3-2) = 1 / 1 = 1
        // min: 2 max: 2 num: 2
        // (2-2) / (2-2) = 0/0
        const frac = (genNum - genMin) / (genMax - genMin)
        return Math.round(frac * (max - min) + min)
    }
}
