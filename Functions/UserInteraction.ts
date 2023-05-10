import inquirer from "inquirer";

type Choice = {
	name: string,
	value: string
}

async function Ask(message: string) {
	const v = await inquirer.prompt({
		name: "prompt",
		message: message,
		type: "input"
	});
	return v.prompt;
}

async function Choices(message: string, choices: Array<Choice>) {
	const v = await inquirer.prompt({
		name: "list",
		message: message,
		choices: choices,
		type: "list"
	});
	return v.list;
}


const UserInteration = { Choices, Ask }
export default UserInteration;