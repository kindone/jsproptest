
export function JSONStringify(obj: any) {
    return JSON.stringify(obj, (_: string, value: any) => {
        if (typeof value === 'object' && value instanceof Set) {
            return [...Array.from(value)].sort()
        }
        return value
    })
}