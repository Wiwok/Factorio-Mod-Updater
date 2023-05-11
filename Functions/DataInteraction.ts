import fs from 'fs';

import Mod from '../Classes/Mod';

const APPDATA = process.env.APPDATA;

const MODDIR = APPDATA + '/Factorio/mods/';

function getInstalledModsList() {
	const mods: Array<string> = [];
	fs.readdirSync(MODDIR).forEach(v => {
		if (fs.lstatSync(MODDIR + v).isDirectory()) {
			mods.push(v);
		}
	});
	return mods;
}

function getInstalledMods() {
	const mods: Array<Mod> = [];
	fs.readdirSync(MODDIR).forEach(v => {
		if (fs.lstatSync(MODDIR + v).isDirectory()) {
			const tempMod = JSON.parse(fs.readFileSync(MODDIR + v + '/info.json').toString());
			const mod = new Mod(tempMod.name, tempMod.title, tempMod.version, tempMod.author, tempMod?.dependencies, tempMod?.description);
			mods.push(mod);
		}
	});
	return mods;
}

function Unpack(archive: string) {

}


const DataInteraction = {
	Installed: {
		getMods: getInstalledMods,
		getModsList: getInstalledModsList
	}
};
export default DataInteraction;