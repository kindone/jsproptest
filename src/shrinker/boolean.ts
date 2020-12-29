import { Shrinkable } from '../Shrinkable';
import { Stream } from '../Stream';

export function shrinkableBoolean(value: boolean): Shrinkable<boolean> {
    if (value) {
        var stream = Stream.one(new Shrinkable<boolean>(false));
        return new Shrinkable<boolean>(value).with(() => stream);
    } else return new Shrinkable(value);
}
