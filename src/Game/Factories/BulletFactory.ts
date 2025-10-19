import { ServerBullet } from "../../Colyseus/Schema/Bullet";
import { Vector2 } from "../../Colyseus/Schema/Unit/GameUnit";
import { BulletCreateConfig } from "@/Types";
import { UniqueIdGenerator } from "../../Util/UniqueIdGenerator";

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
     * 
     * 🆕 優雅的屬性擴展方案：
     * - 使用 bullet.applyExtendedConfig() 自動處理所有可選屬性
     * - 新增屬性時只需在 BulletCreateConfig 和 ServerBullet.applyExtendedConfig 中定義
     * - 避免在這裡為每個屬性添加 if 判斷
     */
    public static createBullet(config: BulletCreateConfig): ServerBullet {
        const bullet = new ServerBullet();
        const bulletId = UniqueIdGenerator.generateBulletId();

        // 計算最大距離
        let maxDistance = config.maxDistance;

        // 初始化基礎屬性
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

        // ✨ 優雅方案：自動處理所有擴展屬性
        bullet.applyExtendedConfig(config);

        return bullet;
    }
}
