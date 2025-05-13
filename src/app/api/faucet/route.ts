import { FAUCET_ABI } from '@/constants';
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { megaethTestnet } from 'viem/chains';


const account = privateKeyToAccount(process.env.DEV_PRIVATE_KEY! as `0x${string}`)

const megaClient = createWalletClient({
  account,
  chain: megaethTestnet,
  transport: http()
})


export async function POST(request: NextRequest) {
  try {
    const { address, chain } = await request.json();

    console.log(`Faucet request for address ${address} on chain ${chain}`);

    if (chain === "megaeth") {
      await megaClient.writeContract({
        address: '0x0D78489cBF5DA4F52B1040DCE649d789E579e342',
        abi: FAUCET_ABI,
        functionName: 'drip',
        args: [address],
      })

    }

    return NextResponse.json({ data: "done" }, {status:200});
  } catch (error) {
    console.error('Faucet API error:', error);
    return NextResponse.json({ error: 'Failed to process faucet request' }, { status: 500 });
  }
}