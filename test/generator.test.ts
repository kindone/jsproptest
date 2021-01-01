import { Random } from '../src/Random';
import { FloatingGen } from '../src/generator/floating';
import { interval } from '../src/generator/integer';
import { booleanGen } from '../src/generator/boolean';
import { stringGen, UnicodeStringGen } from '../src/generator/string';
import { ArrayGen } from '../src/generator/array';
import { SetGen } from '../src/generator/set';
import { DictionaryGen } from '../src/generator/dictionary';
import { TupleGen } from '../src/generator/tuple';
import { Generator } from '../src/Generator';
import { exhaustive } from './testutil';

function print<T>(rand: Random, generator: Generator<T>, num: number = 20) {
    const arr = [];
    for (let i = 0; i < num; i++)
        arr.push('{' + generator.generate(rand).value + '}');

    console.log(arr.toString());
}

function getArrayFromSet<T>(set:Set<T>):Array<T>  {
    const arr = new Array<T>()
    set.forEach(function(item) {
        arr.push(item)
    })
    return arr
}

describe('generator', () => {
    const rand = new Random();
    it('floating', () => {
        const gen = FloatingGen();
        print(rand, gen);
    });

    it('integer', () => {
        const gen = interval(-10, 10);
        print(rand, gen);
    });

    it('string', () => {
        const gen1 = stringGen(0, 5);
        print(rand, gen1);
        exhaustive(gen1.generate(rand))

        const gen2 = UnicodeStringGen(0, 10);
        print(rand, gen2);
    });

    it('boolean', () => {
        const gen = booleanGen();
        print(rand, gen);
    });

    it('array', () => {
        const elemGen = interval(0, 4);
        const gen = ArrayGen(elemGen, 4, 8);
        print(rand, gen);
        exhaustive(gen.generate(rand))
    });

    it('set', () => {
        const elemGen = interval(0, 4);
        const gen = SetGen(elemGen, 4, 8);
        print(rand, gen.map(set => getArrayFromSet(set)));
        exhaustive(gen.generate(rand).map(set => getArrayFromSet(set)))
    });

    it('dictionary', () => {
        const elemGen = interval(0, 4);
        const gen = DictionaryGen(elemGen, 4, 8);
        print(rand, gen.map(dict => JSON.stringify(dict)));
        exhaustive(gen.generate(rand).map(dict => JSON.stringify(dict)))
    });

    it('tuple', () => {
        const numGen = interval(0, 3);
        const boolGen = booleanGen();
        const gen = TupleGen(numGen, boolGen);
        const [num, bool] = gen.generate(new Random('0')).value;
        console.log(num, bool);
    });

    it('tuple2', () => {
        const numGen = interval(0, 3);
        const gen = TupleGen(numGen, numGen);
        const shr = gen.generate(new Random('0'));
        exhaustive(shr);
    });
});
