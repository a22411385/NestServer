import { ProjectileBasic } from "./ProjectileBasic";
import { ServerGameUnit } from "../Unit/GameUnit";
import { AttackResult, AttackFailReason } from "../../../Types";
import { ServerBullet } from "../Bullet";
import { GameRoom } from "../../Rooms/GameRoom";

/**
 * 穿透投射物 - 可以穿透多個敵人
 */
export class PiercingProjectile extends ProjectileBasic {
    protected applyProjectileConfig(): void {
        this.pierceCount = 3; // 可以穿透3個敵人
        this.areaOfEffect = 0;
        this.bounceCount = 0;
    }

    /**
     * 覆寫視覺效果 - 穿透效果
     */
    protected createDefaultVisualEffects(
        bullet: ServerBullet,
        affectedTargets: ServerGameUnit[]
    ): any[] {
        return this.createVisualEffects(bullet, 'hit', {
            remainingPierce: bullet.pierceCount - 1,
            isPierce: true
        });
    }

    protected findAffectedTargets(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom
    ): ServerGameUnit[] {
        // 穿透投射物只影響直接命中的目標
        return [hitTarget];
    }

    public shouldContinueAfterHit(bullet: ServerBullet): boolean {
        // 減少穿透次數
        bullet.pierceCount--;

        // 如果還有穿透次數，繼續存在
        return bullet.pierceCount > 0;
    }
}