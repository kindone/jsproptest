class SomeUnexportedClass {
  constructor() {
  }
}

export class GenerationError extends Error
{
    constructor(message:string) {
        super(message)
        Object.setPrototypeOf(this, GenerationError.prototype)
    }

    getC() {
      return new SomeUnexportedClass()
    }
}

export class AssertionError extends Error
{
    constructor(message:string) {
        super(message)
        Object.setPrototypeOf(this, AssertionError.prototype)
      }
}