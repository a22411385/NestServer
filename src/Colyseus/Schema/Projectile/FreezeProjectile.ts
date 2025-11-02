import { ProjectileBasic } from './ProjectileBasic';
import { ServerGameUnit } from '../Unit/GameUnit';
import { AttackResult } from '../../../Types';
import { ServerBullet } from '../Bullet';
import { GameRoom } from '../../Rooms/GameRoom';

/**
 * 冰凍投射物 - 命中後造成冰凍效果
 * 使用單例模式
 */
export class FreezeProjectile extends ProjectileBasic {
    private static instance: FreezeProjectile;

    private constructor() {
        super();
    }

    /**
     * 獲取單例實例
     */
    public static getInstance(): FreezeProjectile {
        if (!FreezeProjectile.instance) {
            FreezeProjectile.instance = new FreezeProjectile();
        }
        return FreezeProjectile.instance;
    }

    /**
     * 覆寫 onHit 以在基類邏輯後應用冰凍效果
     */
    public onHit(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom,
    ): AttackResult {
        // 先執行基類的通用邏輯（檢查擁有者、碰撞範圍等）
        const result = super.onHit(bullet, hitTarget, gameRoom);

        // 如果攻擊成功，應用冰凍效果
        if (result.success) {
            this.applyFreezeEffect(hitTarget, bullet);
        }

        return result;
    }

    protected findAffectedTargets(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom,
    ): ServerGameUnit[] {
        // 冰凍投射物只影響直接命中的目標
        return [hitTarget];
    }
    /**
     * 🆕 獲取冰凍持續時間（使用屬性ID）
     */
    private getFreezeDuration(bullet: ServerBullet): number {
        let duration = 2000; // 預設 2000 毫秒
        const freezeProp = bullet.properties['freeze'];
        if (freezeProp) {
            // PropertyValue.duration 已經是毫秒
            duration = freezeProp.duration || 2000;
        }
        return duration;
    }
    /**
     * 應用冰凍效果
     */
    private applyFreezeEffect(target: ServerGameUnit, bullet: ServerBullet): void {
        // TODO: 實現完整的狀態效果系統
        // 暫時直接降低移動速度
        //console.log(`❄️ ${target.name} 被冰凍，持續 ${bullet.freezeDuration}ms`);

        const originalVx = target.vx;
        const originalVy = target.vy;
        const freezeDuration = this.getFreezeDuration(bullet);

        target.vx *= 0.1;
        target.vy *= 0.1;

        // 設置定時器恢復正常移動
        setTimeout(() => {
            if (!target.isDead) {
                target.vx = originalVx;
                target.vy = originalVy;
                console.log(`❄️ ${target.name} 冰凍效果結束`);
            }
        }, freezeDuration);
    }
}
