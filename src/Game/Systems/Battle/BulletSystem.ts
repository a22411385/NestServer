import { ServerBullet } from "../../../Colyseus/Schema/Bullet";
import { BulletCreateConfig } from "@/Types";
import { BulletFactory } from "../../Factories/BulletFactory";
import { GameRoom } from "../../../Colyseus/Rooms/GameRoom";
import { ServerEnemy } from "../../../Colyseus/Schema/Unit/Enemy";
import { ServerHero } from "../../../Colyseus/Schema/Unit/Hero";
import { UnitType } from "../../../Colyseus/Schema/GameState";

import { Vector2 } from "@/Colyseus/Schema/Unit/GameUnit";
import { ProjectileRegistry } from "@/Colyseus/Schema/Projectile";

/**
 * 子彈系統 - 負責子彈的創建、更新和碰撞檢測
 */
export class BulletSystem {
    private gameRoom: GameRoom;
    private get bullets() {
        return this.gameRoom.state.gameCore.bullets;
    }

    // 🆕 記錄子彈上一幀位置 (用於連續碰撞檢測)
    private lastBulletPositions: Map<string, Vector2> = new Map();

    // 🎯 批量廣播緩存 - 減少廣播頻率
    private pendingBroadcasts: Array<{
        type: string;
        data: any;
    }> = [];

    constructor(gameRoom: GameRoom) {
        this.gameRoom = gameRoom;
    }

    /**
     * 創建並添加子彈到遊戲中
     */
    public spawnBullet(config: BulletCreateConfig): string {
        const bullet = BulletFactory.createBullet(config);
        this.bullets.set(bullet.id, bullet);

        // 記錄初始位置
        this.lastBulletPositions.set(bullet.id, new Vector2(
            config.startPosition.x,
            config.startPosition.y
        ));

        return bullet.id;
    }

    /**
     * 批量創建子彈
     */
    public spawnMultipleBullets(configs: BulletCreateConfig[]): string[] {
        const bulletIds: string[] = [];

        for (const config of configs) {
            const bulletId = this.spawnBullet(config);
            bulletIds.push(bulletId);
        }

        return bulletIds;
    }


    /**
     * 更新所有子彈
     */
    public updateBullets(deltaTime: number): void {
        const bulletsToRemove: string[] = [];

        for (const [bulletId, bullet] of this.bullets) {
            // 先檢查碰撞,再檢查是否應該移除
            // 這樣可以確保子彈在最後一幀也能檢測到碰撞
            this.checkBulletCollisions(bullet);

            if (bullet.shouldDestroy()) {
                bulletsToRemove.push(bulletId);
            }
        }

        // 清理過期子彈
        if (bulletsToRemove.length > 0) {
            this.removeBullets(bulletsToRemove);
        }

        // 🎯 批量發送累積的廣播（減少網絡開銷）
        this.flushPendingBroadcasts();
    }

    /**
     * 移除子彈
     */
    public removeBullets(bulletIds: string[]): void {
        for (const bulletId of bulletIds) {
            this.bullets.delete(bulletId);
            this.lastBulletPositions.delete(bulletId); // 清理位置記錄
        }
    }

