import chalk from 'chalk';
import { existsSync } from 'fs';
import { createServer } from 'http';

import ConsoleInteractions from './Functions/ConsoleInteractions';
import DataInteraction from './Functions/DataInteraction';
import HighLevelActions from './Functions/HighLevelActions';
import OnlineInteractions from './Functions/OnlineInteractions';
import UserInteration from './Functions/UserInteraction';

const APPV = '2.5.0';

async function Install() {
	console.clear();
	console.log(chalk.bgGray('Install a mod') + '\n');

	if (!(await OnlineInteractions.checkInternet())) {
		console.log(chalk.redBright('Please check your internet connection'));
		UserInteration.GoBackToMenu();
		return;
	}

	let modName = await UserInteration.Prompt('What mod do you want to install?');
	if (modName == '') {
		UserInteration.GoBackToMenu();
		return;
	}
	let mod = await OnlineInteractions.fetchMod(modName).catch(() => {
		return;
	});
	if (typeof mod == 'undefined') {
		console.log('Searching...');
		const modList = (await OnlineInteractions.searchMod(modName)).map(v => {
			return { name: v.title, value: v.name };
		});
		ConsoleInteractions.clearLine();
		if (modList.length == 0) {
			console.log(chalk.redBright('No matching mods found'));
			UserInteration.GoBackToMenu();
			return;
		}
		if (modList.length == 1) {
			modName = modList[0].value;
		} else {
			modList.push({ name: chalk.redBright('Go back'), value: 'quit' });
			modName = await UserInteration.Choices(modList.length - 1 + ' mods found:', modList);
			if (modName == 'quit') return;
		}
		mod = await OnlineInteractions.fetchMod(modName);
	}
	if (DataInteraction.Installed.isInstalled(modName)) {
		const LocalMod = DataInteraction.Installed.fetchMod(modName);
		if (typeof LocalMod == 'undefined') {
			UserInteration.GoBackToMenu();
			return;
		}
		LocalMod.print(mod.version);
		if (mod.version != LocalMod.version) {
			console.log('');
			console.log(chalk.yellow('This mod is already installed but an update is available.'));
			if (await UserInteration.Valid('Would you like to update it ?', true)) {
				console.log('');
				await HighLevelActions.installMod(mod, 'update');
			}
		} else {
			console.log(chalk.yellow('This mod is already installed'));
		}
		UserInteration.GoBackToMenu();
		return;
	}
	mod.print();
	if (await UserInteration.Valid('Install it?')) {
		console.log('');
		await HighLevelActions.installMod(mod, 'install');
	}
	UserInteration.GoBackToMenu();
	return;
}

async function Update() {
	console.clear();
	console.log(chalk.bgGray('Update mods') + '\n');

	const List = DataInteraction.Installed.getList();

	if (List.length == 0) {
		console.log(chalk.redBright('No mods found'));
		UserInteration.GoBackToMenu();
		return;
	}

	if (!(await OnlineInteractions.checkInternet())) {
		console.log(chalk.redBright('Please check your internet connection'));
		UserInteration.GoBackToMenu();
		return;
	}

	await HighLevelActions.updateAllMods();
	UserInteration.GoBackToMenu();
}

async function Uninstall() {
	console.clear();
	console.log(chalk.bgGray('Uninstall mods') + '\n');

	const List = DataInteraction.Installed.getList();

	if (List.length == 0) {
		console.log(chalk.redBright('No mods found'));
		UserInteration.GoBackToMenu();
		return;
	}

	const modList = DataInteraction.Installed.getMods();

	const choices = modList.map(mod => {
		return { name: mod.title, value: mod.name };
	});

	if (choices.length != 1) choices.unshift({ name: chalk.black(chalk.bgWhite('Every mods')), value: '*' });
	choices.push({ name: chalk.redBright('Go back'), value: 'quit' });

	const modName = await UserInteration.Choices('Which mod do you want to uninstall?', choices);
	console.log('');

	if (modName == '*') {
		console.log(chalk.redBright('⚠️WARNING⚠️'));
		if (await UserInteration.Valid('Do you want to remove ALL of your mods?', false)) {
			console.log('');
			modList.forEach(mod => {
				HighLevelActions.uninstallMod(mod);
			});
		}
	} else if (modName == 'quit') {
		return;
	} else {
		const mod = DataInteraction.Installed.fetchMod(modName);
		if (typeof mod == 'undefined') {
			UserInteration.GoBackToMenu();
			return;
		}
		mod.print();
		console.log('');

		if (await UserInteration.Valid('Do you want to uninstall it?')) {
			console.log('');
			const dep = HighLevelActions.isModUnderDependency(mod);
			if (typeof dep != 'undefined') {
				console.log(chalk.redBright('⚠️WARNING⚠️'));
				console.log('This mod is required for ' + chalk.bold(dep.title) + ' to work.');
				if (await UserInteration.Valid('Do you want to uninstall it anyway?', false)) {
					HighLevelActions.uninstallMod(mod);
				}
			} else {
				HighLevelActions.uninstallMod(mod);
			}
		}
	}

	console.log('');
	UserInteration.GoBackToMenu();
	return;
}

function About() {
	console.clear();
	console.log(chalk.bgGray('Factorio Mod Updater') + '\n');
	console.log('Maintained by ' + chalk.bold('Wiwok'));
	console.log('Version: ' + chalk.underline(APPV));
	UserInteration.GoBackToMenu();
}

async function main() {
	let exit = false;
	while (!exit) {
		console.clear();
		console.log(chalk.bgGray('Factorio Mod Updater') + '\n');

		const nav = await UserInteration.Choices('What do you want to do ?', [
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

function Starting() {
	process.title = 'Factorio Mod Updater (v' + APPV + ')';
	console.clear();

	if (!DataInteraction.clearTemp()) {
		console.log(chalk.redBright('An error occurred.'));
		console.log('Press enter to quit...');
		UserInteration.Pause();
		console.clear();
		process.exit();
	}

	if (!existsSync(process.env.APPDATA + '/Factorio/mods/')) {
		console.log(chalk.redBright('Factorio mods folder not found.'));
		console.log('Press enter to quit...');
		UserInteration.Pause();
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
		UserInteration.Pause();
		console.clear();
		process.exit();
	});

	server.once('listening', async () => {
		while (true) {
			if (!(await HighLevelActions.isGameRunning())) break;
			console.log(chalk.redBright('Factorio is running. Please close the game to avoid file corruption.'));
			console.log('Press enter to retry...');
			UserInteration.Pause();
			console.clear();
		}
		main();
	});
}

Starting();
