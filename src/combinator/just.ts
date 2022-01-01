import { Arbitrary, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'

export function just<T>(value: T): Generator<T> {
    return new Arbitrary<T>(() => new Shrinkable(value))
}
