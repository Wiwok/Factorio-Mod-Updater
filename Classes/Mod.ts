import chalk from 'chalk';

import DataInteraction from '../Functions/DataInteraction';

const typeMap: Record<string, DependencyState> = {
	'!': 'Conflict',
	'?': 'Optional',
	'(?)': 'Optional'
};

type DependencyState = 'Required' | 'Optional' | 'Conflict';
type DependencyVersionOperators = '<=' | '<' | '=' | '>' | '>=';

function cleanDependency(dependency: string) {
	const OPERATORS = ['<=', '>=', '<', '>', '='];
	const SEPARATORS = ['!', String.raw`\?`, String.raw`\(\?\)`];

	dependency = dependency.replaceAll('~', '').replaceAll('+', '').trim();

	const tokens = dependency
		.split(new RegExp([...OPERATORS, ...SEPARATORS].join('|'), 'g'))
		.map(val => val.trim())
		.filter(item => item != '');

	const name = tokens[0];
	if (name == 'base') return undefined;

	const characterType = SEPARATORS.map(old => old.replaceAll('\\', '')).find(operator =>
		dependency.includes(operator)
	);

	const type = characterType ? typeMap[characterType] : 'Required';

	const operatorResult = OPERATORS.find(operator => dependency.includes(operator)) as
		| DependencyVersionOperators
		| undefined;

	return new Dependency(name, type, tokens.length > 1 ? tokens[1] : undefined, operatorResult);
}

class Dependency {
	name: string;
	type: DependencyState;
	version?: string;
	versionOperator?: DependencyVersionOperators;
	constructor(name: string, type: DependencyState, version?: string, versionOperator?: DependencyVersionOperators) {
		this.name = name;
		this.type = type;
		this.version = version;
		this.versionOperator = versionOperator;
	}
}

type Update = {
	version: string;
	date: Date;
	changelog: string | undefined;
};

abstract class Mod {
	name: string;
	title: string;
	author: string;
	description: string;
	constructor(name: string, title: string, author: string, description: string) {
		this.name = name;
		this.title = title;
		this.author = author;
		this.description = description;
	}
}

class LocalMod extends Mod {
	dependencies: Array<Dependency>;
	version: string;

	constructor(
		name: string,
		title: string,
		version: string,
		author: string,
		description: string,
		dependencies: Array<string>
	) {
		super(name, title, author, description);
		this.version = version;
		this.dependencies = new Array<Dependency>();
		dependencies?.forEach(v => {
			const dep = cleanDependency(v);
			if (dep) this.dependencies.push(dep);
		});
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

	async getDependenciesToModify() {
		const requiredDeps = this.dependencies.filter(dep => dep.type === 'Required');
		const conflictDeps = this.dependencies.filter(dep => dep.type === 'Conflict');

		const [toInstall, toRemove] = await Promise.all([
			Promise.all(
				requiredDeps.map(async dep => ({ dep, keep: !(await DataInteraction.Installed.isInstalled(dep.name)) }))
			),
			Promise.all(
				conflictDeps.map(async dep => ({ dep, keep: await DataInteraction.Installed.isInstalled(dep.name) }))
			)
		]);

		return [
			...toInstall.filter(({ keep }) => keep).map(({ dep }) => dep),
			...toRemove.filter(({ keep }) => keep).map(({ dep }) => dep)
		];
	}

	async isModUnderDependency() {
		const modList = await DataInteraction.Installed.fetchMods();
		for (const localMod of modList) {
			for (const dep of localMod.dependencies) {
				if (dep.type == 'Required') {
					if (dep.name == this.name) {
						return localMod;
					}
				}
			}
		}
	}
}

class OnlineMod extends LocalMod {
	releases: Array<Update>;

	constructor(
		name: string,
		title: string,
		version: string,
		author: string,
		description: string,
		dependencies: Array<string>,
		releases: Array<Update>
	) {
		super(name, title, version, author, description, dependencies);
		this.releases = releases;
	}

	getChangelog(from: string, to: string) {
		const fromIndex = this.releases.findIndex(release => release.version == from);
		const toIndex = this.releases.findIndex(release => release.version == to);
		if (fromIndex == -1 || toIndex == -1) {
			return undefined;
		}

		let changelog = this.releases
			.slice(Math.min(fromIndex, toIndex) + 1, Math.max(fromIndex, toIndex) + 1)
			.map(r => `${r.version} (${r.date.toLocaleDateString()}):\n${r.changelog}`)
			.join('\n');

		const terminalRows = process.stdout.rows ?? 24;
		const lines = changelog.split('\n');
		const offset = 20;
		if (lines.length > terminalRows - offset) {
			changelog = lines.slice(0, terminalRows - offset).join('\n') + '\n...';
		}
		return changelog;
	}
}

class SearchMod extends Mod {}

export { Dependency, LocalMod, Mod, OnlineMod, SearchMod };
