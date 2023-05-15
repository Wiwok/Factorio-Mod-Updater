import chalk from 'chalk';

import DataInteraction from './Functions/DataInteraction';
import HighLevelActions from './Functions/HighLevelActions';
import OnlineInteractions from './Functions/OnlineInteractions';
import UserInteration from './Functions/UserInteraction';
import ConsoleInteractions from './Functions/ConsoleInteractions';

const APPV = '2.2.0';

async function Install() {
	console.clear();
	console.log(chalk.bgGray('Install a mod') + '\n');

	const isOnline = await OnlineInteractions.checkInternet();

	if (!isOnline) {
		console.log(chalk.redBright('Please check your internet connection'));
		UserInteration.GoBackToMenu();
		return;
	}


	let modName = await UserInteration.Prompt('What mod do you want to install?');
	if (!await OnlineInteractions.checkModExist(modName)) {
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
		modName = await UserInteration.Choices(modList.length + ' mods found:', modList);
	}
	if (DataInteraction.Installed.isInstalled(modName)) {
		const mod = DataInteraction.Installed.fetchMod(modName);
		if (typeof mod == 'undefined') {
			UserInteration.GoBackToMenu();
			return;
		}
		console.log('Mod: ' + chalk.bold(mod.title));
		console.log('Author: ' + mod.author);
		console.log('Version: ' + mod.version);
		if (mod.description) {
			console.log('Description:\n' + mod.description);
		}
		console.log(chalk.yellow('This mod is already installed'));
		UserInteration.GoBackToMenu();
		return;
	}
	const mod = await OnlineInteractions.fetchMod(modName);
	if (typeof mod == 'undefined') {
		UserInteration.GoBackToMenu();
		return;
	}
	console.log('Mod: ' + chalk.bold(mod.title));
	console.log('Author: ' + mod.author);
	console.log('Version: ' + mod.version);
	if (mod.description) {
		console.log('Description:\n' + chalk.gray(mod.description));
	}
	if (!await UserInteration.Valid('Install it?')) {
		UserInteration.GoBackToMenu();
		return;
	}
	console.log('');
	await HighLevelActions.InstallMod(mod, 'install');
	UserInteration.GoBackToMenu();
	return;
}

async function Uninstall() {
	console.clear();
	console.log(chalk.bgGray('Uninstall a mod') + '\n');

	const modList = DataInteraction.Installed.getMods();

	if (modList.length == 0) {
		console.log(chalk.redBright('No mods found'));
		UserInteration.GoBackToMenu();
		return;
	}

	const choices = modList.map(mod => {
		return { name: mod.title, value: mod.name };
	});

	const modName = await UserInteration.Choices('What mod do you want to uninstall?', choices);

	const mod = DataInteraction.Installed.fetchMod(modName);
	if (typeof mod == 'undefined') {
		UserInteration.GoBackToMenu();
		return;
	}
	console.log('Mod: ' + chalk.bold(mod.title));
	console.log('Author: ' + mod.author);
	console.log('Version: ' + mod.version);
	if (mod.description) {
		console.log('Description:\n' + mod.description);
	}
	if (!await UserInteration.Valid('Uninstall it?')) {
		UserInteration.GoBackToMenu();
		return;
	}
	console.log('');
	HighLevelActions.UninstallMod(mod);
	UserInteration.GoBackToMenu();
	return;
}

async function Update() {
	console.clear();
	console.log(chalk.bgGray('Update my mods') + '\n');

	const isOnline = await OnlineInteractions.checkInternet();

	if (!isOnline) {
		console.log(chalk.redBright('Please check your internet connection'));
		UserInteration.GoBackToMenu();
		return;
	}

	await HighLevelActions.UpdateAllMods();
	UserInteration.GoBackToMenu();
}

function About() {
	console.clear();
	console.log(chalk.bgGray('Factorio Mod Updater') + '\n');
	console.log('Maintained by ' + chalk.bold('Wiwok'));
	console.log('Version: ' + APPV);
	UserInteration.GoBackToMenu();
}

async function main() {
	let exit = false;
	while (!exit) {
		console.clear();
		console.log(chalk.bgGray('Factorio Mod Updater') + '\n');

		const nav = await UserInteration.Choices('What do you want to do ?', [{ name: 'Install a mod', value: 'install' }, { name: 'Update my mods', value: 'update' }, { name: 'Uninstall a mod', value: 'uninstall' }, { name: 'About', value: 'about' }, { name: 'Quit', value: 'exit' }]);
		if (nav == 'install') {
			await Install();
		} else if (nav == 'update') {
			await Update();
		} else if (nav == 'uninstall') {
			await Uninstall();
		} else if (nav == 'about') {
			About();
		} else {
			console.clear();
			exit = true;
		}
	}
	process.exit();
}

DataInteraction.clearTemp();
main();