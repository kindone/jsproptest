import Rand from 'rand-seed';

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
        catch(e) {
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


class Error1 implements Error {
    constructor(readonly name:string) {
    }

    message = "Error1"
}

class Error2 extends Error1 {
    constructor(readonly name:string) {
        super(name)
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