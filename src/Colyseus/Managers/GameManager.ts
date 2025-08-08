import { Room, Delayed } from "colyseus";
import { GameRoomState } from "../../Shared/Schema/GameState";
import { delay } from "../../Util/Utils";

/**
 * 遊戲管理器 - 負責遊戲流程控制、波次管理和遊戲狀態
 */
export class GameManager {
    private room: Room<GameRoomState>;
    private state: GameRoomState;
    private gameLoop: Delayed | null = null;
    private enemySyncTimer: Delayed | null = null;
    private battleSystem: any = null; // 會在初始化時設置
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

        // 新增：定期同步敵人快照 (每3秒)
        this.enemySyncTimer = this.room.clock.setInterval(() => {
            this.state.updateAllEnemySnapshots();
        }, 3000);

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
        if (this.enemySyncTimer) {
            this.enemySyncTimer.clear();
            this.enemySyncTimer = null;
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
