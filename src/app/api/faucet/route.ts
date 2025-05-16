import { FAUCET_ABI } from '@/constants';
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { megaethTestnet, somniaTestnet } from 'viem/chains';


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

export async function POST(request: NextRequest) {
  try {
    const { address, chain } = await request.json();

    console.log(`Faucet request for address ${address} on chain ${chain}`);

    if (chain === "megaeth") {
     const hash= await megaClient.writeContract({
        address: '0x0D78489cBF5DA4F52B1040DCE649d789E579e342',
        abi: FAUCET_ABI,
        functionName: 'drip',
        args: [address],
      })

      const receipt = await megaClient.waitForTransactionReceipt({ hash });
      console.log('MegaETH faucet transaction mined:', receipt.transactionHash);

    }
    
    else if (chain === "somnia"){
      const hash = await somniaClient.writeContract({
        address: '0xD6dcd484Faa46d7e04d0D91fED276B91d17960A9',
        abi: FAUCET_ABI,
        functionName: 'drip',
        args: [address],
      })

      const receipt = await somniaClient.waitForTransactionReceipt({ hash });
      console.log('Somnia faucet transaction mined:', receipt.transactionHash);
    }



    return NextResponse.json({ data: "done" }, {status:200});
  } catch (error) {
    console.error('Faucet API error:', error);
    return NextResponse.json({ error: 'Failed to process faucet request' }, { status: 500 });
  }
}