import { Server } from "colyseus";
import { uWebSocketsTransport } from "@colyseus/uwebsockets-transport"
import express from "express";
import { monitor } from "@colyseus/monitor";
import { GameRoom } from "./Rooms/GameRoom";
import { LobbyRoom } from "./Rooms/LobbyRoom";

export class ColyseusServer {
    private server: Server;
    private app: express.Application;

    constructor() {
        this.app = express();
        this.server = new Server({
            transport: new uWebSocketsTransport({ maxPayloadLength: 1024 }), // 設定最大封包大小為 64KB
        });

        this.setupRooms();
        this.setupMiddleware();
    }

    private setupRooms() {
        // 註冊房間類型
        this.server.define("lobby", LobbyRoom);
        this.server.define("game", GameRoom);//.enableRealtimeListing();

        console.log("Colyseus rooms registered:");
        console.log("- lobby: LobbyRoom");

    }

    private setupMiddleware() {
        // 只保留 CORS 設定，因為 WebSocket 連接需要
        this.app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

            if (req.method === "OPTIONS") {
                res.sendStatus(200);
            } else {
                next();
            }
        });
        this.app.use("/colyseus", monitor());
    }

    public listen(port: number = 3001): Promise<void> {
        return new Promise((resolve) => {
            this.server.listen(port).then(() => {
                console.log(`🎮 Colyseus Server listening on port ${port} (uWebSockets)`);
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`📊 Monitor panel: http://localhost:${port}/colyseus`);
                }
                resolve();
            });
        });
    }

    public getServer(): Server {
        return this.server;
    }

    public getApp(): express.Application {
        return this.app;
    }

    public async shutdown(): Promise<void> {
        console.log("Shutting down Colyseus server...");
        await this.server.gracefullyShutdown();
    }
}
