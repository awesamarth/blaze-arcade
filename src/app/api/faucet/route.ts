// app/api/faucet/route.ts (or pages/api/faucet.ts depending on your setup)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { address, chain } = await request.json();
    
    console.log(`Faucet request for address ${address} on chain ${chain}`);
    
    // For now, just return a simple response
    return NextResponse.json({ data: "hello" });
  } catch (error) {
    console.error('Faucet API error:', error);
    return NextResponse.json({ error: 'Failed to process faucet request' }, { status: 500 });
  }
}