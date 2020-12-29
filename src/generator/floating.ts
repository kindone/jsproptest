import { Arbitrary, Generator } from '../Generator';
import { Random } from '../Random';
import { shrinkableFloat } from '../shrinker/floating';

export function floatingGen(): Generator<number> {
    return new Arbitrary<number>((random: Random) => {
        const value = random.nextProb() * random.nextInt();
        return shrinkableFloat(value);
    });
}