    /**
     * 檢查子彈碰撞 - 使用多點採樣連續碰撞檢測
     * 
     * 🎯 解決高速投射物穿透問題:
     * - 在子彈路徑上採樣多個點
     * - 檢查每個點是否與敵人碰撞
     * - 簡單可靠,不易出錯
     */
    private checkBulletCollisions(bullet: ServerBullet): void {
        const currentPos = bullet.getCurrentPosition();
        const lastPos = this.lastBulletPositions.get(bullet.id);

        // 檢查與敵人的碰撞
        for (const [enemyId, unit] of this.gameRoom.state.gameCore.allUnits) {
            if (unit.type !== UnitType.enemy || unit.isDead) continue;

            const enemy = unit as ServerEnemy;

            // 使用多點採樣檢測
            let isHit = false;

            if (!lastPos) {
                // 第一幀,只檢測當前位置
                isHit = this.checkPointCollision(currentPos, enemy);
            } else {
                // 檢測路徑上的多個點
                isHit = this.checkPathCollision(lastPos, currentPos, enemy);
            }

            if (isHit) {
                this.handleBulletHit(bullet, enemy);

                // 檢查子彈是否應該繼續存在
                if (bullet.shouldDestroy()) {
                    break;
                }
            }
        }

        // 更新上一幀位置
        this.lastBulletPositions.set(bullet.id, new Vector2(currentPos.x, currentPos.y));
    }    /**
     * 🆕 檢測單點是否與敵人碰撞
     * 
     * @param point 檢測點位置
     * @param enemy 敵人實例
     * @returns 是否碰撞
     */
    private checkPointCollision(point: Vector2, enemy: ServerEnemy): boolean {
        // 增大子彈碰撞半徑,提高命中率
        const bulletRadius = 25;

        const enemyWidth = enemy.collisionWidth * (enemy.scale || 1);
        const enemyHeight = enemy.collisionHeight * (enemy.scale || 1);

        // 計算擴展後的碰撞框
        const halfWidth = (enemyWidth + bulletRadius * 2) / 2;
        const halfHeight = (enemyHeight + bulletRadius * 2) / 2;

        // 計算距離
        const distX = Math.abs(point.x - enemy.position.x);
        const distY = Math.abs(point.y - enemy.position.y);

        return distX <= halfWidth && distY <= halfHeight;
    }

    /**
     * 🆕 檢測路徑是否與敵人碰撞 - 多點採樣法
     * 
     * 在路徑上採樣多個點,檢查是否有任何點與敵人碰撞
     * 這比線段相交算法更簡單可靠
     * 
     * @param startPos 起點位置
     * @param endPos 終點位置
     * @param enemy 敵人實例
     * @returns 是否碰撞
     */
    private checkPathCollision(
        startPos: Vector2,
        endPos: Vector2,
        enemy: ServerEnemy
    ): boolean {
        // 計算路徑長度
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 根據距離決定採樣點數量
        // 每 10 像素採樣一個點,至少 3 個點 (起點、中點、終點)
        const samples = Math.max(3, Math.ceil(distance / 10));

        // 🐛 調試日誌
        // console.log(`🔍 路徑檢測: 距離=${distance.toFixed(1)} 採樣點=${samples}`);

        // 在路徑上採樣多個點
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const samplePoint = new Vector2(
                startPos.x + dx * t,
                startPos.y + dy * t
            );

            if (this.checkPointCollision(samplePoint, enemy)) {
                return true;
            }
        }

