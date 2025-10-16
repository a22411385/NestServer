import { ServerGameUnit } from "../Unit/GameUnit";
import { AttackResult, AttackFailReason, VisualEffect, VisualEffectType } from "../../../Types";
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

    //碰撞範圍
    public collisionRadius: number = 5;

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
     * 投射物命中處理 - 虛擬方法，處理共同邏輯
     * @param bullet 命中的子彈實例
     * @param hitTarget 直接命中的目標
     * @param gameRoom 遊戲房間
     * @returns AttackResult 統一的攻擊結果
     */
    public onHit(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom
    ): AttackResult {
        // 1. 檢查子彈擁有者是否存在
        const owner = gameRoom.state.gameCore.allUnits.get(bullet.ownerId);
        if (!owner) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.NO_TARGET
            };
        }

        // 2. 檢查碰撞範圍（如果需要）
        if (!this.isWithinCollisionRange(bullet, hitTarget)) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.OUT_OF_RANGE
            };
        }

        // 3. 尋找受影響的目標（由子類實現）
        const affectedTargets = this.findAffectedTargets(bullet, hitTarget, gameRoom);

        // 4. 計算傷害（由子類決定傷害係數）
        const finalDamage = this.calculateDamage(bullet, hitTarget);

        // 5. 構建攻擊結果
        return this.buildAttackResult(bullet, affectedTargets, finalDamage);
    }

    /**
     * 檢查目標是否在碰撞範圍內
     */
    protected isWithinCollisionRange(bullet: ServerBullet, hitTarget: ServerGameUnit): boolean {
        const bulletPos = bullet.getCurrentPosition();
        const distance = Math.hypot(
            hitTarget.position.x - bulletPos.x,
            hitTarget.position.y - bulletPos.y
        );
        return distance <= this.collisionRadius;
    }

    /**
     * 計算最終傷害（子類可以覆寫以修改傷害）
     */
    protected calculateDamage(bullet: ServerBullet, hitTarget: ServerGameUnit): number {
        return this.baseDamage;
    }

    /**
     * 構建攻擊結果（子類可以覆寫以自定義結果）
     */
    protected buildAttackResult(
        bullet: ServerBullet,
        affectedTargets: ServerGameUnit[],
        damage: number
    ): AttackResult {
        return {
            success: true,
            weaponId: this.weaponId,
            targetIds: affectedTargets.map(target => target.id),
            baseDamage: damage,
            attackData: {
                position: bullet.getCurrentPosition(),
                direction: { x: bullet.direction.x, y: bullet.direction.y },
                range: this.areaOfEffect
            },
            visualEffects: this.createDefaultVisualEffects(bullet, affectedTargets)
        };
    }

    /**
     * 創建預設視覺效果（子類可以覆寫）
     */
    protected createDefaultVisualEffects(
        bullet: ServerBullet,
        affectedTargets: ServerGameUnit[]
    ): VisualEffect[] {
        return this.createVisualEffects(bullet, 'hit'); // 預設使用 'hit' 效果
    }

    /**
     * 尋找受影響的目標（子類必須實現）
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
        effectType: VisualEffectType,
        additionalData?: any
    ): VisualEffect[] {
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