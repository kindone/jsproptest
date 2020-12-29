import { Random } from '../src/Random';
import { oneOf, weightedGen } from '../src/combinator/oneof';
import { construct } from '../src/combinator/construct';
import { elementOf, weightedValue } from '../src/combinator/elementof';
import { interval } from '../src/generator/integer';
import { Generator } from '../src/Generator';
import { exhaustive } from './testutil';

function print<T>(rand: Random, generator: Generator<T>, num: number = 50) {
    const arr = [];
    for (let i = 0; i < num; i++)
        arr.push('{' + generator.generate(rand).value + '}');

    console.log(arr.toString());
}

describe('combinator', () => {
    const rand = new Random('1');
    it('oneOf', () => {
        const numGen1 = interval(1, 3);
        const numGen2 = interval(6, 8);
        const gen1 = oneOf(numGen1, numGen2);
        print(rand, gen1);

        const gen2 = oneOf(weightedGen(numGen1, 0.8), numGen2);
        print(rand, gen2);
    });

    it('elementOf', () => {
        const gen1 = elementOf<number>(2, 10, -1, 7);
        print(rand, gen1);

        const gen2 = elementOf<number>(weightedValue(1, 0.8), 10);
        print(rand, gen2);
    });

    class Cat {
        constructor(readonly a: number, readonly b: string) {}

        toString(): string {
            return `a: ${this.a}, b: ${this.b}`;
        }
    }

    it('construct', () => {
        const catGen = construct(
            Cat,
            interval(1, 3),
            elementOf<string>('Cat', 'Kitten')
        );
        const cat = catGen.generate(rand).value;
        console.log('cat:', cat.a, cat.b);
        const catShr = catGen.generate(rand);
        exhaustive(catShr);
    });
});
