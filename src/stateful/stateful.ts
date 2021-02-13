import { Generator } from "../Generator";
import { ArrayGen } from "../generator/array";
import { TupleGen } from "../generator/tuple";
import { Property } from "../Property";

export class SimpleAction<ObjectType> {
    constructor(readonly func:(obj:ObjectType) => void, readonly name="unnamed") {
    }

    call(obj:ObjectType) {
        this.func(obj)
    }

    toString() {
        return this.name
    }
}


export class Action<ObjectType, ModelType> {
    static fromSimpleAction<ObjectType,ModelType>(simpleAction:SimpleAction<ObjectType>) {
        return new Action((object:ObjectType, _:ModelType) => simpleAction.call(object), simpleAction.name)
    }

    constructor(readonly func:(obj:ObjectType,mdl:ModelType) => void, readonly name="unnamed") {
    }

    call(obj:ObjectType, mdl:ModelType) {
        this.func(obj, mdl)
    }

    toString() {
        return this.name
    }
}

export type ActionGen<ObjectType,ModelType> = Generator<Action<ObjectType,ModelType>>

export class StatefulProperty<ObjectType, ModelType> {
    private seed:string = ''
    private numRuns = 0
    private onStartup?:() => void
    private onCleanup?:() => void
    private postCheck?:(obj:ObjectType,mdl:ModelType) => void

    constructor(readonly initialGen:Generator<ObjectType>,
        readonly modelFactory:(_:ObjectType) => ModelType,
        readonly actionGen:Generator<Action<ObjectType,ModelType>>) {
    }

    setSeed(seed:string) {
        this.seed = seed
        return this
    }

    setNumRuns(numRuns:number) {
        this.numRuns = numRuns
        return this
    }

    setOnStartup(onStartup:() => void) {
        this.onStartup = onStartup
        return this
    }

    setOnCleanup(onCleanup:() => void) {
        this.onCleanup = onCleanup
        return this
    }

    setPostCheck(postCheck:(obj:ObjectType, mdl:ModelType) => void) {
        this.postCheck = postCheck
        return this
    }

    setPostCheckWithoutModel(postCheck:(obj:ObjectType) => void) {
        this.postCheck = (obj:ObjectType, _:ModelType) => postCheck(obj)
        return this
    }

    go() {
        type StatefulArgs = {initial:ObjectType, actions:Array<Action<ObjectType,ModelType>>}
        const actionArrayGen = ArrayGen(this.actionGen, 0, 100)
        const tupleGen = TupleGen(this.initialGen, actionArrayGen).map(tuple => { return {initial:tuple[0], actions:tuple[1]}})

        const prop = new Property<[StatefulArgs]>((statefulArgs:StatefulArgs) => {
            const obj = statefulArgs.initial
            const actions = statefulArgs.actions
            const model = this.modelFactory(obj)
            actions.map(action => {
                action.call(obj, model)
            })
            if(this.postCheck)
                this.postCheck(obj, model)
            return true
        })

        if(this.onStartup)
            prop.setOnStartup(this.onStartup)

        if(this.onCleanup)
            prop.setOnCleanup(this.onCleanup)

        if(this.seed !== '')
            prop.setSeed(this.seed)

        if(this.numRuns != 0)
            prop.setNumRuns(this.numRuns)

        prop.forAll(tupleGen)
    }
}

export function statefulProperty<ObjectType, ModelType>(initialGen:Generator<ObjectType>,
    modelFactory:(_:ObjectType) => ModelType,
    actionGen:Generator<Action<ObjectType,ModelType>>) {
        return new StatefulProperty(initialGen, modelFactory, actionGen)
}

export type EmptyModel = {}

export function simpleStatefulProperty<ObjectType>(initialGen:Generator<ObjectType>,
    actionGen:Generator<SimpleAction<ObjectType>>) {
        const actionGen2 = actionGen.map(action => Action.fromSimpleAction<ObjectType,EmptyModel>(action))
        const emptyModel:EmptyModel = {}
        const modelFactory = (_:ObjectType) => emptyModel
        return new StatefulProperty(initialGen, modelFactory, actionGen2)
}