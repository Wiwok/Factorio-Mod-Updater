import { access } from 'node:fs/promises';

async function exists(path: string) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

export default exists;
