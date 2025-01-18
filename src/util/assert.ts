import { PreconditionError } from './error'

export function precond(value: boolean) {
    if (!value) throw new PreconditionError()
}
