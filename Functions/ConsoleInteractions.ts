function clearLine(number: number = 1) {
	for (let i = 0; i < number; i++) {
		process.stdout.moveCursor(0, -1);
		process.stdout.clearLine(1);
	}
}

function ProgressBar(progress: string) {
	switch (progress) {
		default:
			return '[                    ]';
		case '0':
			return '[>                   ]';
		case '1':
			return '[=>                  ]';
		case '2':
			return '[==>                 ]';
		case '3':
			return '[===>                ]';
		case '4':
			return '[====>               ]';
		case '5':
			return '[=====>              ]';
		case '6':
			return '[======>             ]';
		case '7':
			return '[=======>            ]';
		case '8':
			return '[========>           ]';
		case '9':
			return '[=========>          ]';
		case '10':
			return '[==========>         ]';
		case '11':
			return '[===========>        ]';
		case '12':
			return '[============>       ]';
		case '13':
			return '[=============>      ]';
		case '14':
			return '[==============>     ]';
		case '15':
			return '[===============>    ]';
		case '16':
			return '[================>   ]';
		case '17':
			return '[=================>  ]';
		case '18':
			return '[==================> ]';
		case '19':
			return '[===================>]';
		case '20':
			return '[====================]';
	}
}

const ConsoleInteractions = { clearLine, ProgressBar };
export default ConsoleInteractions;
