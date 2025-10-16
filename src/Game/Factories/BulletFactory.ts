import { ServerBullet } from "../../Colyseus/Schema/Bullet";
import { Vector2 } from "../../Colyseus/Schema/Unit/GameUnit";
import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { WeaponType, BulletCreateConfig, WeaponBulletConfig } from "@/Types";
import { UniqueIdGenerator } from "../../Util/UniqueIdGenerator";
import { rotateVector } from "@/Util/BattleMathUtils";

// 移除重複的interface和enum定義，已搬移到Types資料夾

/**
 * 子彈工廠類 - 負責創建 ServerBullet 實例
 * 
 * 🎯 職責分工：
 * - BulletFactory: 負責創建 ServerBullet 實例 (物理移動載體)
 * - ProjectileFactory: 負責創建投射物邏輯類 (命中效果處理)
 * 
 * 📝 注意：子彈的命中邏輯現在由 ProjectileFactory 處理
 */
export class BulletFactory {

    /**
     * 創建基礎子彈實例
     * 
     * 🎯 只負責創建 ServerBullet 的移動載體
     * 🔧 命中邏輯由 ProjectileFactory 處理
     */
    public static createBullet(config: BulletCreateConfig): ServerBullet {
        const bullet = new ServerBullet();
        const bulletId = UniqueIdGenerator.generateBulletId();

        // 計算最大距離
        let maxDistance = config.maxDistance;

        bullet.initialize(
            bulletId,
            config.ownerId,
            new Vector2(config.startPosition.x, config.startPosition.y),
            new Vector2(config.direction.x, config.direction.y),
            config.damage,
            config.speed || 300,
            config.bulletClass.toString(),
            config.weaponId || "",
            maxDistance
        );

        // 設置額外屬性
        if (config.pierceCount !== undefined) {
            bullet.pierceCount = config.pierceCount;
        }

        return bullet;
    }

    /**
     * 根據武器獲取投射物速度
     */
    private static getWeaponProjectileSpeed(weapon: WeaponBasic): number {
        // 根據武器類型返回不同的速度
        switch (weapon.weaponType) {
            case WeaponType.PROJECTILE_WEAPON: return 400;
            case WeaponType.MELEE_WEAPON: return 500; // 近戰武器如果有投射物效果
            case WeaponType.SUPPORT_WEAPON: return 250;
            default: return 300;
        }
    }

    /**
     * 根據武器獲取穿透次數
     */
    private static getWeaponPierceCount(weapon: WeaponBasic): number {
        // 可以根據武器屬性或升級等級來決定
        switch (weapon.weaponType) {
            case WeaponType.PROJECTILE_WEAPON: return 2;
            case WeaponType.SUPPORT_WEAPON: return 1;
            default: return 0;
        }
    }

    /**
     * 根據武器獲取爆炸範圍
     */
    private static getWeaponAreaOfEffect(weapon: WeaponBasic): number {
        switch (weapon.weaponType) {
            case WeaponType.SUPPORT_WEAPON: return 80;
            case WeaponType.PROJECTILE_WEAPON: return 0;
            default: return 0;
        }
    }

    /**
     * 根據武器獲取子彈存活時間
     */
    private static getWeaponBulletLifeTime(weapon: WeaponBasic): number {
        // 根據攻擊距離計算存活時間
        const baseLifeTime = (weapon.attackRange / this.getWeaponProjectileSpeed(weapon)) * 1000;
        return Math.max(baseLifeTime, 1000); // 最少1秒
    }

    /**
     * 根據武器獲取子彈縮放
     */
    private static getWeaponBulletScale(weapon: WeaponBasic): number {
        switch (weapon.weaponType) {
            case WeaponType.SUPPORT_WEAPON: return 1.5;
            case WeaponType.PROJECTILE_WEAPON: return 1.2;
            default: return 1.0;
        }
    }
}
