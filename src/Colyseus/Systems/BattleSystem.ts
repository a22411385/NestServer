import { Room, Client, Delayed } from "colyseus";
import { GameRoomState } from "../Schema/GameState";
import { GameManager } from "../Managers/GameManager";
import { IdGenerator } from "../../Util/IdGenerator";
import { Enemy } from "../Schema/Unit/Enemy";
import { Hero } from "@/Shared/struct";

const mapSize = 1000;
const maxZombies = 50;

/**
 * 戰鬥系統 - 負責戰鬥邏輯、敵人管理、AI 更新和攻擊處理
 */
export class BattleSystem {
    private room: Room<GameRoomState>;
    private state: GameRoomState;
    private enemySpawnTimer: Delayed | null = null;
    private gameManager: GameManager | null = null;

    constructor(room: Room<GameRoomState>) {
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

        const hero = this.state.heroes.get(client.sessionId);
        if (!hero || hero.isDead) return;

        // 查找範圍內的敵人
        let targetEnemy: Enemy | null = null;
        let closestDistance = hero.attackRange;

        for (const [enemyId, enemy] of this.state.getAllEnemies()) {
            if (enemy.isDead) continue;

            const distance = Math.hypot(
                enemy.x - targetX,
                enemy.y - targetY
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
                if (hero.gainExp(targetEnemy.expReward)) {
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
     * 處理玩家移動向量
     */
    handlePlayerMoveVector(client: Client, vx: number, vy: number): void {
        const hero = this.state.heroes.get(client.sessionId);

        if (hero) {
            // 設置移動向量
            if (hero.vx != vx || hero.vy != vy) {
                hero.vx = vx;
                hero.vy = vy;
                // 通知 GameManager 添加到移動同步數據
                if (this.gameManager) {
                    this.gameManager.addMoveData(hero.id, { vx, vy });
                }

                console.log(`🎯 Player ${hero.name} velocity: (${vx.toFixed(2)}, ${vy.toFixed(2)})`);
            }


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
            this.spawnZombies();
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
     * 生成殭屍到 enemies，數量不超過最大上限
     */
    private spawnZombies(): void {
        const currentCount = this.state.getEnemyCount();
        const canSpawn = Math.max(0, maxZombies - currentCount);
        const spawnCount = Math.min(1, canSpawn);
        if (spawnCount <= 0) return;

        let spawnedCount = 0;
        for (let i = 0; i < spawnCount; i++) {
            // 隨機決定殭屍類型
            const randomType = Math.floor(Math.random() * 3) + 1;

            const enemy = new Enemy();
            // 🔧 使用統一的ID生成系統
            enemy.id = IdGenerator.generateEnemyId(randomType);
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

    /**
     * 測試房專用：生成單隻敵人到指定位置
     */
    spawnSingleEnemy(x: number, y: number, type: number = 1): string {
        const enemy = new Enemy();
        // 🔧 使用統一的測試ID生成系統
        enemy.id = IdGenerator.generateTestEnemyId(type);

        // 設置敵人類型
        enemy.initializeByType(type);

        // 設置指定位置
        enemy.x = Math.max(0, Math.min(1000, x));
        enemy.y = Math.max(0, Math.min(800, y));

        // 添加到遊戲狀態
        this.state.addEnemy(enemy);

        return enemy.id;
    }

    /**
     * 更新所有敵人的 AI - 效能優化版本
     */
    updateEnemyAI(deltaTime: number, currentTime: number): Map<string, { before: number; after: number; hero: Hero }> {
        const heroHealthChanges = new Map<string, { before: number; after: number; hero: Hero }>();

        // 記錄攻擊前的英雄血量
        for (const [heroId, hero] of this.state.heroes) {
            if (!hero.isDead) {
                heroHealthChanges.set(heroId, {
                    before: hero.hp,
                    after: hero.hp,
                    hero: hero
                });
            }
        }

        // 更新每個敵人的 AI
        for (const [enemyId, enemy] of this.state.getAllEnemies()) {
            if (!enemy.isDead) {
                // 呼叫 Enemy 自己的優化 AI 更新
                enemy.updateAI(this.state.heroes, deltaTime, currentTime);
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
    processDamageReport(heroHealthChanges: Map<string, { before: number; after: number; hero: Hero }>): void {
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
        for (const [, enemy] of this.state.getAllEnemies()) {
            if (!enemy.isDead) count++;
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
