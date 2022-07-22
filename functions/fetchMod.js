const request = require('request-promise');
const cheerio = require('cheerio');

const { Mod } = require('../classes/Mod');

async function fetchMod(modName) {

	let html;

	try {
		html = await request('https://mods.factorio.com/mod/' + modName, (error, response, HTML) => {
			if (!error && response.statusCode === 200) {
				return HTML;
			}
			return false;
		});
	} catch (err) {
		return fetchMod(modName);
	}

	if (!html) { return fetchMod(modName); }

	if (typeof html == 'undefined') { return fetchMod(modName); }

	const $ = cheerio.load(html);
	let infoList = [];

	const mod = new Mod('', '', modName, '', '', '', '', '', '', '');
	mod.name = $('html').find('body>div>div>div>div>div>div>div>div>h2>a').text();

	$('html').find('body>div>div>div>div>div>div>div>dl>dd').text().split('\n').forEach(line => {
		infoList.push(line);
	});


	for (let i = 0; i < infoList.length; i++) {
		while (infoList[i][0] === ' ') {
			infoList[i] = infoList[i].substring(1);
		}
	}


	const otherInfos = [];
	$('html').find('body>div>div>div>div>div>div>div>dl').text().split('\n').forEach(line => {
		otherInfos.push(line);
	});

	while (otherInfos[otherInfos.length - 2][0] === ' ') {
		otherInfos[otherInfos.length - 2] = otherInfos[otherInfos.length - 2].substring(1);
	}
	mod.downloads = otherInfos[otherInfos.length - 2].replace(' times', '');

	let image = [];
	$('html').find('body>div>div>div>div>div>div>div>div>a>div').html().split('\n').forEach(line => {
		image.push(line);
	});

	for (let i = 0; i < image.length; i++) {
		while (image[i][0] === ' ') {
			image[i] = image[i].substring(1);
		}
	}

	image = image.filter(el => {
		return el !== null && el !== '';
	});

	if (image.length > 0) {
		image = Array.from(image[0]);
		while (image[0] !== '"') {
			image.shift();
		}
		image.shift();

		while (image[image.length - 1] !== '"') {
			image.pop();
		}
		image.pop();

		mod.image = String(image.join(''));
	} else {
		mod.image = 'https://archive.org/download/no-photo-available/no-photo-available.png';
	}

	const description = [];
	$('html').find('body>div>div>div>div>div>div>div>div>p').html().split('\n').forEach(line => {
		description.push(line);
	});

	for (let i = 0; i < description.length; i++) {
		while (description[i][0] === ' ') {
			description[i] = description[i].substring(1);
		}
	}

	while (description[0].includes('&amp;')) {
		description[0] = description[0].replace('&amp;', '&');
	}
	mod.description = description[0];

	let text = [];
	$('html').find('body>div>div>div>div>div>div>article').html().split('\n').forEach(line => {
		text.push(line);
	});

	while (text.includes('&amp;')) {
		text = text.replace('&amp;', '&');
	}

	mod.text = text;

	infoList = infoList.filter(el => {
		return el !== null && el !== '';
	});

	mod.author = infoList[0];
	mod.version = infoList[5].split(' ')[0];
	mod.creation = infoList[4];

	let lastUpdate = infoList[5];
	while (lastUpdate[0] !== ' ') {
		lastUpdate = lastUpdate.substring(1);
	}
	lastUpdate = lastUpdate.substring(1).substring(1).split('');
	lastUpdate.pop();
	mod.lastUpdate = String(lastUpdate.join(''));

	return mod;
}

module.exports = { fetchMod };