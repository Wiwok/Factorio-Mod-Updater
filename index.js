const chalk = require('chalk');
const request = require('request-promise');
const inquirer = require('inquirer');
const prompt = require('prompt-sync')();
const fs = require('fs');
const path = require('path');
const del = require('del');

const { fetchMod } = require('./functions/fetchMod');
const { update } = require('./commands/update');
const { search } = require('./functions/search');

const { install } = require('./functions/install');
const { download } = require('./functions/download');

if (!fs.existsSync(process.env.APPDATA + '/Factorio Mod Updater/')) {
	fs.mkdirSync(process.env.APPDATA + '/Factorio Mod Updater/');
	fs.writeFileSync(process.env.APPDATA + '/Factorio Mod Updater/config.json', {});
}

if (fs.existsSync(process.env.APPDATA + '/Factorio Mod Updater/downloads/')) {
	del.sync(process.env.APPDATA + '/Factorio Mod Updater/downloads/', { force: true });
}
fs.mkdirSync(process.env.APPDATA + '/Factorio Mod Updater/downloads/');

const dataLocation = path.resolve(process.env.APPDATA + '/Factorio Mod Updater/');


process.title = ('Factorio Online Mod Updater');

async function uninstall() {
	await inquirer.prompt([
		{
			type: 'input',
			name: 'uninstall',
			message: 'Enter the name of the mod you want to uninstall:',
			validate: value => {
				if (value.length) {
					return true;
				} else {
					return 'Please enter a mod name';
				}
			}
		}
	]).then(async answers => {
		const modName = answers.uninstall;
		const modPath = process.env.APPDATA + '/factorio/mods/' + modName + '/';
		const mods = [];
		const modsName = [];
		fs.readdirSync(path.resolve(process.env.APPDATA + '/factorio/mods/')).forEach(mod => {
			if (fs.lstatSync(path.resolve(process.env.APPDATA + '/factorio/mods/' + mod)).isFile()) return;
			const infos = JSON.parse(fs.readFileSync(path.resolve(process.env.APPDATA + '/factorio/mods/' + mod + '/info.json')));
			mods.push(infos);
			modsName.push(infos.title);
		});
		if (fs.existsSync(modPath)) {
			del.sync(modPath, { force: true });
			console.log(chalk.green('Mod uninstalled successfully.'));
		} else {
			const modIndex = modsName.findIndex(e => e.includes(modName));
			if (modIndex == -1) {
				console.log(chalk.yellow('Mod not found.'));
			} else {
				await inquirer.prompt([
					{
						type: 'confirm',
						name: 'uninstallConfirm',
						message: 'Do you want to uninstall ' + chalk.green(modsName[modIndex]) + '?'
					}
				]).then(async a => {
					if (!a.uninstallConfirm) return;
					const mod = mods[modIndex].name;
					del.sync(path.resolve(process.env.APPDATA + '/factorio/mods/' + mod + '/'), { force: true });
					console.log(chalk.green('Mod uninstalled successfully.'));
				});

			}
		}
	});
}

async function URLverification() {
	if (fs.existsSync(path.resolve(process.env.APPDATA + '/Factorio Mod Updater/config.json'))) {
		process.dbSite = JSON.parse(fs.readFileSync(process.env.APPDATA + '/Factorio Mod Updater/config.json'));
	} else {
		let validURL = false;
		console.log('\n');
		console.log(chalk.red('Error, the site that provides the mods is not defined.'));
		while (!validURL) {
			await inquirer.prompt([
				{
					type: 'input',
					name: 'dbSite',
					message: 'Please enter the URL of the site you want to use:',

					validate: value => {
						// eslint-disable-next-line no-useless-escape
						if (value.match(/(^| )(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,8}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi)) {
							return true;
						}
						return 'Please enter a valid URL';
					}
				}
			]).then(async answers => {
				console.log('Testing the given site...');
				let URL = answers.dbSite;
				if (URL.endsWith('/')) URL = URL.substring(0, URL.length - 1);
				try {
					await download(URL + '/flib/0.10.1.zip', process.env.APPDATA + '/Factorio Mod Updater/mods/test.zip');
					fs.unlinkSync(process.env.APPDATA + '/Factorio Mod Updater/mods/test.zip');
					fs.writeFileSync(process.env.APPDATA + '/Factorio Mod Updater/config.json', JSON.stringify(URL));
					console.log(chalk.green('Success !'));
					console.log('The URL is valid.');
					validURL = true;
					prompt('Press Enter to continue...');
				} catch (err) {
					console.log('\n' + chalk.red('Error, the given URL does not work.') + '\nIf you think this is a bug, please report it at:\n' + chalk.yellow('https://github.com/Wiwok/Factorio-Online-Mod-Updater/issues'));
				}
			});
		}
	}
}

