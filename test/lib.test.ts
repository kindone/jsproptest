import Rand from "rand-seed"

describe('random', () => {
    it('next', () => {
        const rand:Rand = new Rand()
        console.log(rand.next())
    })
})