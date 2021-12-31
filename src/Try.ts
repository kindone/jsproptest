import { Either } from "./Either"
import { None, Option, Some } from "./Option"

export class TryResult<T> {
    constructor(private result:Option<T>, private error:Option<Error>) {

    }

    isSuccessful():boolean {
        return !this.result.isEmpty()
    }

    isFailure():boolean {
        return this.result.isEmpty()
    }

    get():T {
        if(this.isFailure())
            throw new Error('value is invalid')
        return this.result.value!
    }

    toOption():Option<T> {
        return this.result
    }

    toEither():Either<Error,T> {
        return new Either(this.error, this.result)
    }

    map<U>(fn:(t:T) => U):TryResult<U> {
        if(this.result.isEmpty())
            return new TryResult(None(), this.error)
        else
            return Try<U>(() => fn(this.result.get()))
    }

    flatMap<U>(fn:(t:T) => TryResult<U>):TryResult<U> {
        if(this.result.isEmpty()) {
            return new TryResult(None(), this.error)
        }
        else {
            return fn(this.result.get())
        }
    }
}


export function Try<T>(fn:() => T):TryResult<T> {
    try {
        return new TryResult(Some(fn()), None())
    }
    catch(e:any) {
        return new TryResult(None(), Some(e as Error))
    }
}
