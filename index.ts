import Data from './Functions/DataInteraction';

async function main() {
	Data.Installed.getMods().forEach(v => {
		console.log(v.dependencies);
	});
}

main();