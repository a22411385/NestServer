import { ProjectileBasic } from './ProjectileBasic';
import { ServerGameUnit } from '../Unit/GameUnit';
import { VisualEffect } from '../../../Types';
import { ServerBullet } from '../Bullet';
import { GameRoom } from '../../Rooms/GameRoom';

/**
 * 爆炸投射物 - 命中後產生範圍爆炸效果
 * 使用單例模式
 */
export class ExplosiveProjectile extends ProjectileBasic {
    private static instance: ExplosiveProjectile;

    /**
     * 獲取單例實例
     */
    public static getInstance(): ExplosiveProjectile {
        if (!ExplosiveProjectile.instance) {
            ExplosiveProjectile.instance = new ExplosiveProjectile();
        }
        return ExplosiveProjectile.instance;
    }

    /**
     * 受保護的構造函數 - 允許子類別繼承
     */
    protected constructor() {
        super();
    }

    protected applyProjectileConfig(): void {
        // 使用 Object.assign 繞過 readonly 限制（僅在構造函數中）
        this.initialPierceCount = 1;
        this.areaOfEffect = 80; // 爆炸範圍
        this.bounceCount = 0;
    }

    /**
     * 覆寫傷害計算 - 爆炸傷害降低
     */
    protected calculateDamage(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
    ): number {
        return Math.floor(bullet.damage * 0.8); // 爆炸傷害稍微降低
    }

    /**
     * 覆寫視覺效果 - 爆炸效果
     *
     * 📡 廣播事件：explosion_effect
     */
    protected createVisualEffects(
        bullet: ServerBullet,
        affectedTargets: ServerGameUnit[],
    ): VisualEffect[] {
        const currentPos = bullet.getCurrentPosition();

        // 🔧 使用 bullet.areaOfEffect 以支持武器動態調整
        const explosionRadius = bullet.areaOfEffect || this.areaOfEffect;

        const explosionEffect: VisualEffect = {
            type: 'explosion',
            position: { x: currentPos.x, y: currentPos.y },
            direction: { x: bullet.direction.x, y: bullet.direction.y },
            data: {
                radius: explosionRadius,
                colors: [0xff4400, 0xffaa00, 0xffff88],
                duration: 400,
                hasShockwave: true,
            },
        };

        return [explosionEffect];
    }

    protected findAffectedTargets(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom,
        owner: ServerGameUnit,
    ): ServerGameUnit[] {
        const explosionCenter = bullet.getCurrentPosition();

        // 🔧 使用 bullet.areaOfEffect 而非 this.areaOfEffect
        // 這樣武器可以通過 getAmmoOverride() 動態調整爆炸範圍
        const explosionRadius = bullet.areaOfEffect || this.areaOfEffect;

        // 爆炸影響範圍內的所有敵人（包括直接命中的）
        const targets = this.findTargetsInRadius(
            explosionCenter,
            explosionRadius,
            gameRoom,
            owner

        );

        // 確保直接命中的目標也在列表中
        if (!targets.includes(hitTarget)) {
            targets.unshift(hitTarget);
        }

        return targets;
    }
}
