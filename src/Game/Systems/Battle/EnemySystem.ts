import { Vector2 } from "../../../Colyseus/Schema/Unit/GameUnit";
import { MapSchema } from "@colyseus/schema";
import { GameRoomState, UnitType } from "../../../Colyseus/Schema/GameState";
import { IdGenerator } from "../../../Util/IdGenerator";
import { ServerEnemy } from "../../../Colyseus/Schema/Unit/Enemy";
import { ServerHero } from "../../../Colyseus/Schema/Unit/Hero";
import { GameRoom } from "../../../Colyseus/Rooms/GameRoom";
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
            enemy.id = IdGenerator.generateEnemyId(enemy.lv);
            this.state.allUnits.set(enemy.id, enemy);
            console.log(`➕ Added enemy ${enemy.name} (${enemy.id}) to game state`);
        });
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
        if (!this.room.state.allUnits) return;

        //const heroes = this.room.state.allUnits;
        const allUnits = this.room.state.allUnits;
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

        // 🔧 效能優化:先收集所有英雄,避免在每個敵人的迴圈中重複創建
        const heroes = new MapSchema<ServerHero>();
        for (const unit of allUnits.values()) {
            if (unit instanceof ServerHero && !unit.isDead) {
                heroes.set(unit.id, unit);
            }
        }

        // 更新所有敵人的AI
        for (const enemy of enemies) {
            // 🎯 AI 只更新速度向量 (vx, vy)，不直接移動位置
            // 移動由 MovementSystem.MoveAllUnit() 統一處理
            enemy.updateAI(heroes, deltaTime, currentTime, allUnits);
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
}
