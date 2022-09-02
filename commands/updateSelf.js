const request = require('request-promise');
const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');
const prompt = require('prompt-sync')();

const { download } = require('../functions/download');

const programVersion = 'v0.0.0';

async function updateSelf() {
	const releases = await request({
		url: 'https://api.github.com/repos/Wiwok/Factorio-Mod-Updater/releases', headers: {
			'User-Agent': 'Request-Promise'
		}, json: true
	}).catch(err => {
		if (err.error.code == 'ENOTFOUND') {
			console.log(chalk.red('Error'));
			console.log('Can I have internet please ?');
			return null;
		} else {
			console.log(err);
			return null;
		}
	});

	if (releases) {
		if (releases[0].name == programVersion) {
			console.log(chalk.green('You have the lastest version !'));
			return;
		}
		console.log(chalk.green('Wow, an update is avaliable !'));
		console.log('Change log:\n' + chalk.bgGrey(chalk.black(releases[0].body)) + '\n\n');
		await inquirer.prompt([
			{
				type: 'confirm',
				name: 'install',
				message: 'Do you want to install it?',
				default: true
			}
		]).then(async Answers => {
			if (Answers.install) {
				const assets = releases[0].assets;
				await inquirer.prompt([
					{
						type: 'list',
						name: 'version',
						message: 'Which version do you want ?',
						choices: [
							{
								name: `Windows (${(assets[2].size / 1000000).toFixed(2)}Mo)`,
								value: 'win'
							},
							{
								name: `MacOS (${(assets[1].size / 1000000).toFixed(2)}Mo)`,
								value: 'mac'
							},
							{
								name: `Linux (${(assets[0].size / 1000000).toFixed(2)}Mo)`,
								value: 'linux'
							}
						]
					}
				]).then(answers => {
					const version = answers.version;
					let link;
					if (version == 'linux') {
						link = assets[0].browser_download_url;
					} else if (version == 'mac') {
						link = assets[1].browser_download_url;
					} else {
						link = assets[2].browser_download_url;
					}
					let filePath = process.env.APPDATA + '/Factorio Mod Updater/Factorio Mod Updater';
					if (version == 'win') {
						filePath = process.env.APPDATA + '/Factorio Mod Updater/Factorio Mod Updater.exe';
					}
					if (fs.existsSync(filePath)) {
						fs.unlinkSync(filePath);
					}

					download(link, filePath).then(() => {
						console.log(chalk.green('Done !') + '\nThe program will stop, you can delete the old version.');
						prompt();
						process.exit();
					});
				});
			}
		});
	}
}

updateSelf();

module.exports = { updateSelf };