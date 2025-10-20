import { ProjectileBasic } from './ProjectileBasic';
import { ServerGameUnit } from '../Unit/GameUnit';
import { ExplosionVisualEffect, HitVisualEffect, VisualEffect } from '../../../Types';
import { ServerBullet } from '../Bullet';
import { GameRoom } from '../../Rooms/GameRoom';

/**
 * 穿透投射物 - 可以穿透多個敵人
 * 使用單例模式
 */
export class PiercingProjectile extends ProjectileBasic {
    private static instance: PiercingProjectile;

    public static getInstance(): PiercingProjectile {
        if (!PiercingProjectile.instance) {
            PiercingProjectile.instance = new PiercingProjectile();
        }
        return PiercingProjectile.instance;
    }

    private constructor() {
        super();
    }

    protected applyProjectileConfig(): void {
        this.initialPierceCount = 3; // 可以穿透3個敵人
        this.areaOfEffect = 0;
        this.bounceCount = 0;
    }

    /**
     * 覆寫視覺效果 - 穿透命中效果
     *
     * 📡 廣播事件：hit_effect
     */
    protected createVisualEffects(
        bullet: ServerBullet,
        affectedTargets: ServerGameUnit[],
    ): VisualEffect[] {
        const currentPos = bullet.getCurrentPosition();

        const hitEffect: VisualEffect = {
            type: 'hit',
            position: { x: currentPos.x, y: currentPos.y },
            direction: { x: bullet.direction.x, y: bullet.direction.y },
            data: {
                damage: bullet.damage, // ← 從 bullet 獲取
                isPierce: true,
                isCritical: false,
            },
        } as HitVisualEffect;

        return [hitEffect];
    }

    protected findAffectedTargets(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom,
    ): ServerGameUnit[] {
        // 穿透投射物只影響直接命中的目標
        return [hitTarget];
    }
}
