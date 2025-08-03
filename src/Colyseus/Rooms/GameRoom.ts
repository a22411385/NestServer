import { Room, Client, ServerError } from "colyseus";
import { GameState, Player, PlayerInfo } from "../../Shared/Schema/GameState";

export interface GameRoomOptions {
    roomName: string;
    maxPlayers: number;
    hostId: string;
    hostName: string;
    hostCharacterId: number;
}

export class GameRoom extends Room<GameState> {
    maxClients = 6;
    autoDispose = true;

    private gameLoop: NodeJS.Timeout | null = null;
    private readonly GAME_LOOP_INTERVAL = 1000 / 60; // 60 FPS
    private lastUpdateTime = Date.now();

    onCreate(options: GameRoomOptions) {
        console.log(`GameRoom created: ${options.roomName} by ${options.hostName}`);

        try {
            this.state = new GameState();
            this.maxClients = options.maxPlayers;

            // 設置房間資訊
            this.state.roomName = options.roomName;
            this.state.maxPlayers = options.maxPlayers;
            this.state.gameState = "waiting";
            this.state.isStarted = false;

            // 初始化遊戲數據，避免 undefined
            this.state.gameTime = 0;
            this.state.waveNumber = 1;
            this.state.zombieCount = 0;
            this.state.totalZombies = 0;

            // 設置房間元數據
            this.setMetadata({
                roomName: options.roomName,
                hostName: options.hostName,
                currentPlayers: 0,
                maxPlayers: options.maxPlayers,
                isStarted: false,
            });

            // 設置消息處理器
            // this.setupMessageHandlers();
            console.log(`GameRoom ${this.roomId} created successfully`);
        } catch (error) {
            console.error('Error creating GameRoom:', error);
            throw error;
        }
    }

    onJoin(client: Client, options: any, auth: any) {
        console.log(`Player ${client.sessionId} joined room ${this.roomId}`);

        try {
            // 驗證輸入參數
            const playerName = options.playerName || `Player${client.sessionId.substring(0, 6)}`;
            const characterId = Number(options.characterId) || 1;


            const player = new Player();
            player.id = String(client.sessionId);
            player.name = String(playerName);
            player.characterId = Number(characterId);
            player.isReady = false;
            player.isHost = this.state.players.size === 0; // 第一個加入的是主機
            this.state.players.set(client.sessionId, player);
            console.log(`Player ${client.sessionId} successfully added to Schema`);

            // 通知其他玩家有新玩家加入
            this.broadcast("playerJoined", {
                playerId: client.sessionId,
                playerName: player.name,
                characterId: player.characterId,
            }, { except: client });

            console.log(`Player ${client.sessionId} successfully joined room ${this.roomId}`);
        } catch (error) {
            console.error('Error in onJoin:', error);
            client.send("error", { message: "Failed to join room" });
            // throw error;
        }
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`Player ${client.sessionId} left room ${this.roomId}`);

        const player = this.state.players.get(client.sessionId);
        if (player) {
            // 如果離開的是主機，指定新主機
            if (player.isHost && this.state.players.size > 1) {
                //  this.assignNewHost(client.sessionId);
            }

            // 移除玩家
            this.state.players.delete(client.sessionId);

            // 更新房間元數據
            this.setMetadata({
                ...this.metadata,
                currentPlayers: this.state.players.size,
            });

            // 通知其他玩家
            this.broadcast("playerLeft", {
                playerId: client.sessionId,
                playerName: player.name,
            });
        }

