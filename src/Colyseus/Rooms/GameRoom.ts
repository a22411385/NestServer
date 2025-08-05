import { Room, Client, ServerError, Presence, Delayed } from "colyseus";
import { GameRoomState as GameRoomState, GamePlayer, GameCoreState, Enemy, Hero } from "../../Shared/Schema/GameState";
import { delay } from "src/Util/Utils";

export interface GameRoomOptions {
    roomName: string;
    maxPlayers: number;
    hostId: string;
    hostName: string;
    hostCharacterId: number;
}
const mapSize = 1000; // 假設地圖 1000x1000
const maxZombies = 50; // 可依需求調整
const invincibleDuration = 1000; // Hero 無敵持續時間 (ms)
const enemyDamage = 10; // 遭敵人碰撞時扣血量
export class GameRoom extends Room<GameRoomState> {
    maxClients = 6;
    autoDispose = true;
    private gameLoop!: Delayed;
    private enemySpawnTimer!: Delayed;

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
            const hero = this.state.heroes.get(client.sessionId);
            if (hero && this.IsPlaying) {
                hero.x = message.x;
                hero.y = message.y;
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

    // 初始化玩家 Hero 單位
    private initHeroes() {
        for (const [playerId, player] of this.state.players) {
            const hero = new Hero();
            hero.id = playerId;
            hero.name = player.name;
            hero.x = Math.random() * mapSize;
            hero.y = Math.random() * mapSize;
            hero.hp = hero.maxHp;
            hero.invincibleRemaining = 0;
            this.state.heroes.set(playerId, hero);
        }
    }

    private startGame() {
        console.log(`Game started in room ${this.roomId}`);
        this.state.state = "playing"

        // 生成 Hero
        this.initHeroes();

        // 開始遊戲循環
        this.startGameLoop();
    }

    private startGameLoop() {
        if (this.gameLoop) return;
        this.clock.start();

        // 敵人與碰撞 AI
        this.gameLoop = this.clock.setInterval(this.updateAI.bind(this), 100);

        // Waves 流程
        this.GameFlow();
    }

    private async GameFlow() {

        while (this.state.state == 'playing') {
            //三秒後開始遊戲
            this.state.gameCore.status = 'prepare';
            await delay(3);
            this.state.gameCore.status = 'battle';

            //每秒生成一隻
            this.enemySpawnTimer = this.clock.setInterval(this.spawnZombies.bind(this), 1000);

            //每波30秒
            await delay(30);
            this.enemySpawnTimer.clear();
            this.state.gameCore.status = 'rest';

            // 清除場上所有敵人
            this.state.enemies.clear();

            //修整時間10秒
            await delay(10);

            this.state.gameCore.waveNumber++;
            if (this.state.gameCore.waveNumber > 50) {
                this.state.state = 'finished';
                this.state.gameCore.status = 'settlement';
            }
            this.broadcast("gameOver", {

            });
        }

    }

    // 生成殭屍到 enemies，數量不超過最大上限
    private spawnZombies() {

        const currentCount = this.state.enemies.size;
        const canSpawn = Math.max(0, maxZombies - currentCount);
        const spawnCount = Math.min(1, canSpawn);
        if (spawnCount <= 0) return;

        for (let i = 0; i < spawnCount; i++) {
            // ...existing code...
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

    // 敵人自動移動、碰撞與 Hero 無敵邏輯
    private updateAI() {
        const dt = 100; // ms per tick

        // 更新無敵倒數
        for (const [, hero] of this.state.heroes) {
            if (hero.invincibleRemaining > 0) {
                hero.invincibleRemaining = Math.max(0, hero.invincibleRemaining - dt);
            }
        }

        // 敵人追蹤與碰撞
        for (const [, enemy] of this.state.enemies) {
            // 找最近 Hero
            let target: Hero | null = null;
            let minDist = Infinity;

            for (const [, hero] of this.state.heroes) {
                const dx = hero.x - enemy.x;
                const dy = hero.y - enemy.y;
                const dist = Math.hypot(dx, dy);
                if (dist < minDist) {
                    minDist = dist;
                    target = hero;
                }
            }

            if (!target) continue;

            // 移動至 Hero
            const step = enemy.speed * (dt / 1000);
            if (minDist > 0) {
                enemy.x += ((target.x - enemy.x) / minDist) * step;
                enemy.y += ((target.y - enemy.y) / minDist) * step;
            }

            // 碰撞檢測
            if (minDist <= target.radius + enemy.radius) {
                if (target.invincibleRemaining <= 0) {
                    target.hp = Math.max(0, target.hp - enemyDamage);
                    target.invincibleRemaining = invincibleDuration;

                    // Hero 死亡處理
                    if (target.hp <= 0) {
                        this.broadcast("heroDied", { heroId: target.id });
                    }
                }
            }
        }
    }

    private stopGameLoop() {
        // 停止 AI 與生產
        if (this.enemySpawnTimer) this.enemySpawnTimer.clear();
        if (this.gameLoop) this.gameLoop.clear();
    }
}
