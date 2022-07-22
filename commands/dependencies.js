const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');

const { fetchMod } = require('../functions/fetchMod');
const { install } = require('../functions/install');
const { clearLastLine } = require('../functions/clearLastLine');

const dataLocation = path.resolve(process.env.APPDATA + '/Factorio Mod Updater/');


async function dependencies(mod) {
	const Dep = JSON.parse(fs.readFileSync(process.env.APPDATA + '/Factorio/mods/' + mod.rawName + '/info.json')).dependencies;
	let RequireDependencies = [];
	let OptionalDependencies = [];
	let ConflictDependencies = [];
	for await (const dependency of Dep) {
		const dep = dependency.split(' >=');
		const modName = Array.from(dep[0]);
		if (modName[0] == '!') {
			modName.shift();
			modName.shift();
			dep[0] = modName.join('');
			ConflictDependencies.push(dep);
		} else if (modName[0] == '~') {
			modName.shift();
			modName.shift();
			dep[0] = modName.join('');
			RequireDependencies.push(dep);
		} else if (modName[0] == '?') {
			modName.shift();
			modName.shift();
			dep[0] = modName.join('');
			OptionalDependencies.push(dep);
		} else if (modName.join('').startsWith('(?)')) {
			modName.shift();
			modName.shift();
			modName.shift();
			modName.shift();
			dep[0] = modName.join('');
			OptionalDependencies.push(dep);

		} else {
			RequireDependencies.push(dep);
		}
	}

	ConflictDependencies = ConflictDependencies.map(dependency => {
		if (fs.existsSync(process.env.APPDATA + '/Factorio/mods/' + dependency + '/info.json')) {
			const mods = JSON.parse(fs.readFileSync(process.env.APPDATA + '/Factorio/mods/mod-list.json')).mods;
			const myMod = mods.find(Mod => {
				if (Mod.name == dependency && Mod.enabled) {
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

	if (ConflictDependencies.length > 0) {
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

			const mods = JSON.parse(fs.readFileSync(process.env.APPDATA + '/Factorio/mods/mod-list.json')).mods;
			let i = 0;
			const Mods = answers.conflict.map(dependency => {
				return mods.map(Mod => {
					if (Mod.name == dependency) {
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

	RequireDependencies = RequireDependencies.map(dependency => {
		if (dependency[0] == 'base') return;
		if (fs.existsSync(process.env.APPDATA + '/Factorio/mods/' + dependency[0] + '/info.json')) {
			return;
		}
		return dependency;
	}).filter(dependency => {
		if (typeof dependency == 'undefined') return;
		return dependency;
	});


	console.log('Fetching dependencies [6/6] (0/' + (RequireDependencies.length + OptionalDependencies.length) + ')');

	OptionalDependencies = OptionalDependencies.map(dependency => {
		if (dependency[0] == 'base') return;
		if (fs.existsSync(process.env.APPDATA + '/Factorio/mods/' + dependency[0] + '/info.json')) {
			return;
		}
		return dependency;
	}).filter(dependency => {
		if (typeof dependency == 'undefined') return;
		return dependency;
	});

	const FetchedRequireDependencies = [];
	const FetchedOptionalDependencies = [];

	let k = 0;
	for await (const dependency of RequireDependencies) {
		clearLastLine();
		console.log('Fetching dependencies [6/6] (' + k + '/' + (RequireDependencies.length + OptionalDependencies.length) + ')');
		FetchedRequireDependencies.push(await fetchMod(dependency[0]));
		k++;
	}

	let l = 0;
	for await (const Mod of OptionalDependencies) {
		clearLastLine();
		console.log('Fetching dependencies [6/6] (' + (k + l) + '/' + (RequireDependencies.length + OptionalDependencies.length) + ')');
		FetchedOptionalDependencies.push(await fetchMod(Mod[0]));
		l++;
	}

	if (FetchedOptionalDependencies.length + FetchedOptionalDependencies.length != 0) {
		clearLastLine();
		console.log('Fetching dependencies [6/6] (' + (RequireDependencies.length + OptionalDependencies.length) + '/' + (RequireDependencies.length + OptionalDependencies.length) + ')');
	}

	if (FetchedRequireDependencies.length > 0) {
		clearLastLine();
		console.log(chalk.red('Required') + (FetchedRequireDependencies.length == 1 ? ' dependency aren\'t installed.' : ' dependencies aren\'t installed.'));
		await inquirer.prompt([
			{
				type: 'checkbox',
				name: 'required',
				message: 'Which of them do you want to install ?',
				choices: FetchedRequireDependencies.map(dependency => {
					return {
						name: dependency.name,
						value: dependency
					};
				})
			}
		]).then(async answers => {
			clearLastLine(2);
			if (answers.required.length == 0) return;
			for await (const Mod of answers.required) {
				try {
					await install(Mod, dataLocation);
				} catch (err) {
					console.log('\n' + chalk.yellow('Oops, an error occured:\n') + err);
					return;
				}
			}
		});
	}

	if (FetchedOptionalDependencies.length != 0) {
		clearLastLine();
		console.log((FetchedOptionalDependencies.length == 1 ? chalk.yellow('Optional') + ' dependency aren\'t installed.' : chalk.yellow('Optionals') + ' dependencies aren\'t installed.'));

		await inquirer.prompt([
			{
				type: 'checkbox',
				name: 'optional',
				message: 'Which of them do you want to install ?',
				choices: FetchedOptionalDependencies.map(dependency => {
					return {
						name: dependency.name,
						value: dependency
					};
				})
			}
		]).then(async answers => {
			clearLastLine(2);
			if (answers.optional.length == 0) return;
			for await (const Mod of answers.optional) {
				try {
					install(Mod, dataLocation);
				} catch (err) {
					console.log('\n' + chalk.yellow('Oops, an error occured:\n') + err);
					return;
				}
				console.log(chalk.green(Mod.name) + ' installed!');
			}
		});
	}

}

module.exports = { dependencies };