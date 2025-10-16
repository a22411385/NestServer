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

    // onHit 使用基類的虛擬實現，無需覆寫

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