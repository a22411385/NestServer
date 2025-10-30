import { EnemyFactory } from "../../Factories/EnemyFactory";
import { SpawnManager } from "../SpawnManager/SpawnManager";
import { ServerEnemy } from "../../../Colyseus/Schema/Unit/Enemy";
import { ServerGameUnit } from "../../../Colyseus/Schema/Unit/GameUnit";

import { SpawnType, SpawnConfig } from "../SpawnManager/types";
import {
    WaveState,
    GameFlowState,
    GameFlowConfig,
    WaveConfig,
    WaveEvent
} from "./types";

/**
 * 波次管理器 - 負責管理遊戲波次、敵人生成時機和獎勵分發
 */
export class WaveManager {
    private currentWave: number = 0;
    private waveState: WaveState = WaveState.PREPARING;
    private spawnManager: SpawnManager;
    private activeWaveConfig: WaveConfig | null = null;

    // 生成控制
    private enemiesSpawned: number = 0;
    private enemiesAlive: number = 0;
    private spawnTimer: NodeJS.Timeout | null = null;
    private waveTimer: NodeJS.Timeout | null = null;

    // 事件回調
    private eventCallbacks: Map<string, Function[]> = new Map();

    // 統計數據
    private waveStartTime: number = 0;
    private totalWavesCompleted: number = 0;

    // 外部依賴注入
    private getCurrentUnitsCallback: (() => ServerGameUnit[]) | null = null;

    // 新增：遊戲流程控制
    private gameFlowState: GameFlowState = GameFlowState.STOPPED;
    private flowConfig: GameFlowConfig;
    private flowRunning: boolean = false;
    private gameFlowPromise: Promise<void> | null = null;
    private countdownTimer: NodeJS.Timeout | null = null;

    // 回調函數
    private updateGameCoreCallback?: (status: string, roundTime: number, waveNumber: number) => void;
    private broadcastLogCallback?: (message: string, category?: string) => void;
    private endGameCallback?: (reason: string) => void;
    private removeAllEnemiesCallback?: () => void;

    constructor(mapWidth: number, mapHeight: number) {
        this.spawnManager = new SpawnManager(mapWidth, mapHeight);
        this.initializeEventCallbacks();

        // 初始化流程配置
        this.flowConfig = {
            prepareTime: 3,
            battleTime: 30,
            restTime: 10,
            maxWaves: 50
        };
    }    /**
     * 初始化事件回調系統
     */
    private initializeEventCallbacks(): void {
        const eventTypes = ['wave_start', 'wave_complete', 'wave_failed', 'enemy_spawned', 'all_enemies_spawned'];
        eventTypes.forEach(type => {
            this.eventCallbacks.set(type, []);
        });
    }

    /**
     * 設置遊戲流程配置
     */
    public setFlowConfig(config: Partial<GameFlowConfig>): void {
        this.flowConfig = { ...this.flowConfig, ...config };
        console.log(`⚙️ Wave flow config updated:`, this.flowConfig);
    }

    /**
     * 設置回調函數
     */
    public setCallbacks(callbacks: {
        updateGameCore?: (status: string, roundTime: number, waveNumber: number) => void;
        broadcastLog?: (message: string, category?: string) => void;
        endGame?: (reason: string) => void;
        removeAllEnemies?: () => void;
    }): void {
        this.updateGameCoreCallback = callbacks.updateGameCore;
        this.broadcastLogCallback = callbacks.broadcastLog;
        this.endGameCallback = callbacks.endGame;
        this.removeAllEnemiesCallback = callbacks.removeAllEnemies;
        console.log(`🔗 WaveManager callbacks set`);
    }

    /**
     * 開始遊戲流程
     */
    public async gameFlow(): Promise<void> {
        if (this.flowRunning) {
            console.warn(`⚠️ Game flow already running`);
            return;
        }

        this.flowRunning = true;
        this.currentWave = 1;
        this.gameFlowState = GameFlowState.PREPARE;

        console.log(`🎮 Starting game flow with ${this.flowConfig.maxWaves} waves`);

        try {
            this.gameFlowPromise = this.runGameFlowLoop();
            await this.gameFlowPromise;
        } catch (error) {
            console.error(`❌ Game flow error:`, error);
            this.stopGameFlow();
        }
    }

