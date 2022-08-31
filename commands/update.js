const chalk = require('chalk');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const del = require('del');

const { fetchMod } = require('../functions/fetchMod.js');

const dataLocation = path.resolve(process.env.APPDATA + '/Factorio Mod Updater/');

const { install } = require('../functions/install.js');


async function update() {
	const appdata = process.env.APPDATA;

	let mods = fs.readdirSync(path.resolve(appdata + '/Factorio/mods/'), 'utf8');
	mods = mods.filter(mod => !mod.includes('.'));

	const modsList = [];
	let i = 0;
	for await (const mod of mods) {
		console.clear();
		console.log(`
		
${chalk.green('	Checking updates for ' + mods.length + ' mods...')}


Fetching mod ${i + 1} of ${mods.length}`);
		i++;
		await fetchMod(mod).then(m => {
			if (m) {
				m.oldVersion = JSON.parse(fs.readFileSync(path.resolve(appdata + '/factorio/mods/' + mod + '/info.json'))).version;
				modsList.push(m);
			}
		});
	}

	const updates = [];
	for await (const mod of modsList) {
		if (mod.oldVersion != mod.version) updates.push(mod);
	}
	console.clear();
	if (!updates.length) {
		console.log(chalk.green('\n\n	No updates found.'));
		return;
	}
	if (updates.length == 1) {
		console.log(chalk.green('\n	Found 1 update:'));
	} else {
		console.log(chalk.green('\n	Found ' + updates.length + ' updates: \n'));
	}
	updates.forEach(mod => {
		console.log(console.log(chalk.magenta(mod.name) + ': ' + chalk.yellow(mod.oldVersion) + ' -> ' + chalk.blueBright(mod.oldVersion) + '\n'));
	});
	await inquirer.prompt([
		{
			type: 'checkbox',
			name: 'update',
			message: 'Which of them do you want to install?',
			choices: () => {
				return updates.map(u => {
					return {
						name: u.name,
						value: u
					};
				});
			}
		}
	]).then(async answers => {
		const Update = answers.update;
		if (Update.length == 0) return;
		try {
			console.log(chalk.green('\n	Updating mods...\n'));
			let j = 0;
			for await (const mod of Update) {
				j++;
				await install(mod, dataLocation, `[${j}/${Update.length}]`);
			}
		} catch (err) {
			console.log('\n' + chalk.yellow('Oops, an error occured: ') + err);
			console.log('\n');
			console.log(chalk.green('Trying to restoring backup...\n'));
			try {
				fse.copySync(path.resolve(dataLocation + '/backup/'), appdata + '/Factorio/mods/', { overwrite: true });
			} catch (err) {
				console.log('\nI\'m sorry, but I can\'t restore your backup. Please try again.');
				return;
			}

			if (fs.existsSync(process.env.APPDATA + '/Factorio Mod Updater/')) {
				del.sync(process.env.APPDATA + '/Factorio Mod Updater/', { force: true });
			}
			fs.mkdirSync(process.env.APPDATA + '/Factorio Mod Updater/');
			fs.mkdirSync(process.env.APPDATA + '/Factorio Mod Updater/downloads/');
			fs.mkdirSync(process.env.APPDATA + '/Factorio Mod Updater/mods/');
			fs.mkdirSync(process.env.APPDATA + '/Factorio Mod Updater/backup/');

			console.log(chalk.green('Backup restored!'));
		}
		console.log(chalk.green('Done!'));
	});
}

module.exports = { update };