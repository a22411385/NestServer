import { Server, matchMaker } from "colyseus";
import { createServer } from "http";
import express from "express";
import { monitor } from "@colyseus/monitor";
import { GameRoom } from "./Rooms/GameRoom";
import { LobbyRoom } from "./Rooms/LobbyRoom";

export class ColyseusServer {
    private server: Server;
    private app: express.Application;
    private httpServer: any;

    constructor() {
        this.app = express();
        this.httpServer = createServer(this.app);
        this.server = new Server({
            server: this.httpServer,
        });

        this.setupRooms();
        this.setupMiddleware();
    }

    private setupRooms() {
        // 註冊房間類型
        this.server.define("lobby", LobbyRoom);
        this.server.define("game_room", GameRoom);

        console.log("Colyseus rooms registered:");
        console.log("- lobby: LobbyRoom");
        console.log("- game_room: GameRoom");
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

        // 只在開發模式保留監控面板
        if (process.env.NODE_ENV !== 'production') {
            this.app.use("/colyseus", monitor());
        }
    }

    public listen(port: number = 3001): Promise<void> {
        return new Promise((resolve) => {
            this.httpServer.listen(port, () => {
                console.log(`🎮 Colyseus Server listening on port ${port}`);
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
        this.httpServer.close();
    }
}
