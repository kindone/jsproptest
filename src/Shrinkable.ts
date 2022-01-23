import { Stream } from './Stream'
import { Try } from './Try'

export class Shrinkable<T> {
    constructor(
        readonly value: T,
        readonly shrinksGen: () => Stream<Shrinkable<T>> = () => new Stream<Shrinkable<T>>()
    ) {}

    toString() {
        return `Shrinkable(${this.value})`
    }

    shrinks(): Stream<Shrinkable<T>> {
        return this.shrinksGen()
    }

    with(shrinksGen: () => Stream<Shrinkable<T>>): Shrinkable<T> {
        return new Shrinkable(this.value, shrinksGen)
    }

    concatStatic(then: () => Stream<Shrinkable<T>>): Shrinkable<T> {
        return this.with(() =>
            this.shrinks()
                .transform(shr => shr.concatStatic(then))
                .concat(then())
        )
    }

    concat(then: (_: Shrinkable<T>) => Stream<Shrinkable<T>>): Shrinkable<T> {
        const self = this
        return this.with(() =>
            this.shrinks()
                .transform(shr => shr.concat(then))
                .concat(then(self))
        )
    }

    andThenStatic(then: () => Stream<Shrinkable<T>>): Shrinkable<T> {
        if (this.shrinks().isEmpty()) {
            return this.with(then)
        } else {
            return this.with(() => this.shrinks().transform(shr => shr.andThenStatic(then)))
        }
    }

    andThen(then: (_: Shrinkable<T>) => Stream<Shrinkable<T>>): Shrinkable<T> {
        if (this.shrinks().isEmpty()) {
            // filter: remove duplicates
            return this.with(() => then(this).filter(shr => shr.value !== this.value))
        } else {
            return this.with(() => this.shrinks().transform(shr => shr.andThen(then)))
        }
    }

    map<U>(transformer: (_: T) => U): Shrinkable<U> {
        const shrinkable: Shrinkable<U> = new Shrinkable<U>(transformer(this.value), () =>
            this.shrinksGen().transform(shr => shr.map<U>(transformer))
        )
        return shrinkable
    }

    flatMap<U>(transformer: (_: T) => Shrinkable<U>): Shrinkable<U> {
        return transformer(this.value).with(() => this.shrinks().transform(shr => shr.flatMap(transformer)))
    }

    filter(criteria: (_: T) => boolean): Shrinkable<T> {
        if (!criteria(this.value)) throw new Error('cannot apply criteria')
        return this.with(() =>
            this.shrinksGen()
                .filter(shr => criteria(shr.value))
                .transform(shr => shr.filter(criteria))
        )
    }

    take(n: number) {
        return this.with(() => this.shrinksGen().take(n))
    }

    getNthChild(n: number): Shrinkable<T> {
        const shrinks = this.shrinks()
        let i = 0
        for (const iter = shrinks.iterator(); iter.hasNext(); i++) {
            if (i == n) return iter.next()
            else iter.next()
        }
        throw new Error('Shrinkable getNthChild failed: index out of bound: ' + n + ' >= ' + i)
    }

    // returns self if steps is empty
    retrieve(steps: number[]): Shrinkable<T> {
        let shr: Shrinkable<T> = this
        for (let i = 0; i < steps.length; i++) {
            shr = Try(() => shr.getNthChild(steps[i])).getOrThrow(
                e => new Error('Shrinkable retrieval failed at step ' + i + ': ' + e.toString())
            )
        }
        return shr
    }
}
