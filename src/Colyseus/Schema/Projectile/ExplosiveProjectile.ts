import { ProjectileBasic } from "./ProjectileBasic";
import { ServerGameUnit } from "../Unit/GameUnit";
import { AttackResult, AttackFailReason } from "../../../Types";
import { ServerBullet } from "../Bullet";
import { GameRoom } from "../../Rooms/GameRoom";

/**
 * 爆炸投射物 - 命中後產生範圍爆炸效果
 */
export class ExplosiveProjectile extends ProjectileBasic {
    protected applyProjectileConfig(): void {
        this.pierceCount = 1;
        this.areaOfEffect = 80; // 爆炸範圍
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
            baseDamage: Math.floor(this.baseDamage * 0.8), // 爆炸傷害稍微降低
            attackData: {
                position: bullet.getCurrentPosition(),
                direction: { x: bullet.direction.x, y: bullet.direction.y },
                range: this.areaOfEffect
            },
            visualEffects: this.createVisualEffects(bullet, 'explosion', {
                radius: this.areaOfEffect,
                targets: affectedTargets.length
            })
        };
    }

    protected findAffectedTargets(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom
    ): ServerGameUnit[] {
        const explosionCenter = bullet.getCurrentPosition();

        // 爆炸影響範圍內的所有敵人（包括直接命中的）
        const targets = this.findTargetsInRadius(
            explosionCenter,
            this.areaOfEffect,
            gameRoom
        );

        // 確保直接命中的目標也在列表中
        if (!targets.includes(hitTarget)) {
            targets.unshift(hitTarget);
        }

        return targets;
    }

    public shouldContinueAfterHit(bullet: ServerBullet): boolean {
        // 爆炸投射物命中後就消失
        return false;
    }
}