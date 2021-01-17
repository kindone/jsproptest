import { Random } from '../src/Random';
import { FloatingGen } from '../src/generator/floating';
import { integers, interval } from '../src/generator/integer';
import { booleanGen } from '../src/generator/boolean';
import { stringGen, UnicodeStringGen } from '../src/generator/string';
import { ArrayGen } from '../src/generator/array';
import { SetGen } from '../src/generator/set';
import { DictionaryGen } from '../src/generator/dictionary';
import { TupleGen } from '../src/generator/tuple';
import { Generator } from '../src/Generator';
import { forAll } from '../src/Property';
import { JSONStringify } from '../src/util/JSON';
import { exhaustive } from './testutil';

function print<T>(rand: Random, generator: Generator<T>, num: number = 20) {
    const arr = [];
    for (let i = 0; i < num; i++)
        arr.push('{' + JSONStringify(generator.generate(rand).value) + '}');

    console.log(arr.toString());
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

    it('integer small', () => {
        const gen = interval(0, 1);
        print(rand, gen);
        for(let i = 0; i < 10; i++)
            exhaustive(gen.generate(rand))
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
        const elemGen = integers(0, 8);
        const gen = SetGen(elemGen, 4, 8);
        print(rand, gen);
        forAll((set:Set<number>) => {
            return set.size >= 4 && set.size <= 8
        }, gen)
        exhaustive(gen.generate(rand))
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

    it('dependent sequence with array', () => {
        const gengen = (n:number) => interval(n, n+1)
        let gen1 = gengen(0)//.map(num => [num])

        for(let i = 1; i< 20; i++)
            gen1 = gen1.flatMap(num => gengen(num))

        print(rand, gen1)
    })

    it('aggregate', () => {
        const gengen = (n:number) => interval(n, n+1)
        let gen1 = gengen(0).map(num => [num])

        const gen = gen1.aggregate(nums => gengen(nums[nums.length-1]).map(num => [...nums, num]), 2, 4)
        print(rand, gen)
        exhaustive(gen.generate(rand))
    })

    it('accumulate', () => {
        const gengen = (n:number) => interval(n, n+2)
        let gen1 = gengen(0)

        const gen = gen1.accumulate(num => gengen(num), 2, 4)
        print(rand, gen)
        for(let i = 0 ; i < 10; i++)
            exhaustive(gen.generate(rand))
    })

});
