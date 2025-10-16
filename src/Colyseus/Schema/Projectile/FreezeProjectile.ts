import { ProjectileBasic } from "./ProjectileBasic";
import { ServerGameUnit } from "../Unit/GameUnit";
import { AttackResult, AttackFailReason } from "../../../Types";
import { ServerBullet } from "../Bullet";
import { GameRoom } from "../../Rooms/GameRoom";

/**
 * 冰凍投射物 - 命中後造成冰凍效果
 */
export class FreezeProjectile extends ProjectileBasic {
    private freezeDuration: number = 2000; // 2秒冰凍

    protected applyProjectileConfig(): void {
        this.pierceCount = 1;
        this.areaOfEffect = 0;
        this.bounceCount = 0;
    }

    /**
     * 覆寫 onHit 以在基類邏輯後應用冰凍效果
     */
    public onHit(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom
    ): AttackResult {
        // 先執行基類的通用邏輯（檢查擁有者、碰撞範圍等）
        const result = super.onHit(bullet, hitTarget, gameRoom);

        // 如果攻擊成功，應用冰凍效果
        if (result.success) {
            this.applyFreezeEffect(hitTarget);
        }

        return result;
    }

    /**
     * 覆寫視覺效果 - 冰凍效果
     */
    protected createDefaultVisualEffects(
        bullet: ServerBullet,
        affectedTargets: ServerGameUnit[]
    ): any[] {
        return this.createVisualEffects(bullet, 'freeze', {
            duration: this.freezeDuration,
            targetId: affectedTargets[0]?.id
        });
    }

    protected findAffectedTargets(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom
    ): ServerGameUnit[] {
        // 冰凍投射物只影響直接命中的目標
        return [hitTarget];
    }

    /**
     * 應用冰凍效果
     */
    private applyFreezeEffect(target: ServerGameUnit): void {
        // TODO: 實現完整的狀態效果系統
        // 暫時直接降低移動速度
        console.log(`❄️ ${target.name} 被冰凍，持續 ${this.freezeDuration}ms`);

        const originalVx = target.vx;
        const originalVy = target.vy;

        target.vx *= 0.1;
        target.vy *= 0.1;

        // 設置定時器恢復正常移動
        setTimeout(() => {
            if (!target.isDead) {
                target.vx = originalVx;
                target.vy = originalVy;
                console.log(`❄️ ${target.name} 冰凍效果結束`);
            }
        }, this.freezeDuration);
    }

    public shouldContinueAfterHit(bullet: ServerBullet): boolean {
        // 冰凍投射物命中後就消失
        return false;
    }
}