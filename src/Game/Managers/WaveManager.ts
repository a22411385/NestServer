import { EnemyFactory, EnemyType } from "../Factories/EnemyFactory";
import { SpawnManager, SpawnType, SpawnConfig } from "./SpawnManager";
import { Vector2 } from "../../Colyseus/Schema/Unit/GameUnit";
import { ServerEnemy } from "../../Colyseus/Schema/Unit/Enemy";
import { ServerGameUnit } from "../../Colyseus/Schema/Unit/GameUnit";

/**
 * 波次狀態枚舉
 */
export enum WaveState {
    PREPARING = "preparing",    // 準備階段
    SPAWNING = "spawning",      // 生成階段
    ACTIVE = "active",          // 戰鬥階段
    COMPLETED = "completed",    // 完成階段
    FAILED = "failed"           // 失敗階段
}

/**
 * 波次配置介面
 */
export interface WaveConfig {
    waveNumber: number;
    enemyTypes: EnemyType[];
    enemyCount: number;
    spawnType: SpawnType;
    preparationTime: number;    // 準備時間（毫秒）
    spawnInterval: number;      // 生成間隔（毫秒）
    waveTimeout: number;        // 波次超時時間（毫秒）
    isBossWave: boolean;
    rewards: {
        experience: number;
        gold: number;
        items?: string[];
    };
}

/**
 * 波次事件介面
 */
export interface WaveEvent {
    type: 'wave_start' | 'wave_complete' | 'wave_failed' | 'enemy_spawned' | 'all_enemies_spawned';
    waveNumber: number;
    data?: any;
}

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

    constructor(mapWidth: number, mapHeight: number) {
        this.spawnManager = new SpawnManager(mapWidth, mapHeight);
        this.initializeEventCallbacks();
    }

    /**
     * 初始化事件回調系統
     */
    private initializeEventCallbacks(): void {
        const eventTypes = ['wave_start', 'wave_complete', 'wave_failed', 'enemy_spawned', 'all_enemies_spawned'];
        eventTypes.forEach(type => {
            this.eventCallbacks.set(type, []);
        });
    }

    /**
     * 開始新波次
     */
    public startWave(waveNumber?: number): boolean {
        if (this.waveState !== WaveState.PREPARING && this.waveState !== WaveState.COMPLETED) {
            console.warn(`⚠️ Cannot start wave while in state: ${this.waveState}`);
            return false;
        }

        this.currentWave = waveNumber || (this.currentWave + 1);
        this.waveState = WaveState.PREPARING;
        this.activeWaveConfig = this.generateWaveConfig(this.currentWave);

        console.log(`🌊 Starting Wave ${this.currentWave}...`);
        console.log(`📊 Wave Config:`, {
            enemies: this.activeWaveConfig.enemyCount,
            types: this.activeWaveConfig.enemyTypes.map(t => EnemyType[t]).join(', '),
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

        // 選擇敵人類型
        const enemyType = this.selectEnemyType();

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

        // 創建敵人
        const enemy = EnemyFactory.createEnemy(enemyType, position, this.currentWave);

        return enemy;
    }

    /**
     * 選擇敵人類型
     */
    private selectEnemyType(): EnemyType {
        if (!this.activeWaveConfig) return EnemyType.NORMAL_ZOMBIE;

        const availableTypes = this.activeWaveConfig.enemyTypes;
        const randomIndex = Math.floor(Math.random() * availableTypes.length);
        return availableTypes[randomIndex];
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
     * 生成波次配置
     */
    private generateWaveConfig(waveNumber: number): WaveConfig {
        const isBossWave = waveNumber % 5 === 0;
        const enemyTypes = EnemyFactory.getRecommendedEnemyTypes(waveNumber);
        const enemyCount = EnemyFactory.calculateEnemyCount(waveNumber);

        return {
            waveNumber,
            enemyTypes,
            enemyCount,
            spawnType: isBossWave ? SpawnType.BOSS_CENTER : SpawnType.RANDOM_EDGE,
            preparationTime: 3000, // 3秒準備時間
            spawnInterval: isBossWave ? 0 : 1500, // Boss立即生成，其他間隔1.5秒
            waveTimeout: 120000, // 2分鐘超時
            isBossWave,
            rewards: {
                experience: waveNumber * 50,
                gold: waveNumber * 25,
                items: isBossWave ? [`boss_loot_${waveNumber}`] : undefined
            }
        };
    }

    /**
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
        this.waveState = WaveState.FAILED;
        console.log(`🛑 Wave ${this.currentWave} force stopped`);
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
}
