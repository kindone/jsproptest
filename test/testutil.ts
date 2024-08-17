import { Shrinkable } from '../src/Shrinkable'
import { JSONStringify } from '../src/util/JSON'

function print<T>(shrinkable: Shrinkable<T>, level: number) {
    if (level === 0) {
        console.log('exhaustive:')
    }
    let str = ''
    for (let i = 0; i < level; i++) str += '  '
    console.log(str + ('shrinkable: ' + JSONStringify(shrinkable.value)))
}

export function exhaustive<T>(
    shrinkable: Shrinkable<T>,
    level: number = 0,
    func: (shr: Shrinkable<T>, level: number) => void = print
) {
    func(shrinkable, level)
    const shrinks = shrinkable.shrinks()
    for (let itr = shrinks.iterator(); itr.hasNext(); ) {
        const shrinkable2 = itr.next()
        exhaustive(shrinkable2, level + 1, func)
    }
}

export function compareShrinkable<T>(lhs: Shrinkable<T>, rhs: Shrinkable<T>, maxElements: number = 1000): boolean {
    if (lhs.value !== rhs.value) {
        return false
    }

    maxElements--

    const lhsShrinks = lhs.shrinks()
    const rhsShrinks = rhs.shrinks()

    const lhsIterator = lhsShrinks.iterator()
    const rhsIterator = rhsShrinks.iterator()

    while (lhsIterator.hasNext() || rhsIterator.hasNext()) {
        if (lhsIterator.hasNext() !== rhsIterator.hasNext()) {
            return false
        }

        const left = lhsIterator.next()
        const right = rhsIterator.next()

        if (!compareShrinkable(left, right, maxElements)) {
            return false
        }

        maxElements--
    }

    return true
}

function outShrinkable<T>(shrinkable: Shrinkable<T>) {
    const obj: any = {}
    obj.value = shrinkable.value

    const shrinks = shrinkable.shrinks()
    if (!shrinks.isEmpty()) {
        const shrinksObj: any[] = []
        for (let itr = shrinks.iterator(); itr.hasNext(); ) {
            const shrinkable2 = itr.next()
            shrinksObj.push(outShrinkable(shrinkable2))
        }
        obj.shrinks = shrinksObj
    }
    return obj
}

export function serializeShrinkable<T>(shrinkable: Shrinkable<T>) {
    return JSON.stringify(outShrinkable(shrinkable))
}
