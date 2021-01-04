import { Arbitrary, Generator } from '../Generator';
import { Random } from '../Random';
import { shrinkableBoolean } from '../shrinker/boolean';

export function booleanGen(trueProb = 0.5): Generator<boolean> {
    return new Arbitrary((random: Random) => {
        const value = random.nextBoolean(trueProb);
        return shrinkableBoolean(value);
    });
}
