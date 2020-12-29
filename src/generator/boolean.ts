import { Arbitrary, Generator } from '../Generator';
import { Random } from '../Random';
import { shrinkableBoolean } from '../shrinker/boolean';

export function booleanGen(): Generator<boolean> {
    return new Arbitrary((random: Random) => {
        const value = random.nextBoolean();
        return shrinkableBoolean(value);
    });
}
