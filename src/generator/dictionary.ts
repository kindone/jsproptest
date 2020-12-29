import { ArbiContainer, Generator } from "../Generator";
import { Shrinkable } from "../Shrinkable";
import { Dictionary, shrinkableDictionary } from "../shrinker/dictionary";
import { stringGen } from "./string";

export function DictionaryGen<T>(elemGen:Generator<T>, minSize:number, maxSize:number):Generator<Dictionary<T>> {
    return new ArbiContainer<Dictionary<T>>(rand => {
        const size = rand.interval(minSize, maxSize)
        const dict:Dictionary<Shrinkable<T>> = {}
        const strGen = stringGen(1,2)
        while(Object.keys(dict).length < size) {
            const strShr = strGen.generate(rand)
            if(!dict[strShr.value])
                dict[strShr.value] = elemGen.generate(rand)
        }

        return shrinkableDictionary(dict, minSize)
    })
}