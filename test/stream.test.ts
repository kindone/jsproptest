import { Stream } from '../src/Stream';

describe('stream', () => {
    it('one', () => {
        const str = Stream.one(1);
        for (let itr = str.iterator(); itr.hasNext(); ) {
            const value = itr.next();
            console.log('stream value: ' + value);
        }
    });

    it('two', () => {
        const str = Stream.two(1, 2);
        for (let itr = str.iterator(); itr.hasNext(); ) {
            const value = itr.next();
            console.log('stream value: ' + value);
        }
    });
});
