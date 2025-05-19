import { FAUCET_ABI, MEGA_FAUCET_ADDRESS, RISE_FAUCET_ADDRESS, SOMNIA_FAUCET_ADDRESS } from '@/constants';
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, publicActions, webSocket } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { megaethTestnet, somniaTestnet } from 'viem/chains';
import { riseTestnet } from '@/wagmi-config';


const account = privateKeyToAccount(process.env.DEV_PRIVATE_KEY! as `0x${string}`)

const megaClient = createWalletClient({
  account,
  chain: megaethTestnet,
  transport: http()
}).extend(publicActions)

const somniaClient = createWalletClient({
  account,
  chain:somniaTestnet,
  transport:http()
}).extend(publicActions)

const riseClient = createWalletClient({
  account, 
  chain:riseTestnet,
  transport: webSocket()
}).extend(publicActions)

export async function POST(request: NextRequest) {
  try {
    const { address, chain } = await request.json();

    console.log(`Faucet request for address ${address} on chain ${chain}`);

    if (chain === "megaeth") {
     const hash= await megaClient.writeContract({
        address: MEGA_FAUCET_ADDRESS,
        abi: FAUCET_ABI,
        functionName: 'drip',
        args: [address],
      })

      const receipt = await megaClient.waitForTransactionReceipt({ hash });
      console.log('MegaETH faucet transaction mined:', receipt.transactionHash);

    }
    
    else if (chain === "somnia"){
      const hash = await somniaClient.writeContract({
        address: SOMNIA_FAUCET_ADDRESS,
        abi: FAUCET_ABI,
        functionName: 'drip',
        args: [address],
      })

      const receipt = await somniaClient.waitForTransactionReceipt({ hash });
      console.log('Somnia faucet transaction mined:', receipt.transactionHash);
    }

    else if (chain === "rise") {
     const hash= await riseClient.writeContract({
        address: RISE_FAUCET_ADDRESS,
        abi: FAUCET_ABI,
        functionName: 'drip',
        args: [address],
      })

      const receipt = await riseClient.waitForTransactionReceipt({ hash });
      console.log('RISE faucet transaction mined:', receipt.transactionHash);

    }



    return NextResponse.json({ data: "done" }, {status:200});
  } catch (error) {
    console.error('Faucet API error:', error);
    return NextResponse.json({ error: 'Failed to process faucet request' }, { status: 500 });
  }
}