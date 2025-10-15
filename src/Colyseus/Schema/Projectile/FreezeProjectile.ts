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

    public onHit(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom
    ): AttackResult {
        const owner = gameRoom.state.gameCore.allUnits.get(bullet.ownerId);
        if (!owner) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.NO_TARGET
            };
        }

        const affectedTargets = this.findAffectedTargets(bullet, hitTarget, gameRoom);

        // 應用冰凍效果
        this.applyFreezeEffect(hitTarget);

        return {
            success: true,
            weaponId: this.weaponId,
            targetIds: affectedTargets.map(target => target.id),
            baseDamage: this.baseDamage,
            attackData: {
                position: bullet.getCurrentPosition(),
                direction: { x: bullet.direction.x, y: bullet.direction.y },
                range: 0
            },
            visualEffects: this.createVisualEffects(bullet, 'freeze', {
                duration: this.freezeDuration,
                targetId: hitTarget.id
            })
        };
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