import { Room, Delayed } from "colyseus";
import { GameRoomState } from "../../Shared/Schema/GameState";
import { delay } from "../../Util/Utils";
import { IdGenerator } from "../../Util/IdGenerator";

// 移動向量介面
interface MoveVector {
    vx: number;
    vy: number;
}

/**
 * 遊戲管理器 - 負責遊戲流程控制、波次管理和遊戲狀態
 */
export class GameManager {
    private room: Room<GameRoomState>;
    private state: GameRoomState;
    private gameLoop: Delayed | null = null;
    private allUnitSyncPos: Delayed | null = null;
    private moveTick: Delayed | null = null;
    private moveData: Record<string, MoveVector> = {};
    private battleSystem: any = null; // 會在初始化時設置

    // 改進的同步系統屬性
    private moveSequence: number = 0;
    private lastSyncTime: number = 0;

    private performanceStats = {
        aiUpdatesPerSecond: 0,
        aiUpdateCounter: 0,
        lastStatsTime: Date.now(),
        maxEnemyCount: 0,
        averagePlayersAlive: 0
    };

    constructor(room: Room<GameRoomState>) {
        this.room = room;
        this.state = room.state;
    }

    /**
     * 🎯 服務端移動配置 - 與客戶端保持一致
     */
    private readonly MOVEMENT_CONFIG = {
        MOVEMENT_SCALE: 10,        // 移動縮放係數，與客戶端保持一致
        FIXED_DELTA: 1 / 60        // 固定 delta time (60 FPS)
    };

    /**
     * 設置 BattleSystem 引用
     */
    setBattleSystem(battleSystem: any): void {
        this.battleSystem = battleSystem;
    }

    /**
     * 開始遊戲
     */
    startGame(): void {
        console.log(`🎮 Game started in room ${this.room.roomId}`);
        this.state.state = "playing";

        // 初始化遊戲核心狀態
        this.state.gameCore.waveNumber = 1;
        this.state.gameCore.gameTime = 0;
        this.state.gameCore.status = 'prepare';
        this.state.gameCore.aliveHeroes = this.state.players.size;

        // 開始遊戲循環
        this.startGameLoop();

        console.log(`✅ Game started - Wave: ${this.state.gameCore.waveNumber}, Heroes: ${this.state.heroes.size}`);
    }

    /**
     * 開始遊戲循環
     */
    private startGameLoop(): void {
        this.room.clock.clear();
        this.room.clock.start();

        // 降低AI更新頻率以提升效能 - 從10FPS降至6FPS  
        this.gameLoop = this.room.clock.setInterval(() => {
            // 呼叫 GameRoom 的公開方法來處理遊戲更新
            (this.room as any).handleGameTick();
        }, 166);

        // 定期更新場上所有單位位置 - 改進版本
        this.allUnitSyncPos = this.room.clock.setInterval(() => {
            const allPositions = this.getAllUnitPositions();
            this.room.broadcast('syncPosition', {
                timestamp: Date.now(),
                sequence: ++this.moveSequence,
                positions: allPositions
            });
            this.lastSyncTime = Date.now();
        }, 5000);

        // 每次移動的單位 - 改進版本（包含速度信息）
        this.moveTick = this.room.clock.setInterval(() => {
            if (Object.keys(this.moveData).length > 0) {
                // 🎯 首先更新服務端位置（使用與客戶端相同的邏輯）
                this.updateServerPositions();

                this.moveSequence++;

                // 🔧 為每個移動數據添加速度信息
                const enrichedMoveData: Record<string, { vx: number, vy: number, speed: number }> = {};

                for (const [unitId, velocity] of Object.entries(this.moveData)) {
                    const speed = this.getUnitSpeed(unitId);
                    enrichedMoveData[unitId] = {
                        vx: velocity.vx,
                        vy: velocity.vy,
                        speed: speed
                    };
                }

                this.room.broadcast('move-tick', {
                    sequence: this.moveSequence,
                    timestamp: Date.now(),
                    duration: 166, // 這批移動指令的持續時間
                    moveData: enrichedMoveData
                });
                this.moveData = {};
            }
        }, 166);

        if (!this.state.isTestMode)
            // Waves 流程
            this.gameFlow();
    }