    /**
     * 遊戲流程主循環
     */
    private async runGameFlowLoop(): Promise<void> {
        while (this.flowRunning && this.currentWave <= this.flowConfig.maxWaves) {
            try {
                // 準備階段
                await this.runPrepareStage();

                if (!this.flowRunning) break;

                // 戰鬥階段
                await this.runBattleStage();

                if (!this.flowRunning) break;

                // 休息階段
                await this.runRestStage();

                if (!this.flowRunning) break;

                // 進入下一波
                this.currentWave++;

            } catch (error) {
                console.error(`❌ Error in wave ${this.currentWave}:`, error);
                break;
            }
        }

        // 遊戲結束
        if (this.currentWave > this.flowConfig.maxWaves) {
            this.completeAllWaves();
        } else {
            this.stopGameFlow();
        }
    }

    /**
     * 準備階段
     */
    private async runPrepareStage(): Promise<void> {
        this.gameFlowState = GameFlowState.PREPARE;
        this.waveState = WaveState.PREPARING;

        this.broadcastLog(`第 ${this.currentWave} 波準備中...`, 'event');
        console.log(`🔄 Wave ${this.currentWave} - Prepare stage`);

        // 更新 GameCore 狀態
        this.updateGameCore('prepare', this.flowConfig.prepareTime, this.currentWave);

        // 倒數計時
        await this.countdown(this.flowConfig.prepareTime);
    }

    /**
     * 戰鬥階段
     */
    private async runBattleStage(): Promise<void> {
        this.gameFlowState = GameFlowState.BATTLE;

        this.broadcastLog(`第 ${this.currentWave} 波開始！殭屍來襲！`, 'event');
        console.log(`⚔️ Wave ${this.currentWave} - Battle stage`);

        // 更新 GameCore 狀態
        this.updateGameCore('battle', this.flowConfig.battleTime, this.currentWave);

        // 開始生成敵人
        const waveStarted = this.startWaveImmediate(this.currentWave, this.flowConfig.battleTime);
        if (!waveStarted) {
            console.warn(`⚠️ Failed to start wave ${this.currentWave}`);
        }

        // 戰鬥階段倒數
        await this.countdown(this.flowConfig.battleTime);

        // 強制結束波次
        this.stopCurrentWave();
    }

    /**
     * 休息階段
     */
    private async runRestStage(): Promise<void> {
        this.gameFlowState = GameFlowState.REST;

        this.broadcastLog(`第 ${this.currentWave} 波結束，進入休整時間`, 'event');
        console.log(`💤 Wave ${this.currentWave} - Rest stage`);

        // 更新 GameCore 狀態
        this.updateGameCore('rest', this.flowConfig.restTime, this.currentWave);

        // 清除所有敵人
        this.removeAllEnemies();

        // 休息階段倒數
        await this.countdown(this.flowConfig.restTime);
    }

    /**
     * 倒數計時
     */
    private async countdown(seconds: number): Promise<void> {
        return new Promise((resolve) => {
            let remaining = seconds;

            const tick = () => {
                if (!this.flowRunning) {
                    resolve();
                    return;
                }

                if (remaining <= 0) {
                    resolve();
                    return;
                }

                // 更新剩餘時間
                this.updateGameCore(this.gameFlowState.toLowerCase(), remaining, this.currentWave);
                remaining--;

                this.countdownTimer = setTimeout(tick, 1000);
            };

            tick();
        });
    }

    /**
     * 停止當前波次
     */
    private stopCurrentWave(): void {
        if (this.waveState === 'spawning' || this.waveState === 'active') {
            console.log(`🛑 Force stopping wave ${this.currentWave}`);
            this.clearTimers();
            this.waveState = WaveState.COMPLETED;
            this.prepareForNextWave();
        }
    }

