import { Arbitrary } from '../src/Generator';
import { interval } from '../src/generator/integer';
import { stringGen } from '../src/generator/string';
import { TupleGen } from '../src/generator/tuple';
import { just } from '../src/combinator/just';
import { Property } from '../src/Property';
import { Random } from '../src/Random';
import { Shrinkable } from '../src/Shrinkable';

describe('property', () => {
    it('regression 1: no shrinking possible', () => {
        const prop = new Property((a:number, b:string) => {
            return a < 10 || b.length > 3
        })

        expect(() => prop.forAll(interval(0,10), stringGen(0, 10))).toThrow()
    })

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

        expect(() => prop.forAll(numGen, numGen)).toThrow()
    })

    it('shrink2',  () => {
        const numGen = interval(0, 1000)
        const prop = new Property((a: number, b: number) => {
            expect(a > 80 || b < 40).toBe(true)
        });

        expect(() => prop.forAll(numGen, numGen)).toThrow()
    })

    it('shrink3',  () => {
        const prop = new Property((arg:[a:number, b:number]) => arg[1] - arg[0] <= 5)
        const numGen = interval(-1000000, 1000000)
        const tupleGen = numGen.flatMap(num => TupleGen(numGen, just(num)))
        expect(() => prop.forAll(tupleGen)).toThrow()
    })
});
