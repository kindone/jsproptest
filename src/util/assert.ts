import { PreconditionError } from './error'

export function precond(value: Boolean) {
    if (!value) throw new PreconditionError()
}
