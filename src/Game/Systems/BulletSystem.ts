import { MapSchema } from "@colyseus/schema";
import { ServerBullet } from "../../Colyseus/Schema/Bullet";
import { BulletCreateConfig, WeaponBulletConfig } from "@/Types";
import { BulletFactory } from "../Factories/BulletFactory";
import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { ServerEnemy } from "../../Colyseus/Schema/Unit/Enemy";
import { ServerHero } from "../../Colyseus/Schema/Unit/Hero";
import { UnitType } from "../../Colyseus/Schema/GameState";
import { BattleMathUtils } from "../../Util/BattleMathUtils";

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

        console.log(`🚀 子彈創建: ${bullet.id} by ${config.ownerId} (${config.bulletType})`);
        return bullet.id;
    }

    /**
     * 使用武器配置創建子彈
     */
    public spawnBulletFromWeapon(config: WeaponBulletConfig): string {
        const bullet = BulletFactory.createBulletFromWeapon(config);
        this.bullets.set(bullet.id, bullet);

        console.log(`🎯 武器子彈創建: ${bullet.id} 來自 ${config.weapon.weaponId}`);
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
     * 創建散彈
     */
    public spawnShotgunBullets(
        baseConfig: BulletCreateConfig,
        bulletCount: number = 3,
        spreadAngle: number = Math.PI / 6
    ): string[] {
        const bullets = BulletFactory.createShotgunBullets(baseConfig, bulletCount, spreadAngle);
        const bulletIds: string[] = [];

        for (const bullet of bullets) {
            this.bullets.set(bullet.id, bullet);
            bulletIds.push(bullet.id);
        }

        console.log(`🔫 散彈創建: ${bulletIds.length} 發子彈 by ${baseConfig.ownerId}`);
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
                this.handleBulletHit(bullet, enemy, enemyId);

                // 檢查子彈是否應該繼續存在
                if (!bullet.onHit()) {
                    bullet.hasHit = true;
                    break;
                }
            }
        }
    }

    /**
     * 檢查子彈是否命中敵人
     */
    private isBulletHitEnemy(bullet: ServerBullet, enemy: ServerEnemy, bulletPos: any): boolean {
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
     * 處理子彈命中
     */
    private handleBulletHit(bullet: ServerBullet, enemy: ServerEnemy, enemyId: string): void {
        // 使用傷害系統處理傷害
        const owner = this.gameRoom.state.gameCore.allUnits.get(bullet.ownerId);
        if (!owner) return;

        const damageResults = this.gameRoom.damageSystem.dealDamageToTarget({
            attacker: owner,
            target: enemy,
            baseDamage: bullet.damage,
            damageType: 'physical',
            source: `bullet_${bullet.bulletType}`,
            position: bullet.getCurrentPosition()
        });

        if (damageResults.targetKilled) {
            this.handleEnemyKilled(bullet, enemy, enemyId);
        }

        // 廣播子彈命中事件
        this.gameRoom.broadcast('bullet_hit', {
            bulletId: bullet.id,
            targetId: enemyId,
            damage: damageResults.actualDamage,
            killed: damageResults.targetKilled,
            position: bullet.getCurrentPosition(),
            timestamp: Date.now()
        });
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
