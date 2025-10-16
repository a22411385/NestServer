import { MapSchema } from "@colyseus/schema";
import { ServerBullet } from "../../Colyseus/Schema/Bullet";
import { BulletCreateConfig, WeaponBulletConfig } from "@/Types";
import { BulletFactory } from "../Factories/BulletFactory";
import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { ServerEnemy } from "../../Colyseus/Schema/Unit/Enemy";
import { ServerHero } from "../../Colyseus/Schema/Unit/Hero";
import { UnitType } from "../../Colyseus/Schema/GameState";
import { BattleMathUtils } from "../../Util/BattleMathUtils";

import { Vector2 } from "@/Colyseus/Schema/Unit/GameUnit";
import { ProjectileFactory } from "../Factories/ProjectileFactory";

/**
 * 子彈系統 - 負責子彈的創建、更新和碰撞檢測
 */
export class BulletSystem {
    private gameRoom: GameRoom;
    private bullets: MapSchema<ServerBullet>;

    constructor(gameRoom: GameRoom) {
        this.gameRoom = gameRoom;
        this.bullets = gameRoom.state.gameCore.bullets;
    }

    /**
     * 創建並添加子彈到遊戲中
     */
    public spawnBullet(config: BulletCreateConfig): string {
        const bullet = BulletFactory.createBullet(config);
        this.bullets.set(bullet.id, bullet);

        console.log(`🚀 子彈創建: ${bullet.id} by ${config.ownerId} (${config.bulletClass})`);
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
            if (bullet.shouldDestroy()) {
                bulletsToRemove.push(bulletId);
                continue;
            }

            // 檢查碰撞
            this.checkBulletCollisions(bullet);
        }

        // 清理過期子彈
        this.removeBullets(bulletsToRemove);
    }

    /**
     * 移除子彈
     */
    public removeBullets(bulletIds: string[]): void {
        for (const bulletId of bulletIds) {
            this.bullets.delete(bulletId);
            console.log(`💥 子彈移除: ${bulletId}`);
        }
    }

    /**
     * 檢查子彈碰撞
     */
    private checkBulletCollisions(bullet: ServerBullet): void {
        const currentPos = bullet.getCurrentPosition();

        // 檢查與敵人的碰撞
        for (const [enemyId, unit] of this.gameRoom.state.gameCore.allUnits) {
            if (unit.type !== UnitType.enemy || unit.isDead) continue;

            const enemy = unit as ServerEnemy;

            if (this.isBulletHitEnemy(bullet, enemy, currentPos)) {
                this.handleBulletHit(bullet, enemy);

                // 檢查子彈是否應該繼續存在
                if (bullet.shouldDestroy()) {
                    break;
                }
            }
        }
    }

    /**
     * 檢查子彈是否命中敵人
     */
    private isBulletHitEnemy(bullet: ServerBullet, enemy: ServerEnemy, bulletPos: Vector2): boolean {
        const bulletWidth = 10;
        const bulletHeight = 10;
        const enemyWidth = enemy.collisionWidth * (enemy.scale || 1);
        const enemyHeight = enemy.collisionHeight * (enemy.scale || 1);

        return BattleMathUtils.isRectCollide(
            bulletPos.x, bulletPos.y, bulletWidth, bulletHeight,
            enemy.position.x, enemy.position.y, enemyWidth, enemyHeight
        );
    }

    /**
     * 處理子彈命中 - 使用新的投射物系統
     */
    private handleBulletHit(bullet: ServerBullet, enemy: ServerEnemy): void {
        const owner = this.gameRoom.state.gameCore.allUnits.get(bullet.ownerId);
        if (!owner) return;

        // 🆕 使用投射物系統處理命中
        const projectile = ProjectileFactory.getProjectile(
            bullet.bulletType,
            bullet.weaponId,
            bullet.damage
        );

        // 投射物處理命中邏輯，返回標準的 AttackResult
        const attackResult = projectile.onHit(bullet, enemy, this.gameRoom);

        if (attackResult.success) {
            // 廣播攻擊結果（與武器攻擊保持一致）
            this.gameRoom.broadcast('projectile_attack', {
                projectileId: bullet.id,
                attackResult: attackResult,
                timestamp: Date.now()
            });

            // 對所有受影響的目標造成傷害
            for (const targetId of attackResult.targetIds || []) {
                const target = this.gameRoom.state.gameCore.allUnits.get(targetId);
                if (target && !target.isDead) {
                    const damageResult = this.gameRoom.damageSystem.dealDamageToTarget({
                        attacker: owner,
                        target: target,
                        baseDamage: attackResult.baseDamage,
                        damageType: 'physical',
                        source: `projectile_${bullet.bulletType}`,
                        position: bullet.getCurrentPosition()
                    });

                    if (damageResult.targetKilled) {
                        this.handleEnemyKilled(bullet, target as ServerEnemy, targetId);
                    }
                }
            }
        }

        // 檢查投射物是否應該繼續存在
        if (!projectile.shouldContinueAfterHit(bullet)) {
            bullet.pierceCount = 0; // 標記為需要移除
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
