import { Random } from '../src/Random';
import { FloatingGen } from '../src/generator/floating';
import { integers, interval } from '../src/generator/integer';
import { booleanGen } from '../src/generator/boolean';
import { stringGen, UnicodeStringGen } from '../src/generator/string';
import { ArrayGen } from '../src/generator/array';
import { SetGen } from '../src/generator/set';
import { DictionaryGen } from '../src/generator/dictionary';
import { TupleGen } from '../src/generator/tuple';
import { just } from '../src/combinator/just';
import { Generator } from '../src/Generator';
import { forAll } from '../src/Property';
import { JSONStringify } from '../src/util/JSON';
import { exhaustive } from './testutil';
import { Shrinkable } from '../src/Shrinkable';

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
        const elemGen = interval(0, 99);
        const gen = ArrayGen(elemGen, 5, 6);
        print(rand, gen);
        for(let i = 0; i < 3; i++) {
            const set:Set<string> = new Set([])
            let exhaustiveStr = ""
            // let numTotal = 0
            exhaustive(gen.generate(rand), 0, (shrinkable:Shrinkable<number[]>, _level:number) => {
                exhaustiveStr += "\n"
                for (let i = 0; i < _level; i++) exhaustiveStr += '  ';
                exhaustiveStr += JSONStringify(shrinkable.value)
                // numTotal ++

                const str = JSONStringify(shrinkable.value)
                if(set.has(str)) {
                    exhaustiveStr += " (already exists)"
                    // array can have duplicate values
                    // throw new Error(str + " already exists in: " + exhaustiveStr)
                }
                set.add(str)
            })
            console.log("exhaustive: " + exhaustiveStr)
        }
    });

    const combination = (n:number, r:number) => {
        let result = 1
        for(let i = 1; i <= r; i++) {
            result *= n--
            result /= i
        }
        return result
    }

    it('util.combination', () => {
        // can fail with n >= 67
        const pairGen = interval(1, 30).chain((n:number) => interval(0, n))
        forAll((n_and_r:[number, number]) => {
            const n = n_and_r[0]
            const r = n_and_r[1]
            const result = combination(n, r)
            expect(Math.floor(result)).toBe(result)
        }, pairGen)
    })

    it('set_shrink', () => {

        // test if set/array shrinking is thorough and unique
        // it must cover all combinations and never repeated

        const sumCombinations = (n:number, maxR:number) => {
            if(maxR < 0)
                return 0
            let result = 0
            for(let r = 0; r <= maxR; r++)
                result += combination(n, r)
            return result
        }

        const minAndMaxSizeGen = interval(0, 10).chain((n:number) => interval(n, 10))
        forAll((minAndMaxSize:[number, number]) => {
            const elemGen = interval(0, 99);
            const minSize = minAndMaxSize[0]
            const maxSize = minAndMaxSize[1]
            const gen = SetGen(elemGen, minSize, maxSize);
            // print(rand, gen);
            for(let i = 0; i < 3; i++) {
                const set:Set<string> = new Set([])
                let exhaustiveStr = ""
                let numTotal = 0
                const root = gen.generate(rand)
                exhaustive(root, 0, (shrinkable:Shrinkable<Set<number>>, _level:number) => {
                    exhaustiveStr += "\n"
                    for (let i = 0; i < _level; i++) exhaustiveStr += '  ';
                    exhaustiveStr += JSONStringify(shrinkable.value)
                    numTotal ++

                    const str = JSONStringify(shrinkable.value)
                    if(set.has(str)) {
                        throw new Error(str + " already exists in: " + exhaustiveStr)
                    }
                    set.add(str)
                })
                const size = root.value.size
                // console.log('rootSize: ' + size + ", minSize: " + minSize + ", total: " + numTotal + ", pow: " + Math.pow(2, size) + ", minus: " + sumCombinations(size, minSize-1))
                // console.log("exhaustive: " + exhaustiveStr)
                expect(numTotal).toBe(Math.pow(2, size) - sumCombinations(size, minSize-1))
            }
        }, minAndMaxSizeGen)
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

    it('big tuple', () => {
        const numGen = interval(0, 3);
        const gens:Generator<number>[] = []
        for(let i = 0; i < 800; i++)
            gens.push(numGen)
        const gen = TupleGen(...gens);
        console.log(JSONStringify(gen.generate(new Random('0')).value));
    });

    it('flatMap', () => {
        const numGen = interval(0, 3);
        const tupleGen = numGen.flatMap(n => TupleGen(just(n), just(2).map(v => v*n)))
        for(let i = 0; i < 3; i++)
            exhaustive(tupleGen.generate(rand))
    })

    it('dependent sequence with array', () => {
        const gengen = (n:number) => interval(n, n+1)
        let gen1 = gengen(0)//.map(num => [num])

        for(let i = 1; i< 20; i++)
            gen1 = gen1.flatMap(num => gengen(num))

        print(rand, gen1)
    })

    it('aggregate', () => {
        // const gengen = (n:number) => interval(n, n+1)
        let gen1 = interval(0, 1).map(num => [num])

        const gen = gen1.aggregate(nums => {
            const last = nums[nums.length-1]
            return interval(last, last+1).map(num => [...nums, num])
        }, 2, 4)
        print(rand, gen)
        exhaustive(gen.generate(rand))
    })

    it('accumulate', () => {
        let gen1:Generator<number> = interval(0, 0+2)

        const gen:Generator<number[]> = gen1.accumulate(num => interval(num, num+2), 2, 4)
        print(rand, gen)
        for(let i = 0 ; i < 10; i++)
            exhaustive(gen.generate(rand))
    })

});
