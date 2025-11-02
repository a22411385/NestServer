import { ExplosiveProjectile } from './ExplosiveProjectile';
import { ServerBullet } from '../Bullet';
import { ServerGameUnit } from '../Unit/GameUnit';

/**
 * 🔥 火屬性爆炸投射物
 */
export class FireExplosiveProjectile extends ExplosiveProjectile {
    private static fireInstance: FireExplosiveProjectile;

    /**
     * 私有構造函數
     */
    private constructor() {
        super();
    }

    /**
     * 獲取單例實例
     */
    public static getInstance(): FireExplosiveProjectile {
        if (!FireExplosiveProjectile.fireInstance) {
            FireExplosiveProjectile.fireInstance = new FireExplosiveProjectile();
        }
        return FireExplosiveProjectile.fireInstance;
    }

    /**
     * 🆕 覆寫傷害倍率 - 火屬性爆炸傷害不減少
     */
    protected getDamageMultiplier(): number {
        return 1.0; // 火焰爆炸傷害 100%（不像普通爆炸是 80%）
    }

    // TODO: 實現燃燒效果
    // 可以在 onHit 中添加，或等待狀態效果系統完成後整合
}
