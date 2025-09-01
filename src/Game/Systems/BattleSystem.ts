import { Room, Client, Delayed } from "colyseus";
import { MapSchema } from "@colyseus/schema";
import { GameRoomState, UnitType } from "../../Colyseus/Schema/GameState";
import { GameManager } from "../Managers/GameManager";
import { IdGenerator } from "../../Util/IdGenerator";
import { ServerEnemy } from "../../Colyseus/Schema/Unit/Enemy";
import { ServerHero } from "../../Colyseus/Schema/Unit/Hero";
import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { Vector2 } from "../../Colyseus/Schema/Unit/GameUnit";
import { WaveManager, WaveState } from "../Managers/WaveManager";
import { EnemyType } from "../Factories/EnemyFactory";
import { EnemyCoordinationSystem } from "./EnemyCoordinationSystem";

const mapSize = 1000;
const maxZombies = 50;

/**
 * 戰鬥系統 - 負責戰鬥邏輯、敵人管理、AI 更新和攻擊處理
 */
export class BattleSystem {
    private room: GameRoom;
    private state: GameRoomState;
    private enemySpawnTimer: Delayed | null = null;
    private gameManager: GameManager | null = null;
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
     * 設置 GameManager 引用
     */
    setGameManager(gameManager: GameManager): void {
        this.gameManager = gameManager;
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
     * 處理玩家攻擊
     */
    handlePlayerAttack(client: Client, targetX: number, targetY: number): void {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        const hero = this.state.getHero(client.sessionId);
        if (!hero || hero.isDead) return;

        // 查找範圍內的敵人
        let targetEnemy: ServerEnemy | null = null;
        let closestDistance = hero.attackRange;

        for (const [unitId, unit] of this.state.allUnits) {
            if (unit.type !== UnitType.enemy || unit.isDead) continue;

            const enemy = unit as ServerEnemy;
            const distance = Math.hypot(
                enemy.position.x - targetX,
                enemy.position.y - targetY
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
            this.broadcastBattleLog(`${hero.name} 對 殭屍#${targetEnemy.id.slice(-4)} 造成 ${damage} 點傷害`, 'damage');

            if (killed) {
                this.broadcastBattleLog(`${hero.name} 擊殺了 殭屍#${targetEnemy.id.slice(-4)}`, 'kill');

                // 給予經驗值
                if (hero.addExperience(targetEnemy.expReward)) {
                    this.broadcastBattleLog(`${hero.name} 升級至 Lv.${hero.level}！`, 'event');
                }

                // 通知波次管理器敵人死亡
                this.waveManager.onEnemyDeath(targetEnemy.id);

                // 移除死亡的敵人
                this.state.removeEnemy(targetEnemy.id);
            }

            // 廣播攻擊視覺效果
            this.room.broadcast("playerAttacked", {
                playerId: client.sessionId,
                targetX: targetX,
                targetY: targetY,
                damage: damage,
                killed: killed
            });
        }
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
            Math.max(0, Math.min(1000, x)),
            Math.max(0, Math.min(800, y))
        );

        // 添加到遊戲狀態
        this.state.addEnemy(enemy);

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
     * 處理戰鬥傷害回報
     */
    processDamageReport(heroHealthChanges: Map<string, { before: number; after: number; hero: ServerHero }>): void {
        for (const [heroId, healthData] of heroHealthChanges) {
            if (healthData.after < healthData.before) {
                const damage = healthData.before - healthData.after;
                this.broadcastBattleLog(`殭屍 對 ${healthData.hero.name} 造成 ${damage} 點傷害`, 'damage');
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
     * 獲取當前敵人數量
     */
    getEnemyCount(): number {
        return this.state.getEnemyCount();
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
}
