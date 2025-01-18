export function JSONStringify(obj: unknown) {
    return JSON.stringify(obj, (_: string, value: unknown) => {
        if (typeof value === 'object' && value instanceof Set) {
            return [...Array.from(value)].sort()
        }
        return value
    })
}
