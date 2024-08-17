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

export namespace Gen {
    export const boolean = BooleanGen
    export const inRange = InRange
    export const integers = Integers
    export const interval = Interval
    export const float = FloatingGen

    export const ascii = ASCIICharGen
    export const unicode = UnicodeCharGen
    export const printableAscii = PrintableASCIICharGen

    export const string = StringGen
    export const asciiString = ASCIIStringGen
    export const unicodeString = UnicodeStringGen
    export const printableAsciiString = PrintableASCIIStringGen

    export const array = ArrayGen
    export const uniqueArray = UniqueArrayGen
    export const set = SetGen
    export const tuple = TupleGen
    export const dictionary = DictionaryGen

    // stateful
    export const simpleActionOf = SimpleActionGenOf
    export const actionOf = ActionGenOf

    // combinators
    export const construct = Construct
    export const elementOf = ElementOf
    export const weightedValue = WeightedValue
    export const oneOf = OneOf
    export const weightedGen = WeightedGen
    export const lazy = Lazy
    export const just = Just
    export const chainTuple = ChainTuple
} // namespace Gen
