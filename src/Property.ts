import { Generator } from './Generator'
import { Random } from './Random'
import { Shrinkable } from './Shrinkable'


type PropertyFunction<ARGS extends unknown[]> = (...args:ARGS) => boolean
// type Generatible<T> = { generate:Generator<T> }
// type Constructible<T, ARGS extends readonly unknown[]> = { new(_args:ARGS):T }
// type TupleElement<ARGS extends readonly unknown[], N extends number> = ARGS[N]
// type WithGenerate<T> = { generate(rand:Random):Shrinkable<number> }


export class Property<ARGS extends unknown[]> {
    constructor(readonly func:PropertyFunction<ARGS>) {
    }

    forAll<GENS extends Generator<unknown>[]>(...gens:GENS):boolean {

        var random = new Random()
        // console.log("func", this.func.length)
        // console.log("gens", gens)
        var result = true
        for(let i = 0; i < 10; i ++) {
            var shrinkables = gens.map((gen:Generator<unknown>) => gen.generate(random))
            // console.log("shrinkables", shrinkables)
            var args = shrinkables.map((shr:Shrinkable<unknown>) => shr.value)
            if(this.func.length != args.length)
                throw 'forAll(): number of function parameters (' + this.func.length + ') != number of generators given (' + args.length + ')'
            result &&= this.func(...args as ARGS)
        }
        return result
    }

    example(...args:ARGS):boolean {
        if(this.func.length != args.length)
            throw 'example(): number of function parameters (' + this.func.length + ') != number of arguments given (' + args.length + ')'
        return this.func(...args as ARGS)
    }
}

export function forAll<ARGS extends unknown[], GENS extends Generator<unknown>[]>(func:PropertyFunction<ARGS>,  ...gens:GENS):boolean {
    return new Property<ARGS>(func).forAll(...gens)
}