        return false;
    }    /**
     * 處理子彈命中 - 使用新的投射物系統
     */
    private handleBulletHit(bullet: ServerBullet, enemy: ServerEnemy): void {
        const owner = this.gameRoom.state.gameCore.allUnits.get(bullet.ownerId);
        if (!owner) {
            console.warn(`⚠️ 找不到子彈擁有者: ${bullet.ownerId}`);
            return;
        }

        // 使用投射物系統處理命中（單例模式）
        const projectile = ProjectileRegistry.getRegisteredClasse(bullet.bulletType);

        // 投射物處理命中邏輯，返回標準的 AttackResult
        const attackResult = projectile.onHit(bullet, enemy, this.gameRoom);

        if (attackResult.success) {
            // 🎯 優化：將廣播加入批次隊列，而不是立即發送
            this.queueBroadcast('projectile_attack', {
                projectileId: bullet.id,
                attackResult: attackResult,
                timestamp: Date.now()
            });

            // 對所有受影響的目標造成傷害
            for (const targetId of attackResult.targetIds || []) {
                const target = this.gameRoom.state.gameCore.allUnits.get(targetId);
                if (!target) {
                    console.warn(`⚠️ 找不到目標單位: ${targetId}`);
                    continue;
                }

                if (target.isDead) continue;

                const damageResult = this.gameRoom.damageSystem.dealDamageToTarget({
                    attacker: owner,
                    target: target,
                    baseDamage: attackResult.baseDamage,
                    damageType: 'physical',
                    source: `projectile_${bullet.bulletType}`,
                    position: bullet.getCurrentPosition()
                });

                // 投射物命中時應用狀態效果
                if (bullet.statusEffects && bullet.statusEffects.length > 0) {
                    this.gameRoom.combatSystem.applyStatusEffects(
                        target,
                        bullet.statusEffects,
                        bullet.getCurrentPosition()
                    );
                }

                if (damageResult.targetKilled) {
                    this.handleEnemyKilled(bullet, target as ServerEnemy, targetId);
                }
            }
        }

    }

    /**
     * 處理敵人被擊殺
     */
    private handleEnemyKilled(bullet: ServerBullet, enemy: ServerEnemy, enemyId: string): void {
        const owner = this.gameRoom.state.gameCore.allUnits.get(bullet.ownerId);

        if (owner && owner.type === UnitType.hero) {
            const hero = owner as ServerHero;
            const leveledUp = hero.addExperience(enemy.expReward);

            if (leveledUp) {
                this.gameRoom.messageHandler.sendBattleLog(
                    `${hero.name} 升級到 ${hero.level} 級！`,
                    'event'
                );
            }

            // 戰報
            this.gameRoom.broadcast('enemy_killed_by_bullet', {
                heroId: hero.id,
                heroName: hero.name,
                enemyId: enemyId,
                bulletId: bullet.id,
                experience: enemy.expReward,
                leveledUp: leveledUp,
                newLevel: hero.level,
                timestamp: Date.now()
            });
        }

        this.gameRoom.state.gameCore.allUnits.delete(enemyId);
    }

    /**
     * 清理系統
     */
    public cleanup(): void {
        // 移除所有子彈
        const allBulletIds = Array.from(this.bullets.keys());
        this.removeBullets(allBulletIds);

        // 🆕 清理位置記錄
        this.lastBulletPositions.clear();

        // 清理待發送廣播
        this.pendingBroadcasts = [];
    }

    /**
     * 🎯 將廣播加入隊列（批量發送優化）
     */
    private queueBroadcast(type: string, data: any): void {
        this.pendingBroadcasts.push({ type, data });
    }

    /**
     * 🎯 批量發送累積的廣播（減少網絡開銷）
     */
    private flushPendingBroadcasts(): void {
        if (this.pendingBroadcasts.length === 0) return;

        // 按類型分組廣播
        const groupedBroadcasts = new Map<string, any[]>();

        for (const broadcast of this.pendingBroadcasts) {
            if (!groupedBroadcasts.has(broadcast.type)) {
                groupedBroadcasts.set(broadcast.type, []);
            }
            groupedBroadcasts.get(broadcast.type)!.push(broadcast.data);
        }

        // 批量發送（合併相同類型的廣播）
        for (const [type, dataList] of groupedBroadcasts) {
            if (dataList.length === 1) {
                // 只有一個廣播，直接發送
                this.gameRoom.broadcast(type, dataList[0]);
            } else {
                // 多個廣播，批量發送
                this.gameRoom.broadcast(`${type}_batch`, {
                    events: dataList,
                    count: dataList.length
                });
            }
        }

        // 清空隊列
        this.pendingBroadcasts = [];
    }

    /**
     * 獲取子彈數量統計
     */
    public getBulletStats(): { total: number, byType: Record<string, number> } {
        const stats = { total: 0, byType: {} as Record<string, number> };

        for (const [, bullet] of this.bullets) {
            stats.total++;
            const type = bullet.bulletType || 'unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        }

        return stats;
    }
}
