import { Room, Client, ServerError, Presence, Delayed } from "colyseus";
import { GameRoomState as GameRoomState, GamePlayer, PlayerInfo, GameCoreState, Enemy } from "../../Shared/Schema/GameState";

export interface GameRoomOptions {
    roomName: string;
    maxPlayers: number;
    hostId: string;
    hostName: string;
    hostCharacterId: number;
}

export class GameRoom extends Room<GameRoomState> {
    maxClients = 6;
    autoDispose = true;
    private gameLoop!: Delayed;

    private readonly GAME_LOOP_INTERVAL = 1000 / 60; // 60 FPS
    private lastUpdateTime = Date.now();

    get IsPlaying(): boolean {
        return this.state.state == 'playing';
    }
    onCreate(options: GameRoomOptions) {
        console.log(`GameRoom created: ${options.roomName} by ${options.hostName}`);

        try {
            this.state = new GameRoomState();
            this.maxClients = options.maxPlayers;

            // 設置房間資訊
            this.state.roomName = options.roomName;
            this.state.maxPlayers = options.maxPlayers;
            this.state.state = "waiting";


            // 初始化遊戲數據，避免 undefined
            this.state.gameCore = new GameCoreState;

            // 設置消息處理器
            this.setupMessageHandlers();
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


            const player = new GamePlayer();
            player.id = client.sessionId;
            player.name = String(playerName);
            player.characterId = Number(characterId);
            player.isReady = false;
            player.isHost = this.state.players.size === 0; // 第一個加入的是主機
            this.state.players.set(client.sessionId, player);
            console.log(`Player ${client.sessionId} successfully added to Schema`);
            client.send("gameWelcome", {
                playerId: client.sessionId,

            });

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
                this.assignNewHost(client.sessionId);
            }

            // 移除玩家
            this.state.players.delete(client.sessionId);
            // 通知其他玩家
            this.broadcast("playerLeft", {
                playerId: client.sessionId,
                playerName: player.name,
            });
        }

        // 如果房間空了，停止遊戲循環
        if (this.state.players.size === 0) {
            this.stopGameLoop();
        }
    }

    onDispose() {
        console.log(`GameRoom ${this.roomId} disposed`);
        this.stopGameLoop();
    }

    private setupMessageHandlers() {
        //     // 玩家準備/取消準備
        this.onMessage("toggleReady", (client, message) => {

            if (this.IsPlaying) return;

            const player = this.state.players.get(client.sessionId);
            if (player) {
                console.log(`Player ${player.name} toggleReady`);

                player.isReady = !player.isReady;

                this.broadcast("playerReadyChanged", {
                    playerId: client.sessionId,
                    isReady: player.isReady,
                });
                this.state.players.set(client.sessionId, player);
                // 檢查是否所有玩家都準備好了
                if (this.getAllPlayersReady() && this.state.players.size >= 1) {
                    this.broadcast("allPlayersReady", {});
                }
            }
        });

        // 開始遊戲（只有主機可以）
        this.onMessage("startGame", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player && player.isHost) {
                if (this.getAllPlayersReady() && this.state.players.size >= 1) {
                    this.startGame();
                } else {
                    client.send("error", { message: "Not all players are ready" });
                }
            } else {
                client.send("error", { message: "Only host can start the game" });
            }
        });

        //     // 玩家移動
        this.onMessage("playerMove", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player && this.IsPlaying) {
                player.x = message.x;
                player.y = message.y;

            }
        });

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
    }

    // 輔助方法
    private getAllPlayersReady(): boolean {
        if (this.state.players.size === 0) return false;

        for (const [_, player] of this.state.players) {
            if (!player.isReady) return false;
        }
        return true;
    }

    private assignNewHost(leavingPlayerId: string) {
        for (const [playerId, player] of this.state.players) {
            if (playerId !== leavingPlayerId) {
                player.isHost = true;
                this.broadcast("newHost", { newHostId: playerId });
                break;
            }
        }
    }

    private startGame() {
        console.log(`Game started in room ${this.roomId}`);
        this.state.state = "playing"

        // 開始遊戲循環
        this.startGameLoop();
    }

    private startGameLoop() {
        if (this.gameLoop) return;
        this.clock.start();
        this.gameLoop = this.clock.setInterval(this.Loop.bind(this), 1000);
        // this.gameLoop = setInterval(this.Loop.bind(this), this.GAME_LOOP_INTERVAL);
    }
    private Loop() {
        this.state.gameCore.gameTime += 1000;
        // 每30秒一波
        if (this.state.gameCore.gameTime % 30 == 0) {
            this.state.gameCore.waveNumber++;
            this.state.gameCore.zombieCount = this.state.gameCore.waveNumber * 5;
            this.state.gameCore.totalZombies += this.state.gameCore.zombieCount;

            // 生成殭屍
            this.spawnZombies(this.state.gameCore.zombieCount);
        }
    }


    // 生成殭屍到 enemies
    private spawnZombies(count: number) {
        const mapSize = 1000; // 假設地圖 1000x1000

        for (let i = 0; i < count; i++) {
            console.log("生成敵人");
            const enemy = new Enemy;
            enemy.id = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            // 隨機在地圖邊緣生成
            const edge = Math.floor(Math.random() * 4);
            switch (edge) {
                case 0: // 上
                    enemy.x = Math.random() * mapSize;
                    enemy.y = 0;
                    break;
                case 1: // 下
                    enemy.x = Math.random() * mapSize;
                    enemy.y = mapSize;
                    break;
                case 2: // 左
                    enemy.x = 0;
                    enemy.y = Math.random() * mapSize;
                    break;
                case 3: // 右
                    enemy.x = mapSize;
                    enemy.y = Math.random() * mapSize;
                    break;
            }
            this.state.enemies.set(enemy.id, enemy);
        }
    }
    private stopGameLoop() {
        this.gameLoop.clear();
    }
}
