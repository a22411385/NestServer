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

    /**
     * 覆寫傷害計算 - 爆炸傷害降低
     */
    protected calculateDamage(bullet: ServerBullet, hitTarget: ServerGameUnit): number {
        return Math.floor(this.baseDamage * 0.8); // 爆炸傷害稍微降低
    }

    /**
     * 覆寫視覺效果 - 爆炸效果
     */
    protected createDefaultVisualEffects(
        bullet: ServerBullet,
        affectedTargets: ServerGameUnit[]
    ): any[] {
        return this.createVisualEffects(bullet, 'explosion', {
            radius: this.areaOfEffect,
            targets: affectedTargets.length
        });
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