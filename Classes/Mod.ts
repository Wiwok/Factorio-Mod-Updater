function CleanDependency(dependency: string) {
	/*
	? moweather
	?YARM
	? AbandonedRuins >= 1.1.4
	(?)cargo-ships
	! cardinal
	base >= 1.0.0
	flib >= 0.6.0
	*/

	if (dependency.startsWith('?') || dependency.startsWith('(?)')) {
		let dep = dependency.split('');
		if (dependency.startsWith('?')) {
			dep.shift();
		} else {
			dep.shift();
			dep.shift();
			dep.shift();
		}
		while (dep[0] == ' ') {
			dep.shift();
		}
		dep = dep.join('').split(' ');
		if (dep.join(' ').includes('=')) {
			return new Dependency(dep[0], 'Optional', dep[2]);
		} else {
			return new Dependency(dep[0], 'Optional');
		}
	} else if (dependency.startsWith('!')) {
		let dep = dependency.split('');
		dep.shift();
		while (dep[0] == ' ') {
			dep.shift();
		}
		dep = dep.join('').split(' ');
		return new Dependency(dep[0], 'Conflict');
	} else {
		let dep = dependency.split('');
		if (dependency.startsWith('~')) {
			dep.shift();
		}

		while (dep[0] == ' ') {
			dep.shift();
		}

		dep = dep.join('').split(' ');
		if (dep[0] == 'base') return;
		if (dep.join(' ').includes('=')) {
			return new Dependency(dep[0], 'Required', dep[2]);
		} else {
			return new Dependency(dep[0], 'Required');
		}
	}
}

type DependencyState = 'Required' | 'Optional' | 'Conflict';

class Dependency {
	name: string;
	version: string | undefined = undefined;
	type: DependencyState;
	constructor(name: string, type: DependencyState, version?: string) {
		this.name = name;
		this.type = type;
		if (typeof version != 'undefined') {
			this.version = version;
		}
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
				const dep = CleanDependency(v);
				if (dep) {
					deps.push(dep);
				}
			});
			this.dependencies = deps;
		}
	}
}

export { Dependency };
export default Mod;
