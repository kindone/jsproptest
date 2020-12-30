import { Generator } from './Generator';
import { Random } from './Random';
import { Shrinkable } from './Shrinkable';

type PropertyFunction<ARGS extends unknown[]> = (...args: ARGS) => boolean;
type PropertyFunctionVoid<ARGS extends unknown[]> = (...args: ARGS) => void;
// type Generatible<T> = { generate:Generator<T> }
// type Constructible<T, ARGS extends readonly unknown[]> = { new(_args:ARGS):T }
// type TupleElement<ARGS extends readonly unknown[], N extends number> = ARGS[N]
// type WithGenerate<T> = { generate(rand:Random):Shrinkable<number> }

// class PropertyFailedError extends Error{
//     constructor()
// }


class ShrinkResult {
    readonly isSucessful:boolean
    constructor(readonly args?:any[], readonly error?:object) {
        this.isSucessful = (typeof args !== 'undefined')
    }
}

export class Property<ARGS extends unknown[]> {
    private static defaultNumRuns = 100

    private numRuns = Property.defaultNumRuns

    constructor(readonly func: PropertyFunction<ARGS>|PropertyFunctionVoid<ARGS>) {}

    forAll<GENS extends Generator<unknown>[]>(...gens: GENS): boolean {
        var random = new Random();
        // console.log("func", this.func.length)
        // console.log("gens", gens)
        var result:boolean | object = true;
        for (let i = 0; i < this.numRuns; i++) {
            var savedRandom = random.clone()
            var shrinkables = gens.map((gen: Generator<unknown>) =>
                gen.generate(random)
            );
            // console.log("shrinkables", shrinkables)
            var args = shrinkables.map((shr: Shrinkable<unknown>) => shr.value);
            if (this.func.length !== args.length)
                throw new Error(
                    'forAll(): number of function parameters (' +
                        this.func.length +
                        ') != number of generators given (' +
                        args.length +
                        ')'
                );

            try {
                const func = this.func as PropertyFunction<ARGS>
                const maybe_result = func(...(args as ARGS))
                if(typeof maybe_result !== 'undefined')
                    result = maybe_result;
            } catch(e) {
                result = e
                // TODO print failed e and stack trace
            }
            // failed
            if(typeof(result) === 'object' || !result) {
                // shrink
                const shrinkResult = this.shrink(savedRandom, ...gens)
                if(shrinkResult.isSucessful)
                {
                    const newError = new Error("property failed (simplest args found by shrinking): " + shrinkResult.args)
                    const error =  (shrinkResult.error as Error)
                    newError.message += "\n  "// + error.message
                    newError.stack = error.stack
                    throw newError
                }
                // not shrunk
                else {
                    const newError = new Error("property failed (args found): " + shrinkResult.args)
                    if(typeof result === 'object') {
                        const error =  (result as Error)
                        newError.message += "\n  "// + error.message
                        newError.stack = error.stack
                        throw newError
                    }
                    else {
                        newError.message += "\n" + "property returned false\n"
                        Error.captureStackTrace(newError, this.forAll)
                        throw newError
                    }
                }
            }
        }
        return true
    }

    example(...args: ARGS): boolean {
        if (this.func.length !== args.length)
            throw new Error(
                'example(): number of function parameters (' +
                    this.func.length +
                    ') != number of arguments given (' +
                    args.length +
                    ')'
            )

        try {
            const func = this.func as PropertyFunction<ARGS>
            const maybe_result = func(...(args as ARGS))
            if(typeof maybe_result !== 'undefined')
                return maybe_result;
            else
                return true
        } catch(e) {
            return false
        }
    }

    setNumRuns(numRuns:number):Property<ARGS> {
        this.numRuns = numRuns
        return this
    }

    static setDefaultNumRuns(numRuns:number) {
        this.defaultNumRuns = numRuns
    }

    private shrink<GENS extends Generator<unknown>[]>(savedRandom:Random, ...gens: GENS):ShrinkResult {
        var shrinkables = gens.map((gen: Generator<unknown>) =>
            gen.generate(savedRandom)
        );

        var shrinkables = shrinkables.map((shr: Shrinkable<unknown>) => shr)
        const shrinkables_copy = shrinkables.concat()
        const args = shrinkables_copy.map((shr: Shrinkable<unknown>) => shr.value)
        let shrunk = false
        let test_result:boolean | object = true
        for(let n = 0; n < shrinkables_copy.length; n++) {
            let shrinks = shrinkables_copy[n].shrinks()
            while(!shrinks.isEmpty()) {
                let iter = shrinks.iterator()
                let shrinkFound = false
                while(iter.hasNext()) {
                    const next = iter.next()
                    test_result = this.testWithReplace(args, n, next.value)
                    if(typeof test_result !== 'boolean' || !test_result) {
                        shrinks = next.shrinks()
                        args[n] = next.value
                        shrinkFound = true
                        break
                    }
                }
                if(shrinkFound) {
                    shrunk = true
                }
                else
                    break
            }
        }
        if(shrunk) {
            if(typeof test_result === 'object') {
                // console.log('test_result.stack:')
                return new ShrinkResult(args, test_result)
            }
            else {
                const error = new Error('  property returned false\n')
                Error.captureStackTrace(error, this.forAll)
                return new ShrinkResult(args, error)
            }
        }
        else
            return new ShrinkResult()
    }

    private testWithReplace(args:unknown[], n:number, replace:unknown):boolean | object {
        const newArgs = [...args.slice(0, n), replace, ...args.slice(n+1)]
        return this.test(newArgs)
    }

    private test(args:unknown[]):boolean | object {
        if (this.func.length !== args.length)
            throw new Error(
                'forAll(): number of function parameters (' +
                    this.func.length +
                    ') != number of generators given (' +
                    args.length +
                    ')'
            );

        try {
            const func = this.func as PropertyFunction<ARGS>
            const maybe_result = func(...(args as ARGS))
            if(typeof maybe_result !== 'undefined')
                return maybe_result
            return true
        } catch(e) {
            return e
        }
    }
}

export function forAll<
    ARGS extends unknown[],
    GENS extends Generator<unknown>[]
>(func: PropertyFunction<ARGS>, ...gens: GENS): boolean {
    return new Property<ARGS>(func).forAll(...gens);
}
