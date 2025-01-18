// import Rand from 'rand-seed'
import { MersenneTwister19937, int32, int53, real, bool } from 'random-js'

export class Random {
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
    static readonly INT_BOUNDS = [0, -128, 127, -32768, 32767, -2147483648, 2147483647]
    private mt: MersenneTwister19937

    constructor(readonly initialSeed: string = '', useCount: number = 0) {
        const autoSeed = MersenneTwister19937.autoSeed().next()
        if (initialSeed === '') this.mt = MersenneTwister19937.seed(autoSeed).discard(useCount)
        else this.mt = MersenneTwister19937.seed(Number.parseInt(this.initialSeed)).discard(useCount)
    }

    // FIXME: not an exact implementation [0,1) * N. How about some large number with same precisions?
    nextNumber(min: number = Number.MIN_SAFE_INTEGER, max: number = Number.MAX_SAFE_INTEGER): number {
        return real(min, max, true)(this.mt)
    }

    nextProb(): number {
        return real(0, 1, false)(this.mt)
    }

    //FIXME: find good reason for reliable min and max
    nextLong(boundProb = 0.2): number {
        // add boundary number generation with some probability
        if (this.nextBoolean(boundProb)) {
            return Random.LONG_BOUNDS[this.interval(0, Random.LONG_BOUNDS.length - 1)]
        }
        return int53(this.mt)
    }

    nextInt(boundProb = 0.2): number {
        // add integer boundary number generation with some probability
        if (this.nextBoolean(boundProb)) {
            return Random.INT_BOUNDS[this.interval(0, Random.INT_BOUNDS.length - 1)]
        } else return int32(this.mt)
    }

    nextBoolean(trueProb: number = 0.5): boolean {
        return bool(trueProb)(this.mt)
    }

    interval(min: number, max: number): number {
        // return integer(min, max)(this.mt)
        return this._interval(int53(this.mt), -0x20000000000000, 0x1fffffffffffff, min, max)
    }

    inRange(fromInclusive: number, toExclusive: number): number {
        return this.interval(fromInclusive, toExclusive - 1)
    }

    intInterval(min: number, max: number): number {
        return this._interval(int32(this.mt), -0x80000000, 0x7fffffff, min, max)
    }

    intInRange(fromInclusive: number, toExclusive: number): number {
        return this.intInterval(fromInclusive, toExclusive - 1)
    }

    clone(): Random {
        return new Random(this.initialSeed, this.mt.getUseCount())
    }

    _interval(genNum: number, genMin: number, genMax: number, min: number, max: number): number {
        if (genNum < genMin) throw new RangeError('genMin(' + genMin + ') greater than num(' + genNum + ')')
        if (genNum > genMax) throw new RangeError('num(' + genNum + ') greater than genMax(' + genMax + ')')
        if (genMin >= genMax) throw new RangeError('genMin(' + genMin + ') greater or equal to genMax(' + genMax + ')')

        if (min > max) throw new RangeError('min(' + min + ') greater or equal to max(' + max + ')')

        // min: 2 max: 3 num: 2 or 3
        // (2-2) / (3-2) = 0 / 1 = 0
        // (3-2) / (3-2) = 1 / 1 = 1
        // min: 2 max: 2 num: 2
        // (2-2) / (2-2) = 0/0
        const frac = (genNum - genMin) / (genMax - genMin)
        return Math.round(frac * (max - min) + min)
    }
}
