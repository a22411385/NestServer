import { ProjectileBasic } from "./ProjectileBasic";
import { ServerGameUnit } from "../Unit/GameUnit";
import { AttackResult, AttackFailReason } from "../../../Types";
import { ServerBullet } from "../Bullet";
import { GameRoom } from "../../Rooms/GameRoom";

/**
 * 基礎投射物 - 單體攻擊，命中後消失
 */
export class BasicProjectile extends ProjectileBasic {
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

        return {
            success: true,
            weaponId: this.weaponId,
            targetIds: affectedTargets.map(target => target.id),
            baseDamage: this.baseDamage,
            attackData: {
                position: bullet.getCurrentPosition(),
                direction: { x: bullet.direction.x, y: bullet.direction.y },
                range: 0 // 投射物沒有範圍概念
            },
            visualEffects: this.createVisualEffects(bullet, 'hit')
        };
    }

    protected findAffectedTargets(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom
    ): ServerGameUnit[] {
        // 基礎投射物只影響直接命中的目標
        return [hitTarget];
    }

    public shouldContinueAfterHit(bullet: ServerBullet): boolean {
        // 基礎投射物命中後就消失
        return false;
    }
}