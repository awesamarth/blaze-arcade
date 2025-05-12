import { useWallets } from "@privy-io/react-auth";
const { wallets } = useWallets()
const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');

const provider = embeddedWallet?.getEthereumProvider()




export function chainSwitcher(chainId: number){
    embeddedWallet?.switchChain(chainId)
}


export function initData(chainId:number){
    const startingNonce = 



}

export function update(){



}



