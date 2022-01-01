import Rand from 'rand-seed'
import assert from 'assert'
import { Option, Some, None } from '../src/Option'
import { Either, Left, Right } from '../src/Either'
import { Try } from '../src/Try'

describe('random', () => {
    it('next', () => {
        const rand: Rand = new Rand()
        console.log(rand.next())
    })
})

describe('jest', () => {
    it('expect', () => {
        let a = 6
        try {
            expect(5 === a).toBe(true)
        } catch (e) {
            console.log('expect error1:', e.matcherResult.message())
            console.log('expect error2:', e.toString())
            console.log('expect error3:', e)
            console.log(
                'expect error:',
                JSON.stringify(e, (_, value) => {
                    if (typeof value == 'function') return value.toString()
                    else return value
                })
            )
        }
        // expect(5 === a).toBe(true)
    })
})

class Error1 extends Error {
    constructor(readonly name: string) {
        super(name)
        Object.setPrototypeOf(this, Error1.prototype)
    }

    message = 'Error1'
}

class Error2 extends Error1 {
    constructor(readonly name: string) {
        super(name)
        Object.setPrototypeOf(this, Error2.prototype)
    }

    message = 'Error2'
}

describe('Error', () => {
    it('error type', () => {
        try {
            throw new Error1('hello')
        } catch (e) {
            expect(e).toBeInstanceOf(Error1)
        }

        try {
            throw new Error2('hello')
        } catch (e) {
            expect(e).toBeInstanceOf(Error1)
            expect(e).toBeInstanceOf(Error2)
        }
    })
})

describe('expect failure', () => {
    it('expect exception type', () => {
        // try {
        //     expect(true).toBe(false)
        // }
        // catch(e:any) {
        //     console.log(e)
        // }

        try {
            const a: { x: number }[] = [{ x: 5 }]
            expect(a[0].x).toBe(6)
            console.log(a[2].x)
        } catch (e) {
            if (e instanceof assert.AssertionError) console.log('AssertionError!', e)
            if (e instanceof Error) console.log('Error', e.name, e)
            else console.log('Not an Error')
        }

        console.log('done')

        // const x = 3 /0  // -> Infinity error
        // console.log(x)
    })
})

describe('Option, Either, and Try', () => {
    it('Option', () => {
        const x: Option<number> = Some(5)
        const y = None<number>()

        expect(x.isEmpty()).toBe(false)
        expect(y.isEmpty()).toBe(true)

        expect(x.map(v => (v + 5).toString()).get()).toBe('10')
        expect(y.map(v => v + 5).isEmpty()).toBe(true)
        expect(x.flatMap(v => Some((v + 5).toString())).get()).toBe('10')
        expect(x.flatMap(_ => None()).isEmpty()).toBe(true)
        expect(y.flatMap(v => Some(v + 5)).isEmpty()).toBe(true)
        expect(y.flatMap(_ => None()).isEmpty()).toBe(true)
        expect(x.filter(v => v > 4).isEmpty()).toBe(false)
        expect(x.filter(v => v > 5).isEmpty()).toBe(true)
        expect(y.filter(v => v > 4).isEmpty()).toBe(true)
        expect(y.filter(v => v > 5).isEmpty()).toBe(true)
    })

    it('Either', () => {
        const x: Either<Error, number> = Right(5)
        const y: Either<Error, number> = Left(new Error('y'))
        expect(x.isLeft()).toBe(false)
        expect(x.isRight()).toBe(true)
        expect(y.isLeft()).toBe(true)
        expect(y.isRight()).toBe(false)
        expect(() => x.getLeft()).toThrow()
        expect(x.getRight()).toBe(5)
        expect(y.getLeft().message).toBe('y')
        expect(() => y.getRight()).toThrow()
        expect(x.map(v => (v + 5).toString()).getRight()).toBe('10')
        expect(y.map(v => (v + 5).toString()).isRight()).toBe(false)
        expect(x.flatMap(v => Right((v + 5).toString())).isRight()).toBe(true)
        // flatmapping left always result in left
        expect(y.flatMap(v => Right((v + 5).toString())).isRight()).toBe(false)
        expect(y.flatMap(_ => Left(new Error('y2'))).isRight()).toBe(false)

        expect(x.filterOrElse(v => v > 4, new Error('x')).getRight()).toBe(5)
        expect(x.filterOrElse(v => v > 5, new Error('x')).isRight()).toBe(false)
        expect(y.filterOrElse(v => v > 4, new Error('x')).isRight()).toBe(false)
        expect(y.filterOrElse(v => v > 5, new Error('x')).isRight()).toBe(false)
    })

    it('Try', () => {
        const x = Try<number>(() => 5)
        const y = Try<number>(() => {
            throw new Error('ee')
        })

        expect(x.isSuccessful()).toBe(true)
        expect(y.isSuccessful()).toBe(false)
        expect(x.map(v => v + 6).get()).toBe(11)
        expect(y.map(v => v + 6).isFailure()).toBe(true)
        expect(x.flatMap(v => Try(() => v + 5)).get()).toBe(10)
        expect(y.flatMap(v => Try(() => v + 5)).isFailure()).toBe(true)
    })
})
