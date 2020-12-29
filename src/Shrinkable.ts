import { Stream } from './Stream';

export class Shrinkable<T> {
    constructor(
        readonly value: T,
        readonly shrinksGen: () => Stream<Shrinkable<T>> = () =>
            new Stream<Shrinkable<T>>()
    ) {}

    toString() {
        return `Shrinkable(${this.value})`;
    }

    shrinks(): Stream<Shrinkable<T>> {
        return this.shrinksGen();
    }

    with(shrinksGen: () => Stream<Shrinkable<T>>): Shrinkable<T> {
        return new Shrinkable(this.value, shrinksGen);
    }

    concatStatic(then: () => Stream<Shrinkable<T>>): Shrinkable<T> {
        return this.with(() =>
            this.shrinks()
                .transform(shr => shr.concatStatic(then))
                .concat(then())
        );
    }

    concat(then: (_: Shrinkable<T>) => Stream<Shrinkable<T>>): Shrinkable<T> {
        const self = this;
        return this.with(() =>
            this.shrinks()
                .transform(shr => shr.concat(then))
                .concat(then(self))
        );
    }

    andThenStatic(then: () => Stream<Shrinkable<T>>): Shrinkable<T> {
        if (this.shrinks().isEmpty()) {
            return this.with(then);
        } else {
            return this.with(() =>
                this.shrinks().transform(shr => shr.andThenStatic(then))
            );
        }
    }

    andThen(then: (_: Shrinkable<T>) => Stream<Shrinkable<T>>): Shrinkable<T> {
        if (this.shrinks().isEmpty()) return this.with(() => then(this));
        else {
            return this.with(() =>
                this.shrinks().transform(shr => shr.andThen(then))
            );
        }
    }

    transform<U>(transformer: (_: T) => U): Shrinkable<U> {
        const shrinkable: Shrinkable<U> = new Shrinkable<U>(
            transformer(this.value)
        );
        return shrinkable.with(() =>
            this.shrinksGen().transform(shr => shr.transform<U>(transformer))
        );
    }

    filter(criteria: (_: T) => boolean): Shrinkable<T> {
        return this.with(() =>
            this.shrinksGen().filter(shr => criteria(shr.value))
        );
    }

    take(n: number) {
        return this.with(() => this.shrinksGen().take(n));
    }
}
