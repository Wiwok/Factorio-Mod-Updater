const request = require('request-promise');
const cheerio = require('cheerio');


class Change {
	constructor(version, date, changes) {
		this.version = version;
		this.date = date;
		this.changes = changes;
	}
}


async function changelog(modName) {
	let html;

	try {
		html = await request('https://mods.factorio.com/mod/' + modName + '/changelog', (error, response, HTML) => {
			if (!error && response.statusCode === 200) {
				return HTML;
			}
			return false;
		});
	} catch (err) {
		return;
	}

	if (!html) { return; }

	if (typeof html == 'undefined') { return; }

	const $ = cheerio.load(html);

	const Changes = [];
	$('html').find('body>div>div>div>div>div>div>pre').text().split('Version: ').forEach(changes => {
		if (changes == '') return;
		changes = changes.split('\n');
		const version = changes.shift();
		let date;
		if (changes[0].startsWith('Date: ')) {
			date = changes.shift();
			date = date.replace('Date: ', '');
		} else {
			date = 'Unknown';
		}
		changes = changes.map(c => {
			while (c.startsWith((' '))) {
				c = c.split('');
				c.shift();
				c = c.join('');
			}
			return c;
		});
		changes = changes.join('\n');
		const change = new Change(version, date, changes);
		Changes.push(change);
	});

	console.log(Changes);
}

module.exports = { changelog };