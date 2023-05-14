import chalk from 'chalk';

import DataInteraction from './Functions/DataInteraction';
import HighLevelActions from './Functions/HighLevelActions';
import OnlineInteractions from './Functions/OnlineInteractions';
import UserInteration from './Functions/UserInteraction';

async function Install() {
	console.clear();
	console.log(chalk.bgGray('Install a mod') + '\n');

	const isOnline = await OnlineInteractions.checkInternet();

	if (!isOnline) {
		console.log(chalk.redBright('Please check your internet connection'));
		UserInteration.GoBackToMenu();
		return;
	}


	const modName = await UserInteration.Prompt('What mod do you want to install?');
	if (!await OnlineInteractions.checkModExist(modName)) {
		console.log(chalk.redBright('Mod not found'));
		UserInteration.GoBackToMenu();
		return;
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
	const modName = await UserInteration.Prompt('What mod do you want to uninstall?');
	if (!DataInteraction.Installed.isInstalled(modName)) {
		console.log(chalk.redBright('Mod not installed'));
		UserInteration.GoBackToMenu();
		return;
	}
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

async function main() {
	let exit = false;
	while (!exit) {
		console.clear();
		console.log('Welcome to ' + chalk.bgGray('Factorio Mod Updater') + '\n');

		const nav = await UserInteration.Choices('What do you want to do ?', [{ name: 'Install a mod', value: 'install' }, { name: 'Update my mods', value: 'update' }, { name: 'Uninstall a mod', value: 'uninstall' }, { name: 'Quit', value: 'exit' }]);
		if (nav == 'install') {
			await Install();
		} else if (nav == 'update') {
			await Update();
		} else if (nav == 'uninstall') {
			await Uninstall();
		} else {
			console.clear();
			exit = true;
		}
	}
	process.exit();
}

DataInteraction.clearTemp();
main();