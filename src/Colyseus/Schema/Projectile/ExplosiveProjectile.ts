import { ProjectileBasic } from './ProjectileBasic';
import { ServerGameUnit } from '../Unit/GameUnit';
import { ServerBullet } from '../Bullet';
import { GameRoom } from '../../Rooms/GameRoom';

/**
 * 爆炸投射物 - 命中後產生範圍爆炸效果
 * 使用單例模式
 */
export class ExplosiveProjectile extends ProjectileBasic {
    private static instance: ExplosiveProjectile;

    /**
     * 受保護的構造函數 - 允許子類別繼承
     */
    protected constructor() {
        super();
    }

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
     * 🆕 覆寫傷害倍率 - 爆炸傷害降低 20%
     */
    protected getDamageMultiplier(): number {
        return 0.8; // 爆炸傷害降低 20%
    }

    protected findAffectedTargets(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom,
        owner: ServerGameUnit,
    ): ServerGameUnit[] {
        const explosionCenter = bullet.getCurrentPosition();
        const aoeRadius = bullet.areaOfEffect;
        const targets = this.findTargetsInRadius(
            explosionCenter,
            aoeRadius,
            gameRoom,
            owner
        );
        // 確保直接命中的目標也在列表中
        if (!targets.includes(hitTarget)) {
            targets.unshift(hitTarget);
        }

        //console.log(`💥 [ExplosiveProjectile] 最終受影響目標數: ${targets.length}`);
        return targets;
    }
}
