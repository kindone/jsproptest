import { Random } from './Random';
import { Shrinkable } from './Shrinkable';

export interface Generator<T> {
    generate(rand:Random):Shrinkable<T>

    map<U>(transformer:(arg:T) => U):Generator<U>
    flatMap<U>(gen2gen:(arg:T) => Generator<U>):Generator<U>
    chain<U>(gen2gen:(arg:T) => Generator<U>):Generator<[T,U]>
    filter(filterer: (value:T) => boolean):Generator<T>
}

export class Arbitrary<T> implements Generator<T>{
    constructor(readonly genFunction:GenFunction<T>) {
    }

    generate(rand:Random):Shrinkable<T> {
        return this.genFunction(rand)
    }

    map<U>(transformer:(arg:T) => U):Generator<U> {
        const self = this
        return new Arbitrary<U>((rand:Random) => self.generate(rand).map(transformer))
    }

    flatMap<U>(gen2gen:(arg:T) => Generator<U>):Generator<U> {
        const self = this
        return new Arbitrary<U>((rand:Random) => {
            const intermediate:Shrinkable<[T, Shrinkable<U>]> = self.generate(rand).map(value => [value, gen2gen(value).generate(rand)])
            return intermediate.andThen(interShr =>
                interShr.value[1].flatMap<[T, Shrinkable<U>]>(second =>
                    new Shrinkable([interShr.value[0], new Shrinkable(second)])
                ).shrinks()
            ).map(pair => pair[1].value)
        })
    }

    chain<U>(gen2gen:(arg:T) => Generator<U>):Generator<[T,U]> {
        const self = this
        return new Arbitrary<[T,U]>((rand:Random) => {
            const intermediate:Shrinkable<[T, Shrinkable<U>]> = self.generate(rand).map(value => [value, gen2gen(value).generate(rand)])
            return intermediate.andThen(interShr =>
                interShr.value[1].flatMap<[T, Shrinkable<U>]>(second =>
                    new Shrinkable([interShr.value[0], new Shrinkable(second)])
                ).shrinks()
            ).map(pair => [pair[0], pair[1].value])
        })
    }

    filter(filterer:(value:T) => boolean):Generator<T> {
        const self = this
        return new Arbitrary<T>((rand:Random) => self.generate(rand).filter(filterer))
    }
}

export class ArbiContainer<T> implements Generator<T> {
    public static defaultMinSize:number = 0
    public static defaultMaxSize:number = 100

    constructor(readonly genFunction:GenFunction<T>,
        public minSize:number = ArbiContainer.defaultMinSize,
        public maxSize:number = ArbiContainer.defaultMaxSize) {
    }

    generate(rand:Random):Shrinkable<T> {
        return this.genFunction(rand)
    }

    map<U>(transformer:(arg:T) => U):Generator<U> {
        const self = this
        return new ArbiContainer<U>((rand:Random) => self.generate(rand).map(transformer), this.minSize, this.maxSize)
    }

    flatMap<U>(gen2gen:(arg:T) => Generator<U>):Generator<U> {
        const self = this
        return new ArbiContainer<U>((rand:Random) => {
            const intermediate:Shrinkable<[T, Shrinkable<U>]> = self.generate(rand).map(value => [value, gen2gen(value).generate(rand)])
            return intermediate.andThen(interShr =>
                interShr.value[1].flatMap<[T, Shrinkable<U>]>(second =>
                    new Shrinkable([interShr.value[0], new Shrinkable(second)])
                ).shrinks()
            ).map(pair => pair[1].value)
        }, this.minSize, this.maxSize)
    }

    chain<U>(gen2gen:(arg:T) => Generator<U>):Generator<[T,U]> {
        const self = this
        return new ArbiContainer<[T,U]>((rand:Random) => {
            const intermediate:Shrinkable<[T, Shrinkable<U>]> = self.generate(rand).map(value => [value, gen2gen(value).generate(rand)])
            return intermediate.andThen(interShr =>
                interShr.value[1].flatMap<[T, Shrinkable<U>]>(second =>
                    new Shrinkable([interShr.value[0], new Shrinkable(second)])
                ).shrinks()
            ).map(pair => [pair[0], pair[1].value])
        }, this.minSize, this.maxSize)
    }

    filter(filterer:(value:T) => boolean):Generator<T> {
        const self = this
        return new ArbiContainer<T>((rand:Random) => self.generate(rand).filter(filterer), this.minSize, this.maxSize)
    }

    setSize(min:number, max:number) {
        this.minSize = min
        this.maxSize = max
    }
}

export type GenFunction<ARG> = (rand:Random) => Shrinkable<ARG>