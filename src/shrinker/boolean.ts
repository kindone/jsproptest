/**
 * @module shrinker/boolean
 * Provides shrinking capabilities for boolean values.
 * The shrinking strategy for booleans is straightforward: `true` shrinks to `false`, and `false` does not shrink further.
 */
import { Shrinkable } from '../Shrinkable'
import { Stream } from '../Stream'

/**
 * Creates a Shrinkable instance for a boolean value.
 *
 * @param value - The boolean value to make shrinkable.
 * @returns A Shrinkable instance representing the boolean value.
 */
export function shrinkableBoolean(value: boolean): Shrinkable<boolean> {
    if (value) {
        // If the value is true, it can shrink to false.
        const stream = Stream.one(new Shrinkable<boolean>(false))
        return new Shrinkable<boolean>(value).with(() => stream)
    } else {
        // If the value is false, it cannot shrink further.
        return new Shrinkable(value)
    }
}