    /**
     * 停止遊戲流程
     */
    public stopGameFlow(): void {
        console.log(`🛑 Stopping game flow at wave ${this.currentWave}`);

        this.flowRunning = false;
        this.gameFlowState = GameFlowState.STOPPED;

        // 清理所有定時器
        this.clearAllTimers();

        // 重置狀態
        this.waveState = WaveState.PREPARING;
    }

    /**
     * 完成所有波次
     */
    private completeAllWaves(): void {
        this.gameFlowState = GameFlowState.GAME_OVER;
        this.flowRunning = false;

        this.broadcastLog("恭喜！您成功完成了所有波次挑戰！", 'event');
        console.log(`🏆 All ${this.flowConfig.maxWaves} waves completed!`);

        if (this.endGameCallback) {
            this.endGameCallback("waveComplete");
        }
    }

    /**
     * 清理所有定時器
     */
    private clearAllTimers(): void {
        this.clearTimers(); // 清理波次相關定時器

        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
        }
    }

    /**
     * 更新 GameCore 狀態的輔助方法
     */
    private updateGameCore(status: string, roundTime: number, waveNumber: number): void {
        if (this.updateGameCoreCallback) {
            this.updateGameCoreCallback(status, roundTime, waveNumber);
        }
    }

    /**
     * 廣播日誌的輔助方法
     */
    private broadcastLog(message: string, category?: string): void {
        if (this.broadcastLogCallback) {
            this.broadcastLogCallback(message, category);
        }
    }

    /**
     * 移除所有敵人的輔助方法
     */
    private removeAllEnemies(): void {
        if (this.removeAllEnemiesCallback) {
            this.removeAllEnemiesCallback();
        }
    }

    /**
     * 由外部控制開始波次（不包含準備時間）
     * @param waveNumber 波次編號
     * @param battleDurationSeconds 戰鬥持續時間（秒）
     */
    public startWaveImmediate(waveNumber: number, battleDurationSeconds: number = 30): boolean {
        if (this.waveState === WaveState.SPAWNING || this.waveState === WaveState.ACTIVE) {
            console.warn(`⚠️ Cannot start wave while in active state: ${this.waveState}`);
            return false;
        }

        // 如果狀態是 FAILED，先重置
        if (this.waveState === WaveState.FAILED) {
            console.log(`🔄 Resetting from failed state`);
            this.prepareForNextWave();
        }

        this.currentWave = waveNumber;
        this.waveState = WaveState.SPAWNING;
        this.activeWaveConfig = this.generateWaveConfig(waveNumber, battleDurationSeconds);

        console.log(`🌊 Starting Wave ${this.currentWave} immediately (${battleDurationSeconds}s battle time)...`);
        console.log(`📊 Wave Config:`, {
            enemies: this.activeWaveConfig.enemyCount,
            types: this.activeWaveConfig.enemyTypes.join(', '), // 🔄 現在直接是字符串ID
            isBoss: this.activeWaveConfig.isBossWave,
            spawnInterval: `${this.activeWaveConfig.spawnInterval}ms`
        });

        // 重置統計
        this.enemiesSpawned = 0;
        this.enemiesAlive = 0;
        this.waveStartTime = Date.now();

        // 觸發波次開始事件
        this.emitEvent({
            type: 'wave_start',
            waveNumber: this.currentWave,
            data: this.activeWaveConfig
        });

        // 立即開始生成敵人
        this.startSpawning();

        return true;
    }

    /**
     * 開始新波次 - 包含準備時間（保留原有方法用於測試）
     */
    public startWave(waveNumber?: number): boolean {
        if (this.waveState !== WaveState.PREPARING && this.waveState !== WaveState.COMPLETED) {
            console.warn(`⚠️ Cannot start wave while in state: ${this.waveState}`);
            return false;
        }

        this.currentWave = waveNumber || (this.currentWave + 1);
        this.waveState = WaveState.PREPARING;
        this.activeWaveConfig = this.generateWaveConfig(this.currentWave, 30); // 默認30秒戰鬥時間

        console.log(`🌊 Starting Wave ${this.currentWave}...`);
        console.log(`📊 Wave Config:`, {
            enemies: this.activeWaveConfig.enemyCount,
            types: this.activeWaveConfig.enemyTypes.join(', '), // 🔄 現在直接是字符串ID
            isBoss: this.activeWaveConfig.isBossWave
        });

        // 重置統計
        this.enemiesSpawned = 0;
        this.enemiesAlive = 0;
        this.waveStartTime = Date.now();

        // 觸發波次開始事件
        this.emitEvent({
            type: 'wave_start',
            waveNumber: this.currentWave,
            data: this.activeWaveConfig
        });

        // 準備階段延遲
        setTimeout(() => {
            this.startSpawning();
        }, this.activeWaveConfig.preparationTime);

        return true;
    }

    /**
     * 開始生成敵人
     */
    private startSpawning(): void {
        if (!this.activeWaveConfig) {
            console.error("❌ No active wave config for spawning");
            return;
        }

        this.waveState = WaveState.SPAWNING;
        console.log(`🏭 Starting enemy spawning for Wave ${this.currentWave}`);

        // 設置波次超時
        this.waveTimer = setTimeout(() => {
            this.onWaveTimeout();
        }, this.activeWaveConfig.waveTimeout);

        // 開始定期生成敵人
        this.scheduleNextSpawn();
    }

    /**
     * 安排下一次敵人生成
     */
    private scheduleNextSpawn(): void {
        if (!this.activeWaveConfig || this.enemiesSpawned >= this.activeWaveConfig.enemyCount) {
            this.onAllEnemiesSpawned();
            return;
        }

        this.spawnTimer = setTimeout(() => {
            this.spawnNextEnemy();
            this.scheduleNextSpawn(); // 遞歸安排下一次生成
        }, this.activeWaveConfig.spawnInterval);
    }

    /**
     * 生成下一個敵人
     */
    private spawnNextEnemy(): void {
        if (!this.activeWaveConfig) return;

        try {
            const enemy = this.createEnemyForCurrentWave();
            if (enemy) {
                this.enemiesSpawned++;
                this.enemiesAlive++;

                console.log(`🧟 Spawned enemy ${this.enemiesSpawned}/${this.activeWaveConfig.enemyCount}: ${enemy.name}`);

                this.emitEvent({
                    type: 'enemy_spawned',
                    waveNumber: this.currentWave,
                    data: enemy
                });
            }
        } catch (error) {
            console.error("❌ Error spawning enemy:", error);
        }
    }

    /**
     * 為當前波次創建敵人
     */
    private createEnemyForCurrentWave(): ServerEnemy | null {
        if (!this.activeWaveConfig) return null;

        // 獲取生成位置
        const spawnConfig = this.getSpawnConfigForWave();
        const existingUnits = this.getCurrentUnits(); // 需要外部提供
        const spawnPositions = this.spawnManager.getSpawnPositions(spawnConfig, existingUnits);

        if (spawnPositions.length === 0) {
            console.warn("⚠️ No valid spawn positions found");
            return null;
        }

        // 選擇一個生成位置
        const position = spawnPositions[0];

        // 🔄 使用動態配置系統生成敵人
        const enemy = EnemyFactory.createRandomEnemyByWave(position, this.currentWave);

        if (!enemy) {
            console.warn(`⚠️ No available enemies for wave ${this.currentWave}`);
            return null;
        }

        return enemy;
    }

    /**
     * 獲取當前波次的生成配置
     */
    private getSpawnConfigForWave(): SpawnConfig {
        if (!this.activeWaveConfig) {
            return SpawnManager.getDefaultSpawnConfig(1);
        }

        return {
            type: this.activeWaveConfig.spawnType,
            count: 1, // 每次生成一個
            minDistanceFromPlayers: 120,
            minDistanceBetweenEnemies: 60,
            maxAttempts: 30
        };
    }

    /**
     * 所有敵人已生成
     */
    private onAllEnemiesSpawned(): void {
        this.waveState = WaveState.ACTIVE;
        console.log(`✅ All ${this.enemiesSpawned} enemies spawned for Wave ${this.currentWave}`);

        this.emitEvent({
            type: 'all_enemies_spawned',
            waveNumber: this.currentWave,
            data: { totalSpawned: this.enemiesSpawned }
        });
    }

    /**
     * 敵人死亡時調用
     */
    public onEnemyDeath(enemyId: string): void {
        this.enemiesAlive = Math.max(0, this.enemiesAlive - 1);

        console.log(`💀 Enemy died. Remaining: ${this.enemiesAlive}`);

        // 檢查波次是否完成
        if (this.enemiesAlive === 0 && this.waveState === WaveState.ACTIVE) {
            this.completeWave();
        }
    }

    /**
     * 準備下一波次
     */
    private prepareForNextWave(): void {
        this.waveState = WaveState.PREPARING;
        this.activeWaveConfig = null;
        this.enemiesSpawned = 0;
        this.enemiesAlive = 0;
        console.log(`✅ Prepared for next wave (current: ${this.currentWave})`);
    }

    /**
     * 完成波次
     */
    private completeWave(): void {
        this.waveState = WaveState.COMPLETED;
        this.totalWavesCompleted++;

        const duration = Date.now() - this.waveStartTime;
        console.log(`🏆 Wave ${this.currentWave} completed in ${(duration / 1000).toFixed(1)}s`);

        // 清理定時器
        this.clearTimers();

        // 分發獎勵
        this.distributeWaveRewards();

        this.emitEvent({
            type: 'wave_complete',
            waveNumber: this.currentWave,
            data: {
                duration,
                rewards: this.activeWaveConfig?.rewards
            }
        });

        // 立即準備下一波（由 GameManager 控制時序）
        this.prepareForNextWave();
    }

    /**
     * 波次超時
     */
    private onWaveTimeout(): void {
        this.waveState = WaveState.FAILED;
        console.log(`⏰ Wave ${this.currentWave} timed out`);

        this.clearTimers();

        this.emitEvent({
            type: 'wave_failed',
            waveNumber: this.currentWave,
            data: { reason: 'timeout' }
        });
    }

    /**
     * 🔄 生成波次配置 - 配合 GameManager 的時間設置（使用動態敵人系統）
     */
    private generateWaveConfig(waveNumber: number, battleDuration: number = 30): WaveConfig {
        // 🔄 使用動態配置獲取可用敵人ID
        const availableEnemyIds = EnemyFactory.getAvailableEnemyIds(waveNumber);

        // 檢查是否為 Boss 波次
        const bossEnemies = EnemyFactory.getEnemiesByAIType(waveNumber, 'boss');
        const isBossWave = bossEnemies.length > 0 && waveNumber % 5 === 0;

        // 敵人數量計算
        const enemyCount = EnemyFactory.calculateEnemyCount(waveNumber);

        // 根據戰鬥時間動態調整生成間隔
        const totalBattleTime = battleDuration * 1000; // 轉換為毫秒
        const spawnInterval = Math.max(1000, Math.floor(totalBattleTime / (enemyCount + 2))); // 確保在戰鬥時間內生成完畢

        return {
            waveNumber,
            enemyTypes: availableEnemyIds as any, // 🔄 現在存儲字符串ID而非枚舉
            enemyCount,
            spawnType: isBossWave ? SpawnType.BOSS_CENTER : SpawnType.RANDOM_EDGE,
            preparationTime: 0, // 準備時間由 GameManager 控制
            spawnInterval: isBossWave ? 0 : spawnInterval,
            waveTimeout: totalBattleTime + 5000, // 戰鬥時間 + 5秒緩衝
            isBossWave,
            rewards: {
                experience: waveNumber * 50,
                gold: waveNumber * 25,
                items: isBossWave ? [`boss_loot_${waveNumber}`] : undefined
            }
        };
    }    /**
     * 分發波次獎勵
     */
    private distributeWaveRewards(): void {
        if (!this.activeWaveConfig) return;

        const rewards = this.activeWaveConfig.rewards;
        console.log(`🎁 Distributing wave rewards:`, rewards);

        // 這裡應該調用獎勵系統分發獎勵給玩家
        // rewardSystem.distributeRewards(rewards);
    }

    /**
     * 清理所有定時器
     */
    private clearTimers(): void {
        if (this.spawnTimer) {
            clearTimeout(this.spawnTimer);
            this.spawnTimer = null;
        }
        if (this.waveTimer) {
            clearTimeout(this.waveTimer);
            this.waveTimer = null;
        }
    }

    /**
     * 註冊事件監聽器
     */
    public on(eventType: string, callback: Function): void {
        const callbacks = this.eventCallbacks.get(eventType) || [];
        callbacks.push(callback);
        this.eventCallbacks.set(eventType, callbacks);
    }

    /**
     * 觸發事件
     */
    private emitEvent(event: WaveEvent): void {
        const callbacks = this.eventCallbacks.get(event.type) || [];
        callbacks.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error(`Error in event callback for ${event.type}:`, error);
            }
        });
    }

    /**
     * 設置獲取當前單位的回調函數
     */
    public setGetCurrentUnitsCallback(callback: () => ServerGameUnit[]): void {
        this.getCurrentUnitsCallback = callback;
    }

    /**
     * 獲取當前單位列表
     */
    private getCurrentUnits(): ServerGameUnit[] {
        if (this.getCurrentUnitsCallback) {
            return this.getCurrentUnitsCallback();
        }
        console.warn("⚠️ No getCurrentUnits callback set, returning empty array");
        return [];
    }

    // === Getters ===

    public getCurrentWaveNumber(): number {
        return this.currentWave;
    }

    public getWaveState(): WaveState {
        return this.waveState;
    }

    public getActiveWaveConfig(): WaveConfig | null {
        return this.activeWaveConfig;
    }

    public getEnemiesAlive(): number {
        return this.enemiesAlive;
    }

    public getTotalWavesCompleted(): number {
        return this.totalWavesCompleted;
    }

    /**
     * 強制停止當前波次
     */
    public stopWave(): void {
        this.clearTimers();
        this.waveState = WaveState.COMPLETED; // 改為 COMPLETED 而不是 FAILED
        console.log(`🛑 Wave ${this.currentWave} force stopped by GameManager`);

        // 立即準備下一波
        this.prepareForNextWave();
    }

    /**
     * 重置波次管理器
     */
    public reset(): void {
        this.clearTimers();
        this.currentWave = 0;
        this.waveState = WaveState.PREPARING;
        this.activeWaveConfig = null;
        this.enemiesSpawned = 0;
        this.enemiesAlive = 0;
        this.totalWavesCompleted = 0;
        console.log("🔄 Wave manager reset");
    }

    /**
     * 獲取波次統計
     */
    public getWaveStats(): any {
        return {
            currentWave: this.currentWave,
            state: this.waveState,
            enemiesSpawned: this.enemiesSpawned,
            enemiesAlive: this.enemiesAlive,
            totalCompleted: this.totalWavesCompleted,
            duration: this.waveStartTime ? Date.now() - this.waveStartTime : 0
        };
    }

    /**
     * 獲取遊戲流程狀態
     */
    public getGameFlowState(): GameFlowState {
        return this.gameFlowState;
    }

    /**
     * 檢查流程是否運行中
     */
    public isFlowRunning(): boolean {
        return this.flowRunning;
    }

    /**
     * 獲取流程配置
     */
    public getFlowConfig(): GameFlowConfig {
        return { ...this.flowConfig };
    }

}
