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

let megaNonce: number = await megaEthClient.getTransactionCount({
  address: account.address
});
console.log(`: ${megaNonce}`);




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
console.log(megaEthSignedTx)

const foundryClient = createWalletClient({
  account: account,
  chain: foundry,
  transport: http(),
}).extend(publicActions)


app.prepare().then(() => {
  const httpServer = createServer(handler);

  // Add perMessageDeflate option to reduce memory usage
  const io = new Server(httpServer, {
    perMessageDeflate: false // This helps reduce memory fragmentation
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    // Store event handlers for later cleanup
    const updateHandler = async ({ chain }:{chain:any}) => {
      console.log("update command received with chain: ", chain);
      if (chain !== "megaeth") {
        await foundryUpdate();
      } else {
        await megaEthUpdate();
      }
    };

    const yepworkingHandler = () => {
      console.log("yep ts working");
    };

    // Define update functions inside the connection scope
    async function megaEthUpdate() {
      try {
        const hash = await megaEthClient.writeContract({
          address: '0x0D0ba0Ea8d031d093eA36c1A1176B066Fd08fadB',
          abi: minifiedAbi,
          functionName: 'update',
        });

        // Wait for transaction receipt
        await megaEthClient.waitForTransactionReceipt({
          hash
        });
        socket.emit("update_complete");
      } catch (error) {
        console.error("Error in megaEthUpdate:", error);
        // Still emit completion to prevent hanging connections
        socket.emit("update_complete");
      }
    }

    async function foundryUpdate() {
      try {
        const hash = await foundryClient.writeContract({
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          abi: minifiedAbi,
          functionName: 'update',
        });

        // Wait for transaction receipt
        const receipt = await foundryClient.waitForTransactionReceipt({
          hash
        });
        socket.emit("update_complete");
        return receipt;
      } catch (error) {
        console.error("Error in foundryUpdate:", error);
        // Still emit completion to prevent hanging connections
        socket.emit("update_complete");
      }
    }

    // Add event listeners
    socket.on("yepworking", yepworkingHandler);
    socket.on("update", updateHandler);

    // Proper cleanup on disconnect
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      // Remove all listeners to prevent memory leaks
      socket.removeAllListeners();
      // Explicitly remove specific listeners
      socket.off("yepworking", yepworkingHandler);
      socket.off("update", updateHandler);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});