    /**
     * 遊戲主流程
     */
    private async gameFlow(): Promise<void> {
        while (this.state.state === 'playing') {
            // 檢查是否所有玩家都死亡 - 這個檢查由外部處理

            // 波次開始準備
            this.broadcastBattleLog(`第 ${this.state.gameCore.waveNumber} 波準備中...`, 'event');
            this.state.gameCore.status = 'prepare';
            await delay(3);

            // 波次開始
            this.broadcastBattleLog(`第 ${this.state.gameCore.waveNumber} 波開始！殭屍來襲！`, 'event');
            this.state.gameCore.status = 'battle';

            // 通知外部開始生成敵人 (每秒生成一隻)
            if (this.battleSystem) {
                this.battleSystem.startEnemySpawning();
            }

            // 每波30秒
            await delay(30);

            // 通知外部停止生成敵人
            if (this.battleSystem) {
                this.battleSystem.stopEnemySpawning();
            }

            // 波次結束
            this.broadcastBattleLog(`第 ${this.state.gameCore.waveNumber} 波結束，進入休整時間`, 'event');
            this.state.gameCore.status = 'rest';

            // 清除場上所有敵人
            this.state.removeAllEnemy();

            // 修整時間10秒
            await delay(10);

            this.state.gameCore.waveNumber++;
            if (this.state.gameCore.waveNumber > 50) {
                this.broadcastBattleLog("恭喜！您成功完成了所有 50 波挑戰！", 'event');
                this.endGame("waveComplete");
                return;
            }
        }
    }

    /**
     * 遊戲每幀更新
     */
    updateGameTick(): { deltaTime: number; currentTime: number } {
        const dt = 166; // ms per tick (6 FPS)
        const currentTime = Date.now();

        // 更新遊戲時間
        this.state.gameCore.gameTime += dt;

        // 效能統計
        this.performanceStats.aiUpdateCounter++;

        // 每秒統計一次效能數據
        if (currentTime - this.performanceStats.lastStatsTime >= 1000) {
            this.performanceStats.aiUpdatesPerSecond = this.performanceStats.aiUpdateCounter;
            this.performanceStats.aiUpdateCounter = 0;
            this.performanceStats.lastStatsTime = currentTime;

            const activeEnemies = this.state.getEnemyCount();
            this.performanceStats.maxEnemyCount = Math.max(this.performanceStats.maxEnemyCount, activeEnemies);

            // 如果敵人數量過多，記錄警告
            if (activeEnemies > 80) {
                console.warn(`⚠️ High enemy count: ${activeEnemies}, consider optimization`);
            }
        }

        return { deltaTime: dt, currentTime };
    }

    /**
     * 結束遊戲
     */
    endGame(reason: "allPlayersDead" | "waveComplete"): void {
        console.log(`Game ended: ${reason}`);
        this.state.state = 'waiting';
        this.state.gameCore.status = 'prepare';

        const finalWave = this.state.gameCore.waveNumber;
        const survivedTime = this.state.gameCore.gameTime;

        this.state.gameCore.waveNumber = 0;

        // 停止所有計時器
        this.stopGameLoop();

        // 廣播遊戲結束
        this.room.broadcast("gameOver", {
            reason: reason,
            finalWave: finalWave,
            survivedTime: survivedTime
        });
    }

    /**
     * 停止遊戲循環
     */
    stopGameLoop(): void {
        // 停止所有計時器
        if (this.gameLoop) {
            this.gameLoop.clear();
            this.gameLoop = null;
        }
        if (this.allUnitSyncPos) {
            this.allUnitSyncPos.clear();
            this.allUnitSyncPos = null;
        }
        if (this.moveTick) {
            this.moveTick.clear();
            this.moveTick = null;
        }

        this.room.clock.stop();
        this.room.clock.clear();

        // 輸出效能報告
        this.logPerformanceReport();
    }

    /**
     * 效能報告
     */
    private logPerformanceReport(): void {
        const report = {
            房間ID: this.room.roomId,
            最大敵人數量: this.performanceStats.maxEnemyCount,
            AI更新頻率: `${this.performanceStats.aiUpdatesPerSecond} updates/sec`,
            玩家數量: this.state.players.size,
            最終波數: this.state.gameCore.waveNumber,
            遊戲時長: `${Math.round(this.state.gameCore.gameTime / 1000)}秒`
        };

        console.log('🎮 GameRoom 效能報告:', report);

        // 發送效能數據給客戶端 (可選)
        this.room.broadcast("performanceReport", report);
    }

    /**
     * 獲取所有單位的位置（用於強制同步）
     */
    private getAllUnitPositions(): Record<string, { x: number, y: number }> {
        const positions: Record<string, { x: number, y: number }> = {};

        // 收集所有Heroes位置 - 🔧 使用hero.id而不是heroId
        for (const [heroId, hero] of this.state.heroes) {
            positions[hero.id] = { x: hero.x, y: hero.y };
        }

        // 收集所有Enemies位置 - 🔧 使用enemy.id而不是enemyId
        for (const [enemyId, enemy] of this.state.enemySnapshots) {
            if (!enemy.isDead) {
                positions[enemy.id] = { x: enemy.x, y: enemy.y };
            }
        }

        return positions;
    }

