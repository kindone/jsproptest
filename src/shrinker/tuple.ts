import { Shrinkable } from '../Shrinkable'

/**
 * Extracts the value type `T` from a `Shrinkable<T>`.
 */
type ShrValueType<Shr> = Shr extends Shrinkable<infer T> ? T : never
/**
 * Transforms a tuple of `Shrinkable` types into a tuple of their underlying value types.
 * e.g., `[Shrinkable<A>, Shrinkable<B>]` becomes `[A, B]`.
 */
type ShrValueTypes<Shrs> = { [K in keyof Shrs]: ShrValueType<Shrs[K]> }
// [Shrinkable<A>, ..., Shrinkable<B>] => [Shrinkable<A>,...,Shrinkable<B>]
// type ShrinkablesTypeShrinkable<Shrs> = Shrinkable<{ [K in keyof Shrs]: ShrinkableType<Shrs[K]> }>

/**
 * Creates a `Shrinkable` tuple from a sequence of `Shrinkable` elements.
 * The shrinking process attempts to shrink each element of the tuple individually.
 * It starts by shrinking the first element, then the second, and so on.
 *
 * @template ShrinkableTuple - A tuple type where each element is a `Shrinkable`.
 * @param {...ShrinkableTuple} tuple - The sequence of `Shrinkable` elements forming the tuple.
 * @returns {Shrinkable<ShrValueTypes<ShrinkableTuple>>} A `Shrinkable` representing the tuple, whose value is the tuple of underlying types.
 */
export function shrinkableTuple<ShrinkableTuple extends Shrinkable<unknown>[]>(
    ...tuple: ShrinkableTuple
): Shrinkable<ShrValueTypes<ShrinkableTuple>> {
    // Base case: Start with shrinks of the first element, keeping others constant.
    let shrTuple = tuple[0].map(first => [new Shrinkable(first), ...tuple.slice(1)]) as Shrinkable<ShrinkableTuple>

    // Iteratively add shrinking strategies for subsequent elements.
    for (let i = 1; i < tuple.length; i++) {
        // For each element (from the second onwards), generate shrinks
        // by shrinking that element while keeping the previous elements fixed at their current value.
        shrTuple = shrTuple.concat(parent => {
            // Access the i-th shrinkable from the *parent's value* (the current tuple state)
            return parent.value[i].shrinks().transform(shr => {
                // Construct the new shrunk tuple: elements before i, the shrunk i-th element, elements after i
                const tup = [...parent.value.slice(0, i), shr, ...parent.value.slice(i + 1)]
                // Wrap the new tuple state in a Shrinkable
                return new Shrinkable(tup) as Shrinkable<ShrinkableTuple>
            })
        })
    }
    // Finally, map the Shrinkable<[Shrinkable<A>, Shrinkable<B>]> to Shrinkable<[A, B]>
    return shrTuple.map(tup => tup.map(shr => (shr as Shrinkable<unknown>).value) as ShrValueTypes<ShrinkableTuple>)
}
