import { Shrinkable } from '../src/Shrinkable';

export function exhaustive<T>(
    shrinkable: Shrinkable<T>,
    level: number = 0,
    print = true
) {
    if (print) {
        if(level == 0) {
            console.log('exhaustive:')
        }
        let str = '';
        for (let i = 0; i < level; i++) str += '  ';
        console.log(str + ('shrinkable: ' + shrinkable.value));
    }
    const shrinks = shrinkable.shrinks();
    for (let itr = shrinks.iterator(); itr.hasNext(); ) {
        const shrinkable2 = itr.next();
        exhaustive(shrinkable2, level + 1, print);
    }
}
