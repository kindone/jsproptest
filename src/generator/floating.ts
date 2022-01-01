import { Arbitrary, Generator } from '../Generator'
import { Random } from '../Random'
import { shrinkableFloat } from '../shrinker/floating'

export function FloatingGen(): Generator<number> {
    return new Arbitrary<number>((random: Random) => {
        const value = random.nextProb() * random.nextInt()
        return shrinkableFloat(value)
    })
}
