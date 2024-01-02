import axios from 'axios';
import { load } from 'cheerio';
import dns from 'dns';
import fs from 'fs';
import https from 'https';

import Mod from '../Classes/Mod';
import ConsoleInteractions from './ConsoleInteractions';

const MODTEMP = process.env.APPDATA + '/Factorio Mod Updater/';

const MODURL = 'https://mods.factorio.com/api/mods/';

const SEARCHURL = 'https://mods.factorio.com/downloaded?version=1.1&query=';

const DOWNLOADURL = 'https://mods-storage.re146.dev';

async function downloadMod(name: string, version: string) {
	return new Promise<void>((resolve, reject) => {
		https
			.get(`${DOWNLOADURL}/${name}/${version}.zip`, response => {
				const code = response.statusCode ?? 0;
				if (code >= 400) {
					reject(new Error(response.statusMessage));
				}
				const fileWriter = fs.createWriteStream(MODTEMP + 'mod.zip').on('finish', () => {
					clearInterval(interval);
					ConsoleInteractions.clearLine();
					resolve();
				});
				const fileSize = parseInt(response.headers['content-length'] as string, 10);
				const downloadSize = fileWriter.bytesWritten;
				const percentage = parseFloat(((downloadSize / fileSize) * 100).toFixed(2));
				console.log(
					`${ConsoleInteractions.ProgressBar((percentage / 10).toFixed(0))} ${percentage.toString()}%`
				);
				const interval = setInterval(() => {
					const actualPercentage = parseFloat(((fileWriter.bytesWritten / fileSize) * 100).toFixed(2));
					ConsoleInteractions.clearLine();
					console.log(
						`${ConsoleInteractions.ProgressBar(
							(actualPercentage / 5).toFixed(0)
						)} ${actualPercentage.toString()}%`
					);
				}, 50);
				response.pipe(fileWriter);
			})
			.on('error', error => {
				reject(error);
			});
	});
}

async function fetchMod(name: string) {
	return new Promise<Mod>(async resolve => {
		// @ts-ignore
		const datas = (await axios.get(MODURL + name).catch(() => resolve(undefined)))?.data;
		try {
			const title = datas?.title;
			const version = datas?.releases[datas?.releases?.length - 1]?.version;
			const author = datas?.owner;
			const description = datas?.summary ?? undefined;

			if ([title, author, version].includes(undefined)) {
				resolve(undefined);
				return;
			}

			resolve(new Mod(name, title, version, author, [], description));
		} catch {
			resolve(undefined);
		}
	});
}

async function fetchMods(Mods: Array<string>) {
	return new Promise<Array<Mod>>(async resolve => {
		const requests = Mods.map(mod => {
			return axios.get(MODURL + mod);
		});

		axios
			.all(requests)
			.then(responses => {
				const ModList = responses.map(response => {
					const datas = response.data;
					try {
						const title = datas?.title;
						const version = datas?.releases[datas?.releases?.length - 1]?.version;
						const author = datas?.owner;
						const description = datas?.summary ?? undefined;

						if ([title, author, version].includes(undefined)) {
							return;
						}

						return new Mod(datas?.name, title, version, author, [], description);
					} catch {}
				});
				resolve(ModList);
			})
			.catch();
	});
}

async function searchMod(search: string) {
	return new Promise<Array<Mod>>(async resolve => {
		const v = await axios.get(`${SEARCHURL}${search}`);
		const $ = load(v.data);

		const modList: Array<any> = [];

		$('.mb0').each((i, el) => {
			if (i % 2) {
				// @ts-ignore
				let name: Array<string> = el?.children[0]?.next?.attribs?.href?.split('');
				name.shift();
				name.shift();
				name.shift();
				name.shift();
				name.shift();

				// @ts-ignore
				const title = el?.children[0]?.next?.children[0]?.data;

				modList.push({ name: name.join(''), title: title });
			}
		});

		$('.orange').each((i, el) => {
			const old = modList[i];
			// @ts-ignore
			modList[i] = { name: old.name, title: old.title, author: el?.children[0]?.data };
		});

		$('.pre-line').each((i, el) => {
			const old = modList[i];
			// @ts-ignore
			modList[i] = { name: old.name, title: old.title, author: old.author, description: el?.children[0]?.data };
		});

		resolve(
			modList.map(v => {
				return new Mod(v.name, v.title, 'Unknown', v.author, [], v.description);
			})
		);
	});
}

async function checkInternet() {
	console.log('Checking internet...');
	return new Promise<boolean>(resolve => {
		dns.lookup('google.com', err => {
			ConsoleInteractions.clearLine();
			resolve(err && err.code == 'ENOTFOUND' ? false : true);
		});
	});
}

const OnlineInteractions = { checkInternet, downloadMod, fetchMod, fetchMods, searchMod };
export default OnlineInteractions;
