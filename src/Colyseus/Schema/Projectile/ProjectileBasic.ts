import { ServerGameUnit } from "../Unit/GameUnit";
import { AttackResult, AttackFailReason } from "../../../Types";
import { ServerBullet } from "../Bullet";
import { GameRoom } from "../../Rooms/GameRoom";

/**
 * 投射物基礎類 - 類似武器系統的架構
 * 負責投射物命中時的邏輯處理，返回標準的 AttackResult
 */
export abstract class ProjectileBasic {
    public projectileType: string = "";
    public weaponId: string = "";
    public baseDamage: number = 0;
    public enabled: boolean = true;

    // 投射物特有屬性
    public pierceCount: number = 1;
    public areaOfEffect: number = 0; // 0表示無AOE
    public bounceCount: number = 0;

    constructor() {
        // 無參數構造函數
    }

    /**
     * 初始化投射物配置
     */
    public initialize(projectileType: string, weaponId: string, baseDamage: number): void {
        this.projectileType = projectileType;
        this.weaponId = weaponId;
        this.baseDamage = baseDamage;
        this.applyProjectileConfig();
    }

    /**
     * 應用投射物特定配置
     */
    protected abstract applyProjectileConfig(): void;

    /**
     * 投射物命中處理 - 返回標準 AttackResult
     * @param bullet 命中的子彈實例
     * @param hitTarget 直接命中的目標
     * @param gameRoom 遊戲房間
     * @returns AttackResult 統一的攻擊結果
     */
    public abstract onHit(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom
    ): AttackResult;

    /**
     * 尋找受影響的目標
     */
    protected abstract findAffectedTargets(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom
    ): ServerGameUnit[];

    /**
     * 檢查投射物是否應該繼續存在
     */
    public abstract shouldContinueAfterHit(bullet: ServerBullet): boolean;

    /**
     * 通用的範圍搜索輔助方法
     */
    protected findTargetsInRadius(
        centerPosition: { x: number, y: number },
        radius: number,
        gameRoom: GameRoom,
        excludeTarget?: ServerGameUnit
    ): ServerGameUnit[] {
        const targets: ServerGameUnit[] = [];

        for (const [, unit] of gameRoom.state.gameCore.allUnits) {
            if (unit.isDead || unit === excludeTarget) continue;
            if (unit.type !== 1) continue; // 1 = UnitType.enemy

            const distance = Math.hypot(
                unit.position.x - centerPosition.x,
                unit.position.y - centerPosition.y
            );

            if (distance <= radius) {
                targets.push(unit);
            }
        }

        return targets;
    }

    /**
     * 創建視覺效果數據
     */
    protected createVisualEffects(
        bullet: ServerBullet,
        effectType: string,
        additionalData?: any
    ): any[] {
        const currentPos = bullet.getCurrentPosition();

        return [{
            type: effectType,
            eventType: `projectile_${effectType}`,
            position: { x: currentPos.x, y: currentPos.y },
            direction: { x: bullet.direction.x, y: bullet.direction.y },
            data: {
                projectileType: this.projectileType,
                weaponId: this.weaponId,
                ...additionalData
            }
        }];
    }
}