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
const maxZombies = 50; // 可依需求調整 - 從50開始測試效能

export class GameRoom extends Room<GameRoomState> {
    maxClients = 6;
    autoDispose = true;
    private gameLoop: Delayed;
    private enemySpawnTimer: Delayed;
    private enemySyncTimer: Delayed; // 新增：敵人同步計時器
    private performanceStats = {
        aiUpdatesPerSecond: 0,
        aiUpdateCounter: 0,
        lastStatsTime: Date.now(),
        maxEnemyCount: 0,
        averagePlayersAlive: 0
    };

    // 統一戰報系統
    private sendBattleLog(message: string, category: 'damage' | 'death' | 'kill' | 'heal' | 'event' = 'event') {
        console.log(`🎯 [${category}] ${message}`);
        this.broadcast("battleLog", {
            message,
            category,
            timestamp: Date.now()
        });
    }

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

        // 玩家移動向量（新的基於速度的移動系統）
        this.onMessage("playerMoveVector", (client, message) => {
            const hero = this.state.heroes.get(client.sessionId);
            if (hero && this.IsPlaying) {
                // 設置移動向量
                hero.vx = message.vx;
                hero.vy = message.vy;
                console.log(`🎯 Player ${hero.name} velocity: (${message.vx.toFixed(2)}, ${message.vy.toFixed(2)})`);
            }
        });

        // 玩家移動（舊版本，保留向後兼容）
        this.onMessage("playerMove", (client, message) => {
            const hero = this.state.heroes.get(client.sessionId);
            if (hero && this.IsPlaying) {
                hero.x = message.x;
                hero.y = message.y;
                console.log(`🚶 Player ${hero.name} moved to (${message.x.toFixed(1)}, ${message.y.toFixed(1)})`);
            }
        });