async function ask() {
	await inquirer.prompt([
		{
			type: 'input',
			name: 'modName',
			message: 'Enter the name of the mod you want to install:',

			validate: value => {
				if (value.length) {
					return true;
				} else {
					return 'Please enter a mod name';
				}
			}
		}
	]).then(async answers => {
		try {
			if (await request({ url: 'https://mods.factorio.com/mod/' + answers.modName, method: 'HEAD' }).catch(async err => {
				if (err.statusCode == 404) {
					const Search = await search(answers.modName);
					if (typeof Search[0] != 'undefined') {
						answers.modName = Search[0].rawName;
						return true;
					} else {
						console.log(chalk.red('Mod not found.'));
						return null;
					}
				} else if (err.error.code == 'ENOTFOUND') {
					console.log(chalk.red('Error'));
					console.log('Can I have internet please ?');
					return null;
				} else {
					console.log(err);
					return null;
				}
			}) == null) {
				return;
			}
		} catch (err) {
			console.log(err);
		}

		console.log(chalk.green('\nFetching mod...\n'));
		const mod = await fetchMod(answers.modName).then(Mod => {
			console.log('Name: ' + Mod.name);
			console.log('Author: ' + Mod.author);
			console.log('Version: ' + Mod.version);
			console.log('Last update: ' + Mod.lastUpdate);
			console.log('Creation: ' + Mod.creation);
			console.log('Downloads: ' + Mod.downloads);
			return Mod;
		});
		console.log('\n');
		await inquirer.prompt([
			{
				type: 'confirm',
				name: 'install',
				message: 'Do you want to install it?',
				default: true
			}
		]).then(async Answers => {
			if (Answers.install) {
				if (fs.existsSync(path.resolve(process.env.APPDATA + '/factorio/mods/' + mod.rawName + '/'))) {
					console.log(chalk.red('\nMod already installed.\n'));
					return;
				}
				try {
					console.log('\n' + chalk.bgGray(chalk.black(mod.description)) + '\n');
					await install(mod, dataLocation);
				} catch (err) {
					console.log('\n' + chalk.yellow('Oops, an error occured:\n') + err);
					return;
				}
				console.log(chalk.green(mod.name) + ' installed!');
			}
		});
	});
}


async function main() {
	let quit = false;
	while (!quit) {
		console.clear();
		console.log('\n');
		console.log(chalk.green('	Factorio Mod Updater'));
		console.log('\n');
		await inquirer.prompt([
			{
				type: 'list',
				name: 'type',
				message: 'What do you want to do?',
				choices: [
					'Install a mod',
					'Update my mods',
					'Uninstall a mod',
					'Exit'
				]
			}
		]).then(async answers => {
			if (answers.type == 'Install a mod') {
				console.clear();
				console.log('\n');
				await ask();
			} else if (answers.type == 'Update my mods') {
				console.clear();
				console.log('\n');
				await update();
			} else if (answers.type == 'Uninstall a mod') {
				console.clear();
				console.log('\n');
				await uninstall();
			} else {
				quit = true;
			}
		});
		if (!quit) {
			console.log('\n');
			prompt('Press enter to continue...');
		}
	}
	console.clear();
	process.exit();
}

console.clear();
URLverification().then(() => main());