import { Arbitrary, Generator } from '../Generator';
import { Random } from '../Random';
import { generateInteger } from '../shrinker/integer';

export function interval(min: number, max: number): Generator<number> {
    return new Arbitrary((random: Random) => {
        return generateInteger(random, min, max);
    });
}

export function inRange(
    fromInclusive: number,
    toExclusive: number
): Generator<number> {
    return interval(fromInclusive, toExclusive - 1);
}

export function integers(start: number, count: number): Generator<number> {
    return inRange(start, start + count);
}