        // 玩家攻擊
        this.onMessage("playerAttack", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (!player || !this.IsPlaying) return;

            const hero = this.state.heroes.get(client.sessionId);
            if (!hero || hero.isDead) return;

            // 查找範圍內的敵人
            let targetEnemy: Enemy | null = null;
            let closestDistance = hero.attackRange;

            for (const [enemyId, enemy] of this.state.getAllEnemies()) {
                if (enemy.isDead) continue;

                const distance = Math.hypot(
                    enemy.x - message.targetX,
                    enemy.y - message.targetY
                );

                if (distance <= closestDistance) {
                    targetEnemy = enemy;
                    closestDistance = distance;
                }
            }

            if (targetEnemy) {
                // 執行攻擊
                const damage = hero.attackDamage;
                const killed = targetEnemy.takeDamage(damage);

                // 發送戰報
                this.sendBattleLog(`${hero.name} 對 殭屍#${targetEnemy.id.slice(-4)} 造成 ${damage} 點傷害`, 'damage');

                if (killed) {
                    this.sendBattleLog(`${hero.name} 擊殺了 殭屍#${targetEnemy.id.slice(-4)}`, 'kill');

                    // 給予經驗值
                    if (hero.gainExp(targetEnemy.expReward)) {
                        this.sendBattleLog(`${hero.name} 升級至 Lv.${hero.level}！`, 'event');
                    }

                    // 移除死亡的敵人
                    this.state.removeEnemy(targetEnemy.id);
                }

                // 廣播攻擊視覺效果
                this.broadcast("playerAttacked", {
                    playerId: client.sessionId,
                    targetX: message.targetX,
                    targetY: message.targetY,
                    damage: damage,
                    killed: killed
                });
            }
        });

        // 玩家移動
        this.onMessage("playerMove", (client, message) => {
            const hero = this.state.heroes.get(client.sessionId);
            if (hero && !hero.isDead && this.IsPlaying) {
                // 簡單的位置驗證
                const newX = Math.max(0, Math.min(1000, message.x));
                const newY = Math.max(0, Math.min(1000, message.y));

                hero.x = newX;
                hero.y = newY;
            }
        });
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
        console.log(`🎮 Game started in room ${this.roomId}`);
        this.state.state = "playing"

        // 初始化遊戲核心狀態
        this.state.gameCore.waveNumber = 1;
        this.state.gameCore.gameTime = 0;
        this.state.gameCore.status = 'prepare';
        this.state.gameCore.aliveHeroes = this.state.players.size;

        // 發送遊戲開始戰報
        this.sendBattleLog(`遊戲開始！共有 ${this.state.players.size} 名玩家參與戰鬥`, 'event');

        // 生成 Hero
        this.initHeroes();

        // 發送玩家初始化戰報
        for (const [, hero] of this.state.heroes) {
            this.sendBattleLog(`${hero.name} 加入戰場 (Lv.${hero.level}, HP:${hero.hp}/${hero.maxHp})`, 'event');
        }

        // 開始遊戲循環
        this.startGameLoop();

        console.log(`✅ Game started - Wave: ${this.state.gameCore.waveNumber}, Heroes: ${this.state.heroes.size}`);
    }

    private startGameLoop() {
        this.clock.clear();
        this.clock.start();

        // 降低AI更新頻率以提升效能 - 從10FPS降至6FPS  
        this.gameLoop = this.clock.setInterval(() => {
            this.updateAI()
        }, 166);

        // 新增：定期同步敵人快照 (每3秒)
        this.enemySyncTimer = this.clock.setInterval(() => {
            this.state.updateAllEnemySnapshots();
        }, 3000);

        // Waves 流程
        this.GameFlow();
    }

    private async GameFlow() {

        while (this.state.state == 'playing') {
            // 檢查是否所有玩家都死亡
            if (this.checkAllPlayersDead()) {
                this.endGame("allPlayersDead");
                return;
            }

            // 波次開始準備
            this.sendBattleLog(`第 ${this.state.gameCore.waveNumber} 波準備中...`, 'event');
            this.state.gameCore.status = 'prepare';
            await delay(3);

            // 波次開始
            this.sendBattleLog(`第 ${this.state.gameCore.waveNumber} 波開始！殭屍來襲！`, 'event');
            this.state.gameCore.status = 'battle';

            //每秒生成一隻
            this.enemySpawnTimer = this.clock.setInterval(this.spawnZombies.bind(this), 1000);

            //每波30秒
            await delay(30);
            this.enemySpawnTimer.clear();

            // 波次結束
            this.sendBattleLog(`第 ${this.state.gameCore.waveNumber} 波結束，進入休整時間`, 'event');
            this.state.gameCore.status = 'rest';

            // 清除場上所有敵人
            this.state.removeAllEnemy();

            //修整時間10秒
            await delay(10);

            this.state.gameCore.waveNumber++;
            if (this.state.gameCore.waveNumber > 50) {
                this.sendBattleLog("恭喜！您成功完成了所有 50 波挑戰！", 'event');
                this.endGame("waveComplete");
                return;
            }
        }
    }

    // 生成殭屍到 enemies，數量不超過最大上限
    private spawnZombies() {
        const currentCount = this.state.getEnemyCount();
        const canSpawn = Math.max(0, maxZombies - currentCount);
        const spawnCount = Math.min(1, canSpawn);
        if (spawnCount <= 0) return;

        let spawnedCount = 0;
        for (let i = 0; i < spawnCount; i++) {
            const enemy = new Enemy();
            enemy.id = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

            // 隨機決定殭屍類型
            const randomType = Math.floor(Math.random() * 3) + 1;
            enemy.initializeByType(randomType);

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

            // 使用新的添加方法
            this.state.addEnemy(enemy);
            spawnedCount++;
        }
    }

    // 遊戲 AI 更新邏輯 - 效能優化版本
    private updateAI() {
        const dt = 166; // ms per tick (6 FPS)
        const currentTime = Date.now();
        // console.log('updateAI')
        // 更新遊戲時間
        this.state.gameCore.gameTime += dt;

        // 效能統計
        this.performanceStats.aiUpdateCounter++;

        // 更新 Hero 無敵倒數 - 使用 Hero 自己的方法
        for (const [, hero] of this.state.heroes) {
            hero.updateInvincible(dt);
        }

        // 使用 Enemy Schema 的專業 AI 邏輯
        let activeEnemies = 0;
        for (const [enemyId, enemy] of this.state.getAllEnemies()) {
            if (!enemy.isDead) {
                activeEnemies++;

                // 記錄攻擊前的英雄血量
                const heroHealthBefore = new Map<string, number>();
                for (const [heroId, hero] of this.state.heroes) {
                    if (!hero.isDead) {
                        heroHealthBefore.set(heroId, hero.hp);
                    }
                }

                // 呼叫 Enemy 自己的優化 AI 更新
                enemy.updateAI(this.state.heroes, dt, currentTime);

                // 檢查是否有英雄受到傷害
                for (const [heroId, hero] of this.state.heroes) {
                    const previousHp = heroHealthBefore.get(heroId);
                    if (previousHp && hero.hp < previousHp) {
                        const damage = previousHp - hero.hp;
                        this.sendBattleLog(`殭屍#${enemy.id.slice(-4)} 對 ${hero.name} 造成 ${damage} 點傷害`, 'damage');
                    }
                }
            }

            // 檢查是否有玩家死亡
            let anyPlayerDied = false;
            for (const [, hero] of this.state.heroes) {
                if (hero.hp <= 0 && !hero.isDead) {
                    hero.isDead = true;
                    this.sendBattleLog(`${hero.name} 被殭屍群殺死了！`, 'death');
                    this.broadcast("heroDied", { heroId: hero.id });
                    anyPlayerDied = true;
                }
            }

            // 如果有玩家死亡，檢查是否所有玩家都死亡
            if (anyPlayerDied && this.checkAllPlayersDead()) {
                this.sendBattleLog("所有玩家陣亡，遊戲結束！", 'event');
                this.endGame("allPlayersDead");
                return;
            }
        }

        // 每秒統計一次效能數據
        if (currentTime - this.performanceStats.lastStatsTime >= 1000) {
            this.performanceStats.aiUpdatesPerSecond = this.performanceStats.aiUpdateCounter;
            this.performanceStats.aiUpdateCounter = 0;
            this.performanceStats.lastStatsTime = currentTime;
            this.performanceStats.maxEnemyCount = Math.max(this.performanceStats.maxEnemyCount, activeEnemies);

            // 如果敵人數量過多，記錄警告
            if (activeEnemies > 80) {
                console.warn(`⚠️ High enemy count: ${activeEnemies}, consider optimization`);
            }
        }
    }

    // 檢查所有玩家是否死亡
    private checkAllPlayersDead(): boolean {
        for (const [, hero] of this.state.heroes) {
            if (!hero.isDead && hero.hp > 0) return false;
        }
        return this.state.heroes.size > 0; // 確保有玩家存在
    }    // 結束遊戲
    private endGame(reason: "allPlayersDead" | "waveComplete") {
        console.log(`Game ended: ${reason}`);
        this.state.state = 'waiting';
        this.state.gameCore.status = 'prepare';
        this.state.gameCore.waveNumber = 0;
        // 停止所有計時器
        this.stopGameLoop();

        // 廣播遊戲結束
        this.broadcast("gameOver", {
            reason: reason,
            finalWave: this.state.gameCore.waveNumber,
            survivedTime: this.state.gameCore.gameTime
        });
    }

    private stopGameLoop() {
        // 停止所有計時器
        if (this.gameLoop) this.gameLoop.clear();
        if (this.enemySpawnTimer) this.enemySpawnTimer.clear();
        if (this.enemySyncTimer) this.enemySyncTimer.clear();

        this.clock.stop();
        this.clock.clear();
        // 輸出效能報告
        this.logPerformanceReport();
    }

    // 效能報告
    private logPerformanceReport() {
        const report = {
            房間ID: this.roomId,
            最大敵人數量: this.performanceStats.maxEnemyCount,
            AI更新頻率: `${this.performanceStats.aiUpdatesPerSecond} updates/sec`,
            玩家數量: this.state.players.size,
            最終波數: this.state.gameCore.waveNumber,
            遊戲時長: `${Math.round(this.state.gameCore.gameTime / 1000)}秒`
        };

        console.log('🎮 GameRoom 效能報告:', report);

        // 發送效能數據給客戶端 (可選)
        this.broadcast("performanceReport", report);
    }
}
