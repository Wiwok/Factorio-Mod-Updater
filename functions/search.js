const cheerio = require('cheerio');
const request = require('request-promise');

const { Mod } = require('../classes/Mod');

async function search(mod) {
	let html;

	try {
		html = await request('https://mods.factorio.com/query/' + mod + '/downloaded/1?version=1.1', (error, response, HTML) => {
			if (!error && response.statusCode === 200) {
				return HTML;
			}
			return false;
		});
	} catch (err) {
		return false;
	}

	if (!html) { return false; }

	if (typeof html == 'undefined') { return; }

	const $ = cheerio.load(html);
	let Mods = $('html').find('body>div>div>div>div>div>div>div>div>div>h2').text().split('\n');
	let imgs = $('html').find('.mod-thumbnail>img').toArray();
	let authors = $('html').find('.orange').toArray();
	const lastUpdate = $('html').find('body>div>div>div>div>div>div>div>div>div').toArray();
	let rawName = $('html').find('body>div>div>div>div>div>div>div>div>div>h2>a').toArray();

	rawName = rawName.map(Name => {
		return Name.attribs.href.substring(5);
	});

	let NLastUpdate = [];
	lastUpdate.forEach(temp => {
		if (temp.attribs.title === 'Last updated') {
			NLastUpdate.push(temp.children[2].data);
		}
	});

	NLastUpdate = NLastUpdate.map(update => {
		while (update.includes('\n')) {
			update = update.replace('\n', '');
		}

		while (update[0] === ' ') {
			update = update.replace(' ', '');
		}

		update = update.split('');

		while (update[update.length - 1] === ' ') {
			update.pop();
		}
		return update.join('');
	});

	imgs = imgs.map(img => {
		return img.attribs.src;
	});

	authors = authors.map(author => {
		return author.children[0].data;
	});

	Mods = Mods.map(m => {
		while (m[0] === ' ') {
			m = m.substring(1);
		}
		return m;
	});

	const ModName = [];

	Mods.forEach(m => {
		if (m !== '') {
			ModName.push(m);
		}
	});

	return ModName.map((m, i) => {
		return new Mod(ModName[i], authors[i], rawName[i], '', NLastUpdate[i], '', '', imgs[i]);
	});
}

module.exports = { search };