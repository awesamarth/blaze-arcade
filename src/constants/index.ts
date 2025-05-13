export const UPDATER_ABI=[
        {
            "type": "function",
            "name": "number",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "update",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        }
    ]
export const FAUCET_ABI=[
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [],
		"name": "FailedToSend",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "FaucetEmpty",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NotOwner",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "DRIP_AMOUNT",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_newOwner",
				"type": "address"
			}
		],
		"name": "changeOwner",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "deposit",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address payable",
				"name": "_to",
				"type": "address"
			}
		],
		"name": "drip",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]

export const LOCAL_UPDATER_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
export const MEGA_UPDATER_ADDRESS="0x0D0ba0Ea8d031d093eA36c1A1176B066Fd08fadB"
export const RISE_UPDATER_ADDRESS = "0x06dA3169CfEA164E8308b5977D89E296e75FB62D"
export const SOMNIA_UPDATER_ADDRESS="0x06dA3169CfEA164E8308b5977D89E296e75FB62D"


export const MEGA_FAUCET_ADDRESS="0x0D78489cBF5DA4F52B1040DCE649d789E579e342"