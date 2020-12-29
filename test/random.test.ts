import { Random } from '../src/Random';

function print<T>(gen: () => T, num: number = 20) {
    const arr = [];
    for (let i = 0; i < num; i++) arr.push('{' + gen() + '}');

    console.log(arr.toString());
}

describe('random', () => {
    it('next', () => {
        const rand: Random = new Random('0');
        print(() => rand.nextBoolean(0.1));
        print(() => rand.nextBoolean(0.2));
        print(() => rand.nextBoolean(0.5));
        print(() => rand.nextBoolean(0.9));
        print(() => rand.nextBoolean(1.0));
    });

    it('nextLong', () => {
        const rand: Random = new Random('0');
        print(() => rand.nextLong(), 50);
        print(() => Math.abs(rand.nextInt()) % 4, 50);
    });

    it('inRange', () => {
        const rand: Random = new Random('0');
        print(() => rand.inRange(0, 1));
        print(() => rand.inRange(0, 2));
        print(() => rand.inRange(0, 5));
        print(() => rand.inRange(0, 9));
        // print(() => rand.inRange(1, 0))
    });

    it('inRangeNextBoolean', () => {
        const rand: Random = new Random('0');
        print(() => [rand.inRange(0, 4), rand.nextBoolean(0.25)], 50);
    });

    it('clone', () => {
        const rand: Random = new Random('0');
        rand.nextBoolean()
        rand.nextInt()
        const copy1 = rand.clone()
        console.log(JSON.stringify(rand))
        console.log(JSON.stringify(copy1))
        const val1 = rand.nextNumber()
        rand.nextProb()
        const copy2 = rand.clone()
        const val2 = rand.nextLong()
        const copy1val1 = copy1.nextNumber()
        const copy2val2 = copy2.nextLong()
        expect(val1 == copy1val1)
        expect(val2 == copy2val2)
    })
});