    /**
     * 🔧 獲取單位移動速度（從服務端狀態）
     */
    private getUnitSpeed(unitId: string): number {
        // 檢查Heroes
        for (const [heroId, hero] of this.state.heroes) {
            if (heroId === unitId || hero.id === unitId) {
                return hero.speed || 5; // 預設Hero速度
            }
        }

        // 檢查Enemies
        for (const [enemyId, enemy] of this.state.enemySnapshots) {
            if (enemyId === unitId || enemy.id === unitId) {
                return enemy.speed || 3; // 預設Enemy速度
            }
        }

        console.warn(`⚠️ GameManager: No speed found for unit ${unitId}`);
        return 1; // 預設速度
    }

    /**
     * 🎯 服務端位置更新 - 使用與客戶端相同的移動邏輯
     */
    private updateServerPositions(): void {
        const deltaTime = this.MOVEMENT_CONFIG.FIXED_DELTA;

        // 更新所有有移動向量的單位
        for (const [unitId, velocity] of Object.entries(this.moveData)) {
            this.applyMovementToServerUnit(unitId, velocity, deltaTime);
        }
    }

    /**
     * 🎯 應用移動到服務端單位 - 與客戶端邏輯完全一致
     */
    private applyMovementToServerUnit(unitId: string, velocity: MoveVector, deltaTime: number): void {
        // 獲取單位速度
        const speed = this.getUnitSpeed(unitId);

        // 使用與客戶端相同的移動計算公式
        const moveDistance = speed * this.MOVEMENT_CONFIG.MOVEMENT_SCALE * deltaTime;
        const deltaX = velocity.vx * moveDistance;
        const deltaY = velocity.vy * moveDistance;

        let updated = false;

        // 更新Heroes位置
        for (const [heroId, hero] of this.state.heroes) {
            if (heroId === unitId || hero.id === unitId) {
                const oldX = hero.x;
                const oldY = hero.y;
                hero.x += deltaX;
                hero.y += deltaY;
                // 確保在世界邊界內
                hero.x = Math.max(-500, Math.min(500, hero.x));
                hero.y = Math.max(-500, Math.min(500, hero.y));
                console.log(`🎯 Server updated Hero ${unitId}: (${oldX.toFixed(1)},${oldY.toFixed(1)}) → (${hero.x.toFixed(1)},${hero.y.toFixed(1)}) delta:(${deltaX.toFixed(2)},${deltaY.toFixed(2)})`);
                updated = true;
                return;
            }
        }

        // 更新Enemies位置
        for (const [enemyId, enemy] of this.state.enemySnapshots) {
            if (enemyId === unitId || enemy.id === unitId) {
                const oldX = enemy.x;
                const oldY = enemy.y;
                enemy.x += deltaX;
                enemy.y += deltaY;
                // 確保在世界邊界內
                enemy.x = Math.max(-500, Math.min(500, enemy.x));
                enemy.y = Math.max(-500, Math.min(500, enemy.y));
                console.log(`🎯 Server updated Enemy ${unitId}: (${oldX.toFixed(1)},${oldY.toFixed(1)}) → (${enemy.x.toFixed(1)},${enemy.y.toFixed(1)}) delta:(${deltaX.toFixed(2)},${deltaY.toFixed(2)})`);
                updated = true;
                return;
            }
        }

        if (!updated) {
            console.warn(`⚠️ Could not find unit ${unitId} to update position`);
        }
    }

    /**
     * 添加單位移動數據到下次同步
     */
    addMoveData(unitId: string, velocity: MoveVector): void {
        this.moveData[unitId] = velocity;
    }

    /**
     * 檢查遊戲是否正在進行
     */
    get isPlaying(): boolean {
        return this.state.state === 'playing';
    }

    /**
     * 獲取當前波數
     */
    getCurrentWave(): number {
        return this.state.gameCore.waveNumber;
    }

    /**
     * 獲取遊戲時間
     */
    getGameTime(): number {
        return this.state.gameCore.gameTime;
    }

    /**
     * 獲取遊戲狀態
     */
    getGameStatus(): string {
        return this.state.gameCore.status;
    }

    /**
     * 廣播戰報 - 暫時性方法，應該由外部 MessageHandler 處理
     */
    private broadcastBattleLog(message: string, category: 'damage' | 'death' | 'kill' | 'heal' | 'event' = 'event'): void {
        console.log(`🎯 [${category}] ${message}`);
        this.room.broadcast("battleLog", {
            message,
            category,
            timestamp: Date.now()
        });
    }

    /**
     * 強制結束遊戲（由於玩家全部死亡）
     */
    forceEndGame(): void {
        this.endGame("allPlayersDead");
    }
}
