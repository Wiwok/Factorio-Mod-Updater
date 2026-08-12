import axios from 'axios';
import { load } from 'cheerio';
import dns from 'node:dns';
import fs from 'node:fs';
import { get } from 'node:https';

import { OnlineMod, SearchMod } from '../Classes/Mod';
import ConsoleInteractions from './ConsoleInteractions';

const MOD_TEMP_DIR = process.env.APPDATA + '/Factorio Mod Updater/';

const MOD_URL = 'https://mods.factorio.com/api/mods/';

const SEARCH_URL = 'https://mods.factorio.com/search?query=';

const DOWNLOAD_URL = 'https://mods-storage.re146.dev';

async function downloadMod(
	name: string,
	version: string,
	onProgress?: (percentage: number, downloaded: number, total: number) => void
) {
	return new Promise<void>((resolve, reject) => {
		get(`${DOWNLOAD_URL}/${name}/${version}.zip`, response => {
			const code = response.statusCode ?? 0;
			if (code >= 400) reject(new Error(response.statusMessage));

			const fileWriter = fs
				.createWriteStream(MOD_TEMP_DIR + name + '.zip')
				.on('finish', resolve)
				.on('error', reject);
			response.pipe(fileWriter);

			if (onProgress) {
				const fileSize = parseInt(response.headers['content-length'] as string, 10);
				let downloadedSize = 0;
				let lastUpdate = 0;

				response.on('data', (chunk: Buffer) => {
					downloadedSize += chunk.length;
					const now = Date.now();
					const percent = Math.min(Math.round((downloadedSize / fileSize) * 100), 100);
					if (now - lastUpdate < 100) return;
					lastUpdate = now;
					if (!Number.isNaN(percent)) onProgress(percent, downloadedSize, fileSize);
				});
			}
		}).on('error', reject);
	});
}

function parseMod(name: string, data: any) {
	try {
		const title = data.title;

		const version = data.releases[data.releases.length - 1].version;
		const author = data.owner;

		if ([title, author, version].includes(undefined)) {
			return undefined;
		}

		const description = data.summary ?? undefined;
		const changes = (data.changelog as string)
			.replaceAll('\r\n', '\n')
			.split(
				'---------------------------------------------------------------------------------------------------\n'
			)
			.filter(v => v !== '');
		const changelog = changes.map(v => ({
			version: v.substring(9).split('\n')[0],
			description: v.split('\n').slice(2).join('\n')
		}));

		const dependencies = data.releases[data.releases.length - 1]?.info_json?.dependencies ?? [];

		const releases = (data.releases as Array<any>).map(r => ({
			date: new Date(r.released_at),
			version: r.version,
			changelog: changelog.find(v => v.version == r.version)?.description ?? undefined
		}));

		return new OnlineMod(name, title, version, author, description, dependencies, releases);
	} catch {
		return undefined;
	}
}

async function fetchMod(name: string) {
	console.log('Fetch ' + name);
	return parseMod(name, (await axios.get(MOD_URL + name + '/full'))?.data);
}

async function fetchMods(
	mods: Array<string>,
	onProgress?: (completed: number, total: number) => void
): Promise<Array<OnlineMod | undefined>> {
	let completed = 0;
	const total = mods.length;

	return Promise.all(mods.map(name => fetchMod(name).finally(() => onProgress?.(++completed, total))));
}

async function searchMod(search: string) {
	return new Promise<Array<SearchMod> | undefined>(async resolve => {
		const modList = new Array<SearchMod>();
		try {
			const v = await axios.get(SEARCH_URL + search);
			const $ = load(v.data);

			$('.mod-list > div > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2)').each(
				(_, el) => {
					const htmlMod = $(el);

					const title = htmlMod.find('h2 > a').text().trim();

					const name = htmlMod.find('h2 > a').attr()?.href.slice(5).split('?')[0]!;

					const author = htmlMod.find('div > a').text().trim();

					const description = htmlMod
						.find('p')
						.text()
						.replace(/\n\s*\n/g, '\n')
						.trim();

					modList.push(new SearchMod(decodeURIComponent(name), title, author, description));
				}
			);
		} catch {
			resolve(undefined);
		}

		resolve(modList);
	});
}

async function checkInternet() {
	console.log('Checking internet...');
	return new Promise<boolean>(resolve => {
		dns.lookup('mods.factorio.com', err => {
			ConsoleInteractions.clearLine();
			resolve(err && err.code == 'ENOTFOUND' ? false : true);
		});
	});
}

const OnlineInteractions = { checkInternet, downloadMod, fetchMod, fetchMods, searchMod };
export default OnlineInteractions;
