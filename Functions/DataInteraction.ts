import fs from 'fs';

import Mod from '../Classes/Mod';

const APPDATA = process.env.APPDATA;

function getInstalledModsList() {
	const DATADIR = APPDATA + '/Factorio/mods/';
	const mods: Array<string> = [];
	fs.readdirSync(DATADIR).forEach(v => {
		if (fs.lstatSync(DATADIR + v).isDirectory()) {
			mods.push(v);
		}
	});
	return mods;
}

function getInstalledMods() {
	const DATADIR = APPDATA + '/Factorio/mods/';
	const mods: Array<Mod> = [];
	fs.readdirSync(DATADIR).forEach(v => {
		if (fs.lstatSync(DATADIR + v).isDirectory()) {
			const tempMod = JSON.parse(fs.readFileSync(DATADIR + v + '/info.json').toString());
			const mod = new Mod(tempMod.name, tempMod.title, tempMod.version, tempMod.author, tempMod?.dependencies, tempMod?.description);
			mods.push(mod);
		}
	});
	return mods;
}



const DataInteraction = {
	Installed: {
		getMods: getInstalledMods,
		getModsList: getInstalledModsList
	}
};
export default DataInteraction;