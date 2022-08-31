const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

const { fetchMod } = require('../functions/fetchMod');
const { install } = require('../functions/install');
const { clearLastLine } = require('../functions/clearLastLine');

const dataLocation = path.resolve(process.env.APPDATA + '/Factorio Mod Updater/');


async function fetchDependencies(mod, Dependencies, text) {
	Dependencies = Dependencies.map(dependency => {
		if (dependency[0] == 'base') return;
		if (fs.existsSync(process.env.APPDATA + '/Factorio/mods/' + dependency[0] + '/info.json')) {
			return;
		}
		return dependency;
	}).filter(dependency => {
		if (typeof dependency == 'undefined') return;
		return dependency;
	});

	const FetchedDependencies = [];

	let i = 0;
	for await (const dependency of Dependencies) {
		console.log('Fetching dependencies (' + i + '/' + Dependencies.length + ')');
		const m = await fetchMod(dependency[0]);
		if (m) FetchedDependencies.push(m);
		i++;
		clearLastLine();
	}

	if (FetchedDependencies.length) {
		console.log(mod.title + ' has ' + text + (FetchedDependencies.length == 1 ? ' dependency not installed.' : ' dependencies not installed.'));
		const answers = await inquirer.prompt([
			{
				type: 'checkbox',
				name: 'installDeps',
				message: 'Which of them do you want to install ?',
				choices: FetchedDependencies.map(dependency => {
					return {
						name: dependency?.name,
						value: dependency
					};
				})
			}
		]);

		clearLastLine(2);
		return answers.installDeps;
	}
	return [];
}

async function installDeps(deps) {
	for await (const Mod of deps) {
		if (Mod == null) return;
		try {
			await install(Mod, dataLocation);
		} catch (err) {
			console.log('\n' + chalk.yellow('Oops, an error occured:\n') + err);
			return;
		}
	}
}


async function dependencies() {
	console.log(chalk.green('	Checking dependencies...'));
	console.log('\n');
	const mods = [];
	const modsName = [];
	const modList = fs.readdirSync(path.resolve(process.env.APPDATA + '/factorio/mods/'));
	for await (const mod of modList) {
		if (!fs.lstatSync(path.resolve(process.env.APPDATA + '/factorio/mods/' + mod)).isFile()) {
			const infos = JSON.parse(fs.readFileSync(path.resolve(process.env.APPDATA + '/factorio/mods/' + mod + '/info.json')));
			mods.push(infos);
			modsName.push(infos.title);
		}
	}
	for await (const mod of mods) {
		if (typeof mod == 'undefined') return;
		const RequireDependencies = [];
		const OptionalDependencies = [];
		let ConflictDependencies = [];
		for await (const dependency of mod.dependencies) {
			const dep = dependency.split(' >=');
			const modName = Array.from(dep[0]);
			if (modName[0] == '!') {
				modName.shift();
				if (modName[0] == ' ') modName.shift();
				dep[0] = modName.join('');
				ConflictDependencies.push(dep);
			} else if (modName[0] == '~') {
				modName.shift();
				if (modName[0] == ' ') modName.shift();
				dep[0] = modName.join('');
				RequireDependencies.push(dep);
			} else if (modName[0] == '?') {
				modName.shift();
				if (modName[0] == ' ') modName.shift();
				dep[0] = modName.join('');
				OptionalDependencies.push(dep);
			} else if (modName.join('').startsWith('(?)')) {
				modName.shift();
				modName.shift();
				modName.shift();
				if (modName[0] == ' ') modName.shift();
				dep[0] = modName.join('');
				OptionalDependencies.push(dep);
			} else {
				RequireDependencies.push(dep);
			}
		}

		ConflictDependencies = ConflictDependencies.map(dependency => {
			if (fs.existsSync(process.env.APPDATA + '/Factorio/mods/' + dependency + '/info.json')) {
				const m = JSON.parse(fs.readFileSync(process.env.APPDATA + '/Factorio/mods/mod-list.json')).mods;
				const myMod = m.find(Mod => {
					if (Mod?.name == dependency && Mod.enabled) {
						return Mod;
					}
				});
				if (typeof myMod != 'undefined') {
					return dependency;
				}
			}
		}).filter(dependency => {
			if (typeof dependency == 'undefined') return;
			return dependency;
		});

		if (ConflictDependencies.length) {
			console.log(chalk.red(ConflictDependencies.length == 1 ? 'Conflicting dependency found.' : 'Conflicting dependencies found.'));
			await inquirer.prompt([
				{
					type: 'checkbox',
					name: 'conflict',
					message: 'Which of them do you want to disable?',
					choices: ConflictDependencies.map(dependency => {
						return {
							name: dependency[0],
							value: dependency[0]
						};
					})
				}
			]).then(async answers => {
				clearLastLine(2);
				if (answers.conflict.length == 0) return;

				const m = JSON.parse(fs.readFileSync(process.env.APPDATA + '/Factorio/mods/mod-list.json')).mods;
				let i = 0;
				const Mods = answers.conflict.map(dependency => {
					return m.map(Mod => {
						if (Mod?.name == dependency) {
							Mod.enabled = false;
							i++;
						}
						return Mod;
					})[0];
				});

				for (let j = 0; j < i; j++) {
					Mods.push({
						name: answers.conflict[0],
						enabled: false
					});
				}

				fs.writeFileSync(process.env.APPDATA + '/Factorio/mods/mod-list.json', JSON.stringify({ 'mods': Mods }));
			});
		}

		const installs = [];

		await fetchDependencies(mod, RequireDependencies, chalk.red('required')).then(async d => {
			for await (const D of d) {
				installs.push(D);
			}
		});

		await fetchDependencies(mod, OptionalDependencies, chalk.yellow('optional')).then(async d => {
			for await (const D of d) {
				installs.push(D);
			}
		});

		await installDeps(installs);
	}
	console.log(chalk.green('Done !'));
}

module.exports = { dependencies };