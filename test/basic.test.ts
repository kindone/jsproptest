import { Arbitrary } from '../src/Generator';
import { Property } from '../src/Property';
import { Random } from '../src/Random';
import { Shrinkable } from '../src/Shrinkable';

describe('property', () => {
    it('basic', () => {
        const genNumber = new Arbitrary((random: Random) => {
            return new Shrinkable<number>(random.nextInt());
        });

        const arr: Array<Array<number>> = [];
        const prop = new Property((a: number, b: number) => {
            arr.push([a, b]);
            return true;
        });

        prop.forAll(genNumber, genNumber);
        prop.example(6, 7);

        console.log(arr.toString());
    });
});
