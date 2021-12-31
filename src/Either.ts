import {Option,Some,None} from './Option'

export class Either<Left, Right>
{
	constructor(readonly left:Option<Left>, readonly right:Option<Right>) {
	}

	isLeft():boolean {
		return !this.left.isEmpty()
	}

	isRight():boolean {
		return !this.right.isEmpty()
	}

	getLeft():Left {
		if(!this.isLeft())
			throw new Error('left not valid')
		return this.left.get()
	}

	getRight():Right {
		if(!this.isRight())
			throw new Error('right not valid')

		return this.right.get()
	}
	
	map<NewRight>(fn:(right:Right) => NewRight):Either<Left, NewRight> {
		if(this.isRight())
			return new Either(None(), Some(fn(this.getRight())))
		else
			return new Either(this.left, None())
	}

	flatMap<NewRight>(fn:(right:Right) => Either<Left,NewRight>):Either<Left,NewRight> {
		if(this.isRight())
			return fn(this.getRight())
		else
			return new Either<Left,NewRight>(this.left, None()) 
	}

	filterOrElse<NewLeft>(fn:(right:Right) => boolean, left:NewLeft):Either<NewLeft,Right> {
		if(fn(this.getRight()))
			return new Either(None(), this.right)
		else
			return new Either(Some(left), None())
	}
}

export function Left<L,R>(left:L):Either<L,R> {
	return new Either<L,R>(Some(left), None()) 
}
export function Right<L,R>(right:R):Either<L,R> {
	return new Either<L,R>(None(), Some(right))
}