        // 如果房間空了，停止遊戲循環
        if (this.state.players.size === 0) {
            //   this.stopGameLoop();
        }
    }

    onDispose() {
        console.log(`GameRoom ${this.roomId} disposed`);
        //  this.stopGameLoop();
    }

    // private setupMessageHandlers() {
    //     // 玩家準備/取消準備
    //     this.onMessage("toggleReady", (client, message) => {
    //         const player = this.state.players.get(client.sessionId);
    //         if (player) {
    //             player.isReady = !player.isReady;

    //             this.broadcast("playerReadyChanged", {
    //                 playerId: client.sessionId,
    //                 isReady: player.isReady,
    //             });

    //             // 檢查是否所有玩家都準備好了
    //             if (this.getAllPlayersReady() && this.state.players.size >= 1) {
    //                 this.broadcast("allPlayersReady", {});
    //             }
    //         }
    //     });

    //     // 開始遊戲（只有主機可以）
    //     this.onMessage("startGame", (client, message) => {
    //         const player = this.state.players.get(client.sessionId);
    //         if (player && player.isHost) {
    //             if (this.getAllPlayersReady() && this.state.players.size >= 1) {
    //                 this.startGame();
    //             } else {
    //                 client.send("error", { message: "Not all players are ready" });
    //             }
    //         } else {
    //             client.send("error", { message: "Only host can start the game" });
    //         }
    //     });

    //     // 玩家移動
    //     this.onMessage("playerMove", (client, message) => {
    //         const player = this.state.players.get(client.sessionId);
    //         if (player && this.state.isStarted) {
    //             player.x = message.x;
    //             player.y = message.y;

    //             // 廣播給其他玩家
    //             this.broadcast("playerMoved", {
    //                 playerId: client.sessionId,
    //                 x: message.x,
    //                 y: message.y,
    //             }, { except: client });
    //         }
    //     });

    //     // 玩家攻擊
    //     this.onMessage("playerAttack", (client, message) => {
    //         const player = this.state.players.get(client.sessionId);
    //         if (player && this.state.isStarted) {
    //             // 廣播攻擊事件
    //             this.broadcast("playerAttacked", {
    //                 playerId: client.sessionId,
    //                 targetX: message.targetX,
    //                 targetY: message.targetY,
    //                 damage: message.damage || 10,
    //             });
    //         }
    //     });
    // }

    // // 輔助方法
    // private getAllPlayersReady(): boolean {
    //     if (this.state.players.size === 0) return false;

    //     for (const [_, player] of this.state.players) {
    //         if (!player.isReady) return false;
    //     }
    //     return true;
    // }

    // private assignNewHost(leavingPlayerId: string) {
    //     for (const [playerId, player] of this.state.players) {
    //         if (playerId !== leavingPlayerId) {
    //             player.isHost = true;
    //             this.broadcast("newHost", { newHostId: playerId });
    //             break;
    //         }
    //     }
    // }

    // private startGame() {
    //     console.log(`Game started in room ${this.roomId}`);

    //     this.state.startGame();

    //     // 更新房間元數據
    //     this.setMetadata({
    //         ...this.metadata,
    //         isStarted: true,
    //     });

    //     // 通知所有玩家遊戲開始
    //     this.broadcast("gameStarted", {
    //         gameTime: this.state.gameTime,
    //         // 不再需要發送玩家數據，Schema 會自動同步
    //     });

    //     // 開始遊戲循環
    //     this.startGameLoop();
    // }

    // private startGameLoop() {
    //     if (this.gameLoop) return;

    //     this.gameLoop = setInterval(() => {
    //         const now = Date.now();
    //         const deltaTime = now - this.lastUpdateTime;
    //         this.lastUpdateTime = now;

    //         // 更新遊戲時間
    //         this.state.updateGameTime(deltaTime);

    //         // 每秒更新遊戲統計
    //         if (Math.floor(this.state.gameTime / 1000) % 1 === 0) {
    //             // 這裡可以添加波數邏輯
    //             if (this.state.gameTime > 0 && this.state.gameTime % 30000 === 0) { // 每30秒一波
    //                 this.state.waveNumber++;
    //                 this.state.zombieCount = this.state.waveNumber * 5; // 每波殭屍數量
    //                 this.state.totalZombies += this.state.zombieCount;
    //             }

    //             // 廣播遊戲狀態更新
    //             this.broadcast("gameStats", {
    //                 gameTime: this.state.gameTime,
    //                 waveNumber: this.state.waveNumber,
    //                 zombieCount: this.state.zombieCount,
    //                 totalZombies: this.state.totalZombies
    //             });
    //         }

    //     }, this.GAME_LOOP_INTERVAL);
    // }

    // private stopGameLoop() {
    //     if (this.gameLoop) {
    //         clearInterval(this.gameLoop);
    //         this.gameLoop = null;
    //     }
    // }
}
