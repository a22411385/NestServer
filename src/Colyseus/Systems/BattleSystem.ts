import { Room, Client, Delayed } from "colyseus";
import { MapSchema } from "@colyseus/schema";
import { GameRoomState, UnitType } from "../Schema/GameState";
import { GameManager } from "../Managers/GameManager";
import { IdGenerator } from "../../Util/IdGenerator";
import { ServerEnemy } from "../Schema/Unit/Enemy";
import { ServerHero } from "../Schema/Unit/Hero";
import { GameRoom } from "../Rooms/GameRoom";
import { Vector2 } from "../Schema/Unit/GameUnit";

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

    constructor(room: GameRoom) {
        this.room = room;
        this.state = room.state;
    }

    /**
     * 設置 GameManager 引用
     */
    setGameManager(gameManager: GameManager): void {
        this.gameManager = gameManager;
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
    updateEnemyAI(deltaTime: number, currentTime: number): Map<string, { before: number; after: number; hero: ServerHero }> {
        const heroHealthChanges = new Map<string, { before: number; after: number; hero: ServerHero }>();

        // 記錄攻擊前的英雄血量並創建MapSchema
        const heroMapSchema = new MapSchema<ServerHero>();
        for (const [unitId, unit] of this.state.allUnits) {
            if (unit.type === UnitType.hero && !unit.isDead) {
                const hero = unit as ServerHero;
                heroMapSchema.set(unitId, hero);
                heroHealthChanges.set(unitId, {
                    before: hero.hp,
                    after: hero.hp,
                    hero: hero
                });
            }
        }

        // 更新每個敵人的 AI
        for (const [unitId, unit] of this.state.allUnits) {
            if (unit.type === UnitType.enemy && !unit.isDead) {
                const enemy = unit as ServerEnemy;
                // 呼叫 Enemy 自己的優化 AI 更新，傳遞所有單位信息
                enemy.updateAI(heroMapSchema, deltaTime, currentTime, this.state.allUnits);
                //  this.room.movementSystem.addMoveData(enemy.id, moveVector);
            }
        }

        // 更新攻擊後的血量
        for (const [heroId, healthData] of heroHealthChanges) {
            healthData.after = healthData.hero.hp;
        }

        return heroHealthChanges;
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
