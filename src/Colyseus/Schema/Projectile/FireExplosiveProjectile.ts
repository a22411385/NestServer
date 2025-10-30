import { ExplosiveProjectile } from './ExplosiveProjectile';
import { ServerBullet } from '../Bullet';
import { ServerGameUnit } from '../Unit/GameUnit';
import { ExplosionVisualEffect, VisualEffect } from '@/Types';

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
        const fireExplosionEffect: VisualEffect = {
            type: 'explosion',
            position: { x: currentPos.x, y: currentPos.y },
            direction: { x: bullet.directionX, y: bullet.directionY },
            data: {
                radius: bullet.areaOfEffect,
                colors: [0xff4500, 0xff6600, 0xffaa00, 0xffff00], // 火焰漸層色
                duration: 500,
                hasShockwave: true,
            },

        } as ExplosionVisualEffect;

        return [fireExplosionEffect];
    }

    // TODO: 實現燃燒效果
    // 可以在 onHit 中添加，或等待狀態效果系統完成後整合
}
