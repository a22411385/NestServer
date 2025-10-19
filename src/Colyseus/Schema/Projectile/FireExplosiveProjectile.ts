import { ExplosiveProjectile } from './ExplosiveProjectile';
import { ServerBullet } from '../Bullet';
import { ServerGameUnit } from '../Unit/GameUnit';
import { VisualEffect } from '@/Types';

/**
 * 🆕 範例：火屬性爆炸投射物
 * 使用單例模式
 *
 * 展示另一種擴充方式：
 * 1. 繼承 ExplosiveProjectile
 * 2. 修改傷害計算（火焰傷害加成）
 * 3. 添加燃燒持續傷害效果
 */
export class FireExplosiveProjectile extends ExplosiveProjectile {
    private static fireInstance: FireExplosiveProjectile;

    private readonly burnDuration: number = 3000; // 3秒燃燒
    private readonly burnDamagePerSecond: number = 8;

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
     * 私有構造函數
     */
    private constructor() {
        super();
    }

    protected applyProjectileConfig(): void {
        super.applyProjectileConfig();

        // 火屬性爆炸範圍更大
        this.areaOfEffect = 100; // 比普通爆炸大

        console.log(
            `🔥 火屬性爆炸投射物配置: AOE ${this.areaOfEffect}, 燃燒 ${this.burnDuration}ms`,
        );
    }

    /**
     * 覆寫傷害計算 - 火屬性有額外傷害
     */
    protected calculateDamage(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
    ): number {
        // 火焰爆炸傷害為基礎傷害的 100%（不像普通爆炸是 80%）
        return bullet.damage;  // ← 從 bullet 獲取
    }

    /**
     * 覆寫視覺效果（火焰爆炸特效）
     *
     * 📡 廣播事件：explosion_effect
     * 客戶端可根據顏色判斷是火屬性爆炸
     */
    protected createVisualEffects(
        bullet: ServerBullet,
        affectedTargets: ServerGameUnit[],
    ): VisualEffect[] {
        const currentPos = bullet.getCurrentPosition();

        // 🔧 使用 bullet.areaOfEffect 以支持武器動態調整
        const explosionRadius = bullet.areaOfEffect || this.areaOfEffect;

        const fireExplosionEffect: VisualEffect = {
            type: 'explosion',
            position: { x: currentPos.x, y: currentPos.y },
            direction: { x: bullet.direction.x, y: bullet.direction.y },
            data: {
                radius: explosionRadius,
                colors: [0xff4500, 0xff6600, 0xffaa00, 0xffff00], // 火焰漸層色
                duration: 500,
                hasShockwave: true,
            },
        };

        return [fireExplosionEffect];
    }

    // TODO: 實現燃燒效果
    // 可以在 onHit 中添加，或等待狀態效果系統完成後整合
}
