export class Option<T>
{
	constructor(readonly value?:T) {
	}

	isEmpty():boolean {
		return typeof this.value === 'undefined'
	}

	get():T {
		if(this.isEmpty())
			throw new Error('None does not contain value')

		return this.value!
	}

	map<U>(fn:(t:T) => U):Option<U> {
		if(this.isEmpty())
			return None()
		else
			return Some(fn(this.value!))
	}

	flatMap<U>(fn:(t:T) => Option<U>):Option<U> {
		if(this.isEmpty())
			return None()
		else
			return fn(this.value!)
	}

	filter(fn:(t:T) => boolean):Option<T> {
		if(!this.isEmpty() && fn(this.value!))
			return new Option(this.value!)
		else
			return None()
	}
}


export function Some<T>(value:T) {
	return new Option<T>(value)
}

export function None<T>() {
	return new Option<T>()
}
