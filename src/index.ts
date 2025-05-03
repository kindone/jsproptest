import { construct as Construct } from './combinator/construct'
import { elementOf as ElementOf, weightedValue as WeightedValue } from './combinator/elementof'
import { oneOf as OneOf, weightedGen as WeightedGen } from './combinator/oneof'
import { lazy as Lazy } from './combinator/lazy'
import { just as Just } from './combinator/just'
import { chainTuple as ChainTuple } from './combinator/chaintuple'

import { BooleanGen } from './generator/boolean'
import { inRange as InRange, integers as Integers, interval as Interval } from './generator/integer'
import { FloatingGen } from './generator/floating'
import {
    ASCIICharGen,
    PrintableASCIICharGen,
    UnicodeCharGen,
    ASCIIStringGen,
    PrintableASCIIStringGen,
    UnicodeStringGen,
    StringGen,
} from './generator/string'
import { ArrayGen, UniqueArrayGen } from './generator/array'
import { SetGen } from './generator/set'
import { TupleGen } from './generator/tuple'
import { DictionaryGen } from './generator/dictionary'

import { simpleActionGenOf as SimpleActionGenOf, actionGenOf as ActionGenOf } from './stateful/actionof'

export { Generator, Arbitrary, GenFunction } from './Generator'
export { Property, forAll } from './Property'
export { Random } from './Random'
export { Shrinkable } from './Shrinkable'
export { Stream } from './Stream'

export { SimpleAction, Action, SimpleActionGen, ActionGen } from './stateful/statefulbase'
export { SimpleActionGenOrFactory, ActionGenOrFactory } from './stateful/actionof'
export { simpleStatefulProperty, statefulProperty } from './stateful/statefultest'
export { precond } from './util/assert'

export const Gen = {
    boolean: BooleanGen,
    inRange: InRange,
    integers: Integers,
    interval: Interval,
    float: FloatingGen,

    ascii: ASCIICharGen,
    unicode: UnicodeCharGen,
    printableAscii: PrintableASCIICharGen,

    string: StringGen,
    asciiString: ASCIIStringGen,
    unicodeString: UnicodeStringGen,
    printableAsciiString: PrintableASCIIStringGen,

    array: ArrayGen,
    uniqueArray: UniqueArrayGen,
    set: SetGen,
    tuple: TupleGen,
    dict: DictionaryGen,
    dictionary: DictionaryGen,

    // stateful
    simpleActionOf: SimpleActionGenOf,
    actionOf: ActionGenOf,

    // combinators
    construct: Construct,
    elementOf: ElementOf,
    weightedValue: WeightedValue,
    oneOf: OneOf,
    weightedGen: WeightedGen,
    lazy: Lazy,
    just: Just,
    chainTuple: ChainTuple
} // namespace Gen
