const targets = [
	{ target: 'bun-windows-x64', out: 'Factorio-Mod-Updater.exe' },
	{ target: 'bun-windows-arm64', out: 'Factorio-Mod-Updater-arm64.exe' },
	{ target: 'bun-linux-x64', out: 'Factorio-Mod-Updater-linux' },
	{ target: 'bun-linux-arm64', out: 'Factorio-Mod-Updater-linux-arm64' },
	{ target: 'bun-darwin-x64', out: 'Factorio-Mod-Updater-macos' },
	{ target: 'bun-darwin-arm64', out: 'Factorio-Mod-Updater-macos-arm64' }
];

for (const { target, out } of targets) {
	console.log(`Building ${out}...`);
	const proc = Bun.spawnSync([
		'bun',
		'build',
		'index.ts',
		'--compile',
		'--minify',
		`--target=${target}`,
		`--outfile=build/${out}`
	]);
	if (proc.exitCode !== 0) console.error(`Failed: ${out}`);
}
