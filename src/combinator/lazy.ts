import { Arbitrary, Generator } from "../Generator";
import { Shrinkable } from "../Shrinkable";

export function lazy<T>(func:() => T):Generator<T> {
    return new Arbitrary<T>(() => new Shrinkable(func()))
}