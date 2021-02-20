import { Arbitrary, Generator } from "../Generator";
import { Random } from "../Random";
import { Shrinkable } from "../Shrinkable";

export function chainTuple<Ts extends any[], U>(tupleGen:Generator<Ts>, genFactory:(arg:Ts) => Generator<U>):Generator<[...Ts, U]> {
    return new Arbitrary<[...Ts,U]>((rand:Random) => {
        const intermediate:Shrinkable<[...Ts, Shrinkable<U>]> = tupleGen.generate(rand).map(tuple => [...tuple, genFactory(tuple).generate(rand)] as [...Ts, Shrinkable<U>])
        return intermediate.andThen(interShr => {
            const head = interShr.value.slice(0, interShr.value.length-1) as Ts
            const tail = interShr.value[interShr.value.length-1] as Shrinkable<U>
            return tail.flatMap<[...Ts, Shrinkable<U>]>(second =>
                new Shrinkable([...head, new Shrinkable(second)])
            ).shrinks()
        }).map(tupleWithShrU => [...(tupleWithShrU.slice(0, tupleWithShrU.length-1) as Ts), tupleWithShrU[tupleWithShrU.length-1].value as U])
    })
}