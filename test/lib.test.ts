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
