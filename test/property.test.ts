import { Arbitrary } from '../src/Generator';
import { interval } from '../src/generator/integer';
import { Property } from '../src/Property';
import { Random } from '../src/Random';
import { Shrinkable } from '../src/Shrinkable';

describe('property', () => {
    it('basic with return', () => {
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

    it('basic without return', () => {
        const genNumber = new Arbitrary((random: Random) => {
            return new Shrinkable<number>(random.nextInt());
        });

        const arr: Array<Array<number>> = [];
        const prop = new Property((a: number, b: number) => {
            arr.push([a, b]);
        });

        prop.forAll(genNumber, genNumber);
        prop.example(6, 7);

        console.log(arr.toString())
    });

    it('shrink',  () => {

        const numGen = interval(0, 1000)
        const prop = new Property((a: number, b: number) => {
            return a > 80 || b < 40
        });

        prop.forAll(numGen, numGen)
    })

    it('shrink2',  () => {
        const numGen = interval(0, 1000)
        const prop = new Property((a: number, b: number) => {
            expect(a > 80 || b < 40).toBe(true)
        });

        prop.forAll(numGen, numGen)
    })
});
