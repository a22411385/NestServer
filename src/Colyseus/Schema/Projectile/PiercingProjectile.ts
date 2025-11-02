import { ProjectileBasic } from './ProjectileBasic';
import { ServerGameUnit } from '../Unit/GameUnit';
import { ServerBullet } from '../Bullet';
import { GameRoom } from '../../Rooms/GameRoom';

/**
 * 穿透投射物 - 可以穿透多個敵人
 * 使用單例模式
 */
export class PiercingProjectile extends ProjectileBasic {
    private static instance: PiercingProjectile;

    private constructor() {
        super();
    }

    /**
     * 獲取單例實例
     */
    public static getInstance(): PiercingProjectile {
        if (!PiercingProjectile.instance) {
            PiercingProjectile.instance = new PiercingProjectile();
        }
        return PiercingProjectile.instance;
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
