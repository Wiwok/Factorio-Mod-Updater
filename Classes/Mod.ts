class Mod {
	name: string = ''
	title: string = ''
	version: string = ''
	author: string = ''
	dependencies: Array<Mod> = []
	constructor(name?: string, title?: string, version?: string, author?: string, dependencies?: Array<Mod>) {
		if (typeof name != "undefined" && name.length != 0) {
			this.name = name;
		}
		if (typeof title != "undefined" && title.length != 0) {
			this.title = title;
		}
		if (typeof version != "undefined" && version.length != 0) {
			this.version = version;
		}
		if (typeof author != "undefined" && author.length != 0) {
			this.author = author;
		}
		if (typeof dependencies != "undefined" && dependencies.length != 0) {
			this.dependencies = dependencies;
		}
	}
}

export default Mod;