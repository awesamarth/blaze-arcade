export const getChainId = (networkId: string): number => {
  switch(networkId) {
    case 'foundry': return 31337;
    case 'megaeth': return 6342;
    case 'rise': return 11155931;
    case 'somnia': return 50312;
    case 'abstract': return 11124
    default: return 31337;
  }
};

// Add this function inside the ReactionTimeGame component
export const callFaucet = async (address: string, chainId: string) => {
  try {
    const response = await fetch('/api/faucet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, chain: chainId }),
    });
    
    const data = await response.json();
    console.log('Faucet response:', data);
  } catch (error) {
    console.error('Failed to call faucet:', error);
  }
};