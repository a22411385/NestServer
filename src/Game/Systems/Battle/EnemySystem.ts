import { Delayed } from "colyseus";
import { MapSchema } from "@colyseus/schema";
import { GameRoomState, UnitType } from "../../../Colyseus/Schema/GameState";
import { IdGenerator } from "../../../Util/IdGenerator";
import { ServerEnemy } from "../../../Colyseus/Schema/Unit/Enemy";
import { ServerHero } from "../../../Colyseus/Schema/Unit/Hero";
import { GameRoom } from "../../../Colyseus/Rooms/GameRoom";
import { Vector2 } from "../../../Colyseus/Schema/Unit/GameUnit";
import { WaveManager } from "../../Managers/WaveManager/WaveManager";
import { EnemyCoordinationSystem } from "./EnemyCoordinationSystem";
import { BattleMathUtils } from "../../../Util/BattleMathUtils";

const mapSize = 1000;

/**
 * 敵人系統 - 負責敵人管理、AI 更新和波次管理
 */
export class EnemySystem {
    private room: GameRoom;
    private state: GameRoomState;
    private enemySpawnTimer: Delayed | null = null;
    private waveManager: WaveManager;
    private enemyCoordination: EnemyCoordinationSystem;

    constructor(room: GameRoom) {
        this.room = room;
        this.state = room.state;

        // 初始化敵人協調系統
        this.enemyCoordination = new EnemyCoordinationSystem();

        // 初始化波次管理器
        this.waveManager = new WaveManager(mapSize, mapSize);
        this.setupWaveManagerEvents();

        // 設置獲取當前單位的回調
        this.waveManager.setGetCurrentUnitsCallback(() => {
            return Array.from(this.state.allUnits.values());
        });
    }

    /**
     * 設置波次管理器事件監聽
     */
    private setupWaveManagerEvents(): void {
        // 敵人生成事件
        this.waveManager.on('enemy_spawned', (event: any) => {
            const enemy = event.data as ServerEnemy;
            this.addEnemyToGame(enemy);
        });

        // 波次開始事件
        this.waveManager.on('wave_start', (event: any) => {
            console.log(`🌊 Wave ${event.waveNumber} started!`);
            // 通知所有客戶端波次開始
            this.room.broadcast("wave_start", { waveNumber: event.waveNumber, config: event.data });
        });

        // 波次完成事件
        this.waveManager.on('wave_complete', (event: any) => {
            console.log(`🏆 Wave ${event.waveNumber} completed!`);
            // 通知客戶端波次完成
            this.room.broadcast("wave_complete", {
                waveNumber: event.waveNumber,
                duration: event.data.duration,
                rewards: event.data.rewards
            });
        });

        // 波次失敗事件
        this.waveManager.on('wave_failed', (event: any) => {
            console.log(`💀 Wave ${event.waveNumber} failed!`);
            this.room.broadcast("wave_failed", { waveNumber: event.waveNumber });
        });
    }

    /**
     * 添加敵人到遊戲狀態
     */
    private addEnemyToGame(enemy: ServerEnemy): void {
        enemy.id = IdGenerator.generateEnemyId(enemy.lv);
        this.state.allUnits.set(enemy.id, enemy);
        console.log(`➕ Added enemy ${enemy.name} (${enemy.id}) to game state`);
    }

    /**
     * 開始新波次（配合 GameManager 時序）
     */
    public startNewWave(waveNumber?: number): boolean {
        return this.waveManager.startWave(waveNumber);
    }

    /**
     * 立即開始波次（由 GameManager 調用）
     */
    public startWaveImmediate(waveNumber: number, battleDurationSeconds: number): boolean {
        return this.waveManager.startWaveImmediate(waveNumber, battleDurationSeconds);
    }

    /**
     * 獲取波次管理器
     */
    public getWaveManager(): WaveManager {
        return this.waveManager;
    }

    /**
     * 🆕 獲取敵人協調系統
     */
    public getEnemyCoordination(): EnemyCoordinationSystem {
        return this.enemyCoordination;
    }

    /**
     * 開始敵人生成循環
     */
    startEnemySpawning(): void {
        if (this.enemySpawnTimer) {
            this.enemySpawnTimer.clear();
        }

        // 每秒生成一隻
        this.enemySpawnTimer = this.room.clock.setInterval(() => {
            this.room.unitManager.spawnZombies();
        }, 1000);
    }

