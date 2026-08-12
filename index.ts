import { search } from '@inquirer/prompts';
import chalk from 'chalk';
import { createServer } from 'node:http';

import DataInteraction from './Functions/DataInteraction';
import HighLevelActions from './Functions/HighLevelActions';
import OnlineInteractions from './Functions/OnlineInteractions';
import UserInteraction from './Functions/UserInteraction';
import exists from './Tools/exists';

const APPV = '2.6.0';

const doSearch = async (input: string, signal: AbortSignal, modsInstalled: string[]) => {
	if (signal.aborted || input.length < 2) return [];
	const mods = await OnlineInteractions.searchMod(input);
	if (!mods) return undefined;
	return Promise.all(
		mods.map(async mod => ({
			name: mod.title,
			value: mod.name,
			description: mod.description,
			disabled: modsInstalled.includes(mod.name) ? '-- Already installed' : false
		}))
	);
};

async function Install() {
	console.clear();
	console.log(chalk.bgGray('Install a mod') + '\n');

	if (!(await OnlineInteractions.checkInternet())) {
		console.log(chalk.redBright('Please check your internet connection'));
		UserInteraction.GoBackToMenu();
		return;
	}

	const modsInstalled = await DataInteraction.Installed.getMods();

	const modName = await search({
		message: 'Search a mod to install',
		source: async (input, { signal }) => {
			if (!input) return [];
			await new Promise(resolve => setTimeout(resolve, 300));
			if (signal.aborted) return [];
			return (await doSearch(input, signal, modsInstalled)) ?? [];
		}
	}).catch(err => {
		if (err?.name !== 'ExitPromptError') console.error(chalk.red(err.message ?? 'An error occurred'));
	});

	if (!modName) return;

	const mod = await OnlineInteractions.fetchMod(modName).catch(err => {
		console.error(chalk.red('Could not fetch mod:'), err);
		return undefined;
	});

	console.log('');
	if (!mod) return;

	const LocalMod = await DataInteraction.Installed.getMod(mod.name);
	if (LocalMod != undefined) {
		LocalMod.print(mod.version);
		if (mod.version != LocalMod.version) {
			console.log('');
			console.log(chalk.yellow('This mod is already installed but an update is available.'));
			if (await UserInteraction.Valid('Would you like to update it ?', true)) {
				console.log('');
				await HighLevelActions.installMod(mod, 'update');
			}
		} else {
			console.log(chalk.yellow('This mod is already installed'));
		}
		UserInteraction.GoBackToMenu();
		return;
	}
	mod.print();
	if (await UserInteraction.Valid('Install it?')) {
		console.log('');
		await HighLevelActions.installMod(mod, 'install');
	}
	UserInteraction.GoBackToMenu();
	return;
}

async function Update() {
	console.clear();
	console.log(chalk.bgGray('Update mods') + '\n');

	const mods = await DataInteraction.Installed.fetchMods();

	if (mods.length == 0) {
		console.log(chalk.redBright('No mods found'));
		UserInteraction.GoBackToMenu();
		return;
	}

	if (!(await OnlineInteractions.checkInternet())) {
		console.log(chalk.redBright('Please check your internet connection'));
		UserInteraction.GoBackToMenu();
		return;
	}

	await HighLevelActions.updateAllMods(mods);
	UserInteraction.GoBackToMenu();
}

async function Uninstall() {
	console.clear();
	console.log(chalk.bgGray('Uninstall mods') + '\n');

	const mods = await DataInteraction.Installed.fetchMods();

	if (mods.length == 0) {
		console.log(chalk.redBright('No mods found'));
		UserInteraction.GoBackToMenu();
		return;
	}

	const choices = mods.map(mod => ({
		name: mod.title,
		value: mod.name,
		description: mod.description
	}));

	const modName = await search({
		message: 'Select a mod to uninstall',
		source: async input => {
			if (!input) {
				return choices;
			}

			return choices.filter(mod => mod.name.toLowerCase().includes(input.toLowerCase()));
		}
	}).catch(() => undefined);
	console.log('');

	if (modName == undefined) {
		return;
	} else {
		const mod = await DataInteraction.Installed.getMod(modName);
		if (typeof mod == 'undefined') {
			UserInteraction.GoBackToMenu();
			return;
		}
		mod.print();
		console.log('');

		if (await UserInteraction.Valid('Do you want to uninstall it?')) {
			console.log('');
			const dep = await mod.isModUnderDependency();
			if (typeof dep != 'undefined') {
				console.log(chalk.redBright('⚠️WARNING⚠️'));
				console.log('This mod is required for ' + chalk.bold(dep.title) + ' to work.');
				if (await UserInteraction.Valid('Do you want to uninstall it anyway?', false)) {
					console.log('');
					await HighLevelActions.uninstallMod(mod);
				}
			} else {
				await HighLevelActions.uninstallMod(mod);
			}
		}
	}

	console.log('');
	UserInteraction.GoBackToMenu();
}

function About() {
	console.clear();
	console.log(chalk.bgGray('Factorio Mod Updater') + '\n');
	console.log('Maintained by ' + chalk.bold('Wiwok'));
	console.log('Version: ' + chalk.underline(APPV));
	UserInteraction.GoBackToMenu();
}

async function main() {
	let exit = false;
	while (!exit) {
		console.clear();
		console.log(chalk.bgGray('Factorio Mod Updater') + '\n');

		const nav = await UserInteraction.Choices('What do you want to do ?', [
			{ name: 'Install', value: 'install' },
			{ name: 'Update', value: 'update' },
			{ name: 'Uninstall', value: 'uninstall' },
			{ name: 'About', value: 'about' },
			{ name: 'Quit', value: 'exit' }
		]);
		switch (nav) {
			case 'install':
				await Install();
				break;
			case 'update':
				await Update();
				break;
			case 'uninstall':
				await Uninstall();
				break;
			case 'about':
				About();
				break;
			case 'exit': {
				console.clear();
				exit = true;
			}
		}
	}
	process.exit();
}

async function Starting() {
	process.title = 'Factorio Mod Updater (v' + APPV + ')';
	console.clear();

	if (!(await DataInteraction.clearTemp())) {
		console.log(chalk.redBright('An error occurred.'));
		console.log('Press enter to quit...');
		UserInteraction.Pause();
		console.clear();
		process.exit();
	}

	if (!(await exists(process.env.APPDATA + '/Factorio/mods/'))) {
		console.log(chalk.redBright('Factorio mods folder not found.'));
		console.log('Press enter to quit...');
		UserInteraction.Pause();
		console.clear();
		process.exit();
	}

	const server = createServer();
	server.listen(8399);

	// Make sure this server doesn't keep the process running
	server.unref();

	server.on('error', () => {
		console.log(chalk.redBright("Factorio Mod Updater is already running. Can't run more than one instance."));
		console.log('Press enter to quit...');
		UserInteraction.Pause();
		console.clear();
		process.exit();
	});

	server.once('listening', async () => {
		while (true) {
			if (!(await HighLevelActions.isGameRunning())) break;
			console.log(chalk.redBright('Factorio is running. Please close the game to avoid file corruption.'));
			console.log('Press enter to retry...');
			UserInteraction.Pause();
			console.clear();
		}
		main();
	});
}

Starting();
