namespace proptest {

class Random {
}

class Shrinkable<T> {
    constructor(readonly value:T) {}
}


type Property<ARGS extends unknown[]> = (...args:ARGS) => boolean
type Generator<ARG> = (rand:Random) => Shrinkable<ARG>

function forAll<ARGS extends unknown[], GENS extends Generator<unknown>[]>(property:Property<ARGS>,  ...gens:GENS):void {
    var random = new Random()
    var shrinkables = gens.map((gen:Generator<unknown>) => gen(random))
    console.log("property", property.length)
    console.log("gens", gens)
    console.log("shrinkables", shrinkables)
    var args = shrinkables.map((shr:Shrinkable<unknown>) => shr.value)
    if(gens.length < property.length)
    {
        // TODO
    }

    property(...args as ARGS)
}

forAll((a:number) => {
    console.log("hello", a)
    return true;
}, (_random:Random) => new Shrinkable<number>(5))

} // namespace proptest