    /**
     * 停止敵人生成
     */
    stopEnemySpawning(): void {
        if (this.enemySpawnTimer) {
            this.enemySpawnTimer.clear();
            this.enemySpawnTimer = null;
        }
    }


    /**
     * 測試房專用：生成單隻敵人到指定位置
     */
    spawnSingleEnemy(x: number, y: number, type: number = 1): string {
        const enemy = new ServerEnemy();
        // 🔧 使用統一的測試ID生成系統
        enemy.id = IdGenerator.generateTestEnemyId(type);

        // 設置敵人類型
        enemy.initializeByType(type);

        // 設置指定位置
        enemy.position = new Vector2(
            BattleMathUtils.clamp(x, 0, 1000),
            BattleMathUtils.clamp(y, 0, 800)
        );

        // 添加到遊戲狀態
        this.state.addEnemy(enemy);

        return enemy.id;
    }

    /**
     * 🆕 測試模式：生成木樁殭屍（不會動、血量極高）
     * 
     * @param x X 座標
     * @param y Y 座標
     * @param hp 血量（默認 999999）
     * @returns 敵人ID
     */
    spawnTestDummy(x: number, y: number, hp: number = 999999): string {
        const enemy = new ServerEnemy();
        enemy.id = IdGenerator.generateTestEnemyId(999); // 特殊類型ID

        // 設置為木樁殭屍
        enemy.name = "木樁殭屍";
        enemy.type = UnitType.enemy;
        enemy.lv = 999; // 特殊等級標記

        // 極高血量
        enemy.hp = hp;
        enemy.maxHp = hp;

        // 不會移動
        enemy.moveSpeed = 0;

        // 不會攻擊
        enemy.damage = 0;
        enemy.attackSpeed = 999999;
        enemy.attackRange = 0;

        // 無經驗獎勵
        enemy.expReward = 0;

        // 設置碰撞框
        enemy.collisionWidth = 32;
        enemy.collisionHeight = 32;
        enemy.scale = 1.2; // 稍微大一點以便觀察

        // 設置位置
        enemy.position = new Vector2(
            BattleMathUtils.clamp(x, 0, 1000),
            BattleMathUtils.clamp(y, 0, 800)
        );

        // 添加到遊戲狀態
        this.state.addEnemy(enemy);

        console.log(`🎯 生成測試木樁殭屍: ${enemy.id} at (${x}, ${y}) HP=${hp}`);

        return enemy.id;
    }

    /**
     * 更新所有敵人的 AI - 效能優化版本
     */
    public updateEnemyAI(deltaTime: number, currentTime: number): void {
        if (!this.room?.state?.gameCore?.allUnits) return;

        //const heroes = this.room.state.allUnits;
        const allUnits = this.room.state.gameCore.allUnits;
        const enemies: ServerEnemy[] = [];

        // 收集所有活著的敵人
        for (const unit of allUnits.values()) {
            if (unit instanceof ServerEnemy && !unit.isDead) {
                enemies.push(unit);
            }
        }

        // 群體協調
        if (enemies.length > 1) {
            this.enemyCoordination.coordinateEnemyMovement(enemies);
        }

        // 🔧 修改敵人AI更新方式
        for (const unit of allUnits.values()) {
            if (unit instanceof ServerEnemy && !unit.isDead) {
                // 🎯 讓敵人AI更新速度向量，而不是直接移動
                const heroes = new MapSchema<ServerHero>();
                for (const unit of allUnits.values()) {
                    if (unit instanceof ServerHero && !unit.isDead) {
                        heroes.set(unit.id, unit);
                    }
                }
                unit.updateAI(heroes, deltaTime, currentTime, allUnits);

                // 🎯 AI 只更新速度向量 (vx, vy)，不直接移動位置
                // 移動由 MovementSystem.MoveAllUnit() 統一處理
            }
        }
    }

    /**
     * 清除所有敵人
     */
    clearAllEnemies(): void {
        this.state.removeAllEnemy();
    }

    /**
     * 獲取存活的敵人數量
     */
    getAliveEnemyCount(): number {
        let count = 0;
        for (const [, unit] of this.state.allUnits) {
            if (unit.type === UnitType.enemy && !unit.isDead) {
                count++;
            }
        }
        return count;
    }

    /**
     * 清理系統資源
     */
    cleanup(): void {
        this.stopEnemySpawning();
    }
}
