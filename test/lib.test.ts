import Rand from 'rand-seed';
import assert from 'assert'

describe('random', () => {
    it('next', () => {
        const rand: Rand = new Rand();
        console.log(rand.next());
    });
});

describe('jest', () => {
    it('expect', () => {
        let a  = 6
        try {
            expect(5 === a).toBe(true)
        }
        catch(e:any) {
            console.log('expect error1:', e.matcherResult.message())
            console.log('expect error2:', e.toString())
            console.log('expect error3:', e)
            console.log('expect error:', JSON.stringify(e, (_, value) => {
                if(typeof value == 'function')
                    return value.toString()
                else
                    return value
            }))
        }
        // expect(5 === a).toBe(true)
    })
})


class Error1 extends Error {
    constructor(readonly name:string) {
        super(name)
        Object.setPrototypeOf(this, Error1.prototype)
    }

    message = "Error1"
}

class Error2 extends Error1 {
    constructor(readonly name:string) {
        super(name)
        Object.setPrototypeOf(this, Error2.prototype)
    }

    message = "Error2"
}


describe('Error', () => {
    it('error type', () => {
        try {
            throw new Error1("hello")
        }
        catch(e) {
            expect(e).toBeInstanceOf(Error1)
        }

        try {
            throw new Error2("hello")
        }
        catch(e) {
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
            const a:{x:number}[] = [{x:5}]
            expect(a[0].x).toBe(6)
            console.log(a[2].x)
        }
        catch(e:any) {
            if(e instanceof assert.AssertionError)
                console.log("AssertionError!", e)
            if(e instanceof Error)
                console.log("Error", e.name, e)
            else
                console.log("Not an Error")
        }

        console.log("done")

        // const x = 3 /0  // -> Infinity error
        // console.log(x)
    })
})