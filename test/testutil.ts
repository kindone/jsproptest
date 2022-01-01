import { Shrinkable } from '../src/Shrinkable'
import { JSONStringify } from '../src/util/JSON'

function print<T>(shrinkable: Shrinkable<T>, level: number) {
    if (level == 0) {
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
