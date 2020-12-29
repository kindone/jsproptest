// import Rand from 'rand-seed'
import Rand from 'rand-seed';

export class Random {
    private rng: Rand;

    constructor(readonly seed: string = '') {
        this.rng = seed === '' ? new Rand() : new Rand(seed);
    }

    // FIXME: not an exact implementation [0,1) * N. How about some large number with same precisions?
    nextNumber(
        min: number = Number.MIN_SAFE_INTEGER,
        max: number = Number.MAX_SAFE_INTEGER
    ): number {
        return this.rng.next() * (max - min) + min;
    }

    nextProb(): number {
        return this.rng.next();
    }

    //FIXME: find good reason for reliable min and max
    nextLong(
        min: number = -2147483648 * 1000000,
        max: number = 2147483648 * 1000000
    ): number {
        return Math.floor(this.rng.next() * (max - min)) + min;
    }

    nextInt(min: number = -2147483648, max: number = 2147483647): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(this.rng.next() * (max - min)) + min;
    }

    nextBoolean(trueProb: number = 0.5): boolean {
        return this.inRange(0, 10000000000) < 10000000000 * trueProb;
    }

    interval(min: number, max: number): number {
        return min + (Math.abs(this.nextLong()) % (max + 1 - min));
    }

    inRange(fromInclusive: number, toExclusive: number): number {
        return (
            fromInclusive +
            (Math.abs(this.nextLong()) % (toExclusive - fromInclusive))
        );
    }

    intInterval(min: number, max: number): number {
        return min + (Math.abs(this.nextInt()) % (max + 1 - min));
    }

    intInRange(fromInclusive: number, toExclusive: number): number {
        return (
            fromInclusive +
            (Math.abs(this.nextInt()) % (toExclusive - fromInclusive))
        );
    }

    clone():Random {
        let newRand = new Rand(this.seed)
        newRand = Object.assign(newRand, JSON.parse(JSON.stringify(this.rng)) as Random)
        const newRandom = new Random(this.seed)
        newRandom.rng = newRand
        return this
    }
}
