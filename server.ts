import { createServer } from "node:http";
import next from "next";
import { Server, Socket } from "socket.io";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from 'dotenv'
import { createWalletClient, http, publicActions } from "viem";
import { foundry, megaethTestnet } from "viem/chains";
dotenv.config({ path: '.env.local' })


const dev: boolean = process.env.NODE_ENV !== "production";
const hostname: string = "localhost";
const port: number = 3000;

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Create a simple global nonce tracker

const account = privateKeyToAccount(process.env.LOCAL_PRIVATE_KEY as `0x${string}`)
const minifiedAbi = [
      {
        name: "update",
        type: "function",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable"
      }
    ];
const megaEthClient = createWalletClient({
  account: account,
  chain: megaethTestnet,
  transport: http("https://carrot.megaeth.com/rpc"),

}).extend(publicActions)

let megaNonce:number = await megaEthClient.getTransactionCount({
    address: account.address
  });
  console.log(`: ${megaNonce}`);;




// Update pre-signed transaction with current nonce
async function updateMegaEthSignedTx() {
  console.log(`Using nonce: ${megaNonce}`);
  
  const request = await megaEthClient.prepareTransactionRequest({
    to: '0x0D0ba0Ea8d031d093eA36c1A1176B066Fd08fadB',
    data: '0xa2e62045',
    megaNonce 
  });
  
  return await megaEthClient.signTransaction(request);
}

// Initialize nonce and prepare first transaction
//@ts-ignore
let megaEthSignedTx = null;
updateMegaEthSignedTx().then(tx => {
  megaEthSignedTx = tx;
});

const foundryClient = createWalletClient({
  account: account,
  chain: foundry,
  transport: http(),
}).extend(publicActions)


async function megaEthUpdate() {
  try {
    // Ensure we have a signed tx
    //@ts-ignore
    if (!megaEthSignedTx) {
      megaEthSignedTx = await updateMegaEthSignedTx();
    }

    await megaEthClient.request({
      //@ts-ignore
      method: 'realtime_sendRawTransaction',
      params: [megaEthSignedTx]
    });
    
    // Increment nonce after successful transaction
    megaNonce++;
    console.log(`Mega nonce incremented to: ${megaNonce}`);
    
    // Prepare next transaction in background
    megaEthSignedTx = null;
    updateMegaEthSignedTx().then(tx => {
      megaEthSignedTx = tx;
    }).catch(console.error);
  } catch (error) {
    // If nonce is too low, reset it and try again
    //@ts-ignore
    if (error.message?.includes('nonce too low') || error.details?.includes('nonce too low')) {
      console.log("Nonce too low, resetting nonce");
      //@ts-ignore
      currentNonce = null;
      megaEthSignedTx = null;
      megaNonce++
      return megaEthUpdate();
    }
    console.error("Error in megaEthUpdate:", error);
    throw error;
  }
}

async function foundryUpdate(){
  try {
    // Get current nonce for foundry
    
    const hash = await foundryClient.writeContract({
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      abi: minifiedAbi,
      functionName: 'update',
    });

    // Wait for transaction receipt
    const receipt = await foundryClient.waitForTransactionReceipt({
      hash
    });
    
    return receipt;
  } catch (error) {
    console.error(error)
  }
}





app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    // Handle socket connections here
    // Example: socket.on("message", (data) => { ... }) 

    socket.on("yepworking", () => {
      console.log("yep ts working ")
    })

    socket.on("update", async({ chain }) => {

      console.log("update command received with chain: ", chain)
      if (chain!=="megaeth"){
        await foundryUpdate()
      }
      else {
        await megaEthUpdate()
      }
      
      socket.emit("update_complete")
    })



  });

  httpServer
    .once("error", (err: Error) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});