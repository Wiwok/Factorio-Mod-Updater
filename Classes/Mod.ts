import chalk from 'chalk';

function cleanDependency(dependency: string) {
	const OPERATORS = ['<=', '>=', '<', '>', '='];
	const SEPARATORS = ['!', '\\?', '\\(\\?\\)'];

	dependency = dependency.replaceAll('~', '').trim();

	const tokens = dependency
		.split(new RegExp([...OPERATORS, ...SEPARATORS].join('|'), 'g'))
		.map(val => val.trim())
		.filter(item => item != '');

	const name = tokens[0];

	const characterType = SEPARATORS.map(old => old.replace(/\\/g, '')).find(operator => dependency.includes(operator));

	let type: DependencyState;
	switch (characterType) {
		case '!':
			type = 'Conflict';
			break;
		case '?':
			type = 'Optional';
			break;
		case '(?)':
			type = 'Optional';
			break;
		default:
			type = 'Required';
			break;
	}

	const operatorResult = OPERATORS.find(operator => dependency.includes(operator));

	if (operatorResult == undefined) {
		return new Dependency(name, type, tokens.length > 1 ? tokens[1] : undefined);
	} else {
		return new Dependency(
			name,
			type,
			tokens.length > 1 ? tokens[1] : undefined,
			operatorResult as DependencyVersionOperators
		);
	}
}

type DependencyState = 'Required' | 'Optional' | 'Conflict';
type DependencyVersionOperators = '<=' | '<' | '=' | '>' | '>=';

class Dependency {
	name: string;
	type: DependencyState;
	version: string | undefined;
	versionOperator: DependencyVersionOperators | undefined;
	constructor(name: string, type: DependencyState, version?: string, versionOperator?: DependencyVersionOperators) {
		this.name = name;
		this.type = type;
		this.version = version;
		this.versionOperator = versionOperator;
	}
}

class Mod {
	name: string = '';
	title: string = '';
	description: string | undefined = undefined;
	version: string = '';
	author: string = '';
	dependencies: Array<Dependency> = [];
	constructor(
		name: string,
		title: string,
		version: string,
		author: string,
		dependencies?: Array<string>,
		description?: string
	) {
		this.name = name;
		this.title = title;
		this.version = version;
		this.author = author;

		if (typeof description != 'undefined' && description.length != 0) {
			this.description = description;
		}

		if (typeof dependencies != 'undefined') {
			const deps: Array<Dependency> = [];
			dependencies.forEach(v => {
				const dep = cleanDependency(v);
				if (dep) {
					deps.push(dep);
				}
			});
			this.dependencies = deps;
		}
	}

	print(newVersion: string = this.version) {
		console.log('Mod: ' + chalk.bold(this.title));
		console.log('Author: ' + this.author);
		if (newVersion == this.version) {
			console.log('Version: ' + this.version);
		} else {
			console.log('Version: ' + chalk.gray(this.version) + ' -> ' + chalk.underline(newVersion));
		}
		if (this.description) {
			console.log('Description:\n' + chalk.gray(this.description));
		}
	}
}

export { Dependency };
export default Mod;
