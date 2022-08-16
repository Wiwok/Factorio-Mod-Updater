const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const del = require('del');

const { download } = require('./download');
const { unzip } = require('./unzip');
const { dependencies } = require('../commands/dependencies');
const { clearLastLine } = require('./clearLastLine');

async function install(Mod, dataLocation, prefix) {
	const dbSite = process.dbSite;
	if (typeof prefix == 'undefined') {
		prefix = '';
	} else {
		prefix += ' ';
	}

	console.log(prefix + 'Downloading ' + Mod.name + ' [1/6]');
	await download(`${dbSite}/${Mod.rawName}/${Mod.version}.zip`, dataLocation + '/downloads/' + Mod.rawName + '.zip');
	clearLastLine();
	console.log(prefix + 'Unpacking ' + Mod.name + ' [2/6]');
	await unzip(dataLocation + '/downloads/' + Mod.rawName + '.zip', path.resolve(dataLocation + '/mods/'));
	clearLastLine();
	console.log(prefix + 'Preparing ' + Mod.name + ' [3/6]');
	fs.unlinkSync(dataLocation + '/downloads/' + Mod.rawName + '.zip');
	fs.renameSync(path.resolve(dataLocation + '/mods/' + fs.readdirSync(dataLocation + '/mods/')[0]), path.resolve(dataLocation + '/mods/' + Mod.rawName));
	del.sync(process.env.APPDATA + '/factorio/mods/' + Mod.rawName + '/', { force: true });
	fs.mkdirSync(process.env.APPDATA + '/factorio/mods/' + Mod.rawName + '/');
	clearLastLine();
	console.log(prefix + 'Installing ' + Mod.name + ' [4/6]');
	fse.copySync(path.resolve(dataLocation + '/mods/' + Mod.rawName + '/'), process.env.APPDATA + '/factorio/mods/' + Mod.rawName + '/');
	clearLastLine();
	console.log(prefix + 'Finishing ' + Mod.name + ' [5/6]');
	del.sync(path.resolve(dataLocation + '/mods/' + fs.readdirSync(dataLocation + '/mods/')[0]), { force: true });
	clearLastLine();
	await dependencies(Mod);
}

module.exports = { install };