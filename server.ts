import { createServer } from "node:http";
import next from "next";
import { Server, Socket } from "socket.io";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from 'dotenv'
import { createWalletClient, http, publicActions, webSocket } from "viem";
import { foundry } from "viem/chains";
dotenv.config({path:'.env.local'})


const dev: boolean = process.env.NODE_ENV !== "production";
const hostname: string = "localhost";
const port: number = 3000;

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const account = privateKeyToAccount(process.env.LOCAL_PRIVATE_KEY as `0x${string}`)

const megaEthClient  = createWalletClient({
  account:account,
  chain: foundry,
  transport: webSocket("ws://127.0.0.1:8545"),
  
}).extend(publicActions)


app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    // Handle socket connections here
    // Example: socket.on("message", (data) => { ... }) 

    socket.on("yepworking", ()=>{
      console.log("yep ts working ")
    })

    socket.on("update", ({chain})=>{
      console.log("update command received with chain: ", chain)
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