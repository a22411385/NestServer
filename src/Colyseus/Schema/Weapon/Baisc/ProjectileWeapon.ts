import { WeaponBasic } from "./WeaponBasic";
import { AttackResult, AttackFailReason, VisualEffect } from "@/Types";
import { ServerGameUnit } from "../../Unit/GameUnit";
import { WeaponType } from "@/Types";

/**
 * 投射武器類
 * 特點：遠程攻擊、有投射物、可能有穿透效果
 * 移除 Schema 導入，ProjectileWeapon 現在是純邏輯層類
 * 🆕 支持配置驅動的初始化
 */
export class ProjectileWeapon extends WeaponBasic {
    projectileSpeed: number = 0; // 投射物速度
    pierceCount: number = 0; // 穿透次數
    areaOfEffect: number = 0; // 範圍效果 (0表示無AOE)
    accuracy: number = 1.0; // 命中精度 (0-1)

    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 實現基類的配置應用方法
     */
    protected applyWeaponSpecificConfig(): void {
        // 投射武器的通用配置邏輯
        console.log(`🏹 投射武器配置已應用: ${this.name}`);

        // 設置投射武器的預設值
        this.projectileSpeed = 300; // 預設投射物速度
        this.pierceCount = 0;       // 預設無穿透
        this.areaOfEffect = 0;      // 預設無範圍效果
        this.accuracy = 1.0;        // 預設100%命中

        // 子類可以覆寫此方法來應用特定配置
        this.applyProjectileSpecificConfig();
    }

    /**
     * 🆕 子類可覆寫的投射武器特定配置方法
     */
    protected applyProjectileSpecificConfig(): void {
        // 預設實現，子類可覆寫
    }

    public tryAttack(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): AttackResult {
        // 檢查武器冷卻時間
        if (!this.canAttack()) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.ON_COOLDOWN
            };
        }

        // 選擇主要攻擊目標（距離最近的敵人）
        const primaryTarget = this.selectPrimaryTarget(attacker, potentialTargets);

        if (!primaryTarget) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.NO_TARGET
            };
        }

        // 更新最後攻擊時間
        this.updateLastAttackTime();

        // 計算射擊方向（朝向主要目標）
        const shootDirection = this.calculateShootDirection(attacker, primaryTarget);

        // 計算可能受影響的目標（包含穿透和AOE邏輯）
        const affectedTargets = this.calculateAffectedTargets(
            attacker,
            potentialTargets,
            primaryTarget,
            shootDirection
        );

        return {
            success: true,
            weaponId: this.weaponId,
            targetIds: affectedTargets.map(target => target.id),
            baseDamage: this.baseDamage,
            attackData: {
                position: { x: attacker.position.x, y: attacker.position.y },
                direction: shootDirection,
                range: this.attackRange,
                targetPosition: { x: primaryTarget.position.x, y: primaryTarget.position.y }
            },
            visualEffects: this.createProjectileVisualEffects(attacker, primaryTarget, shootDirection)
        };
    }

    /**
     * 選擇主要攻擊目標（距離最近的敵人）
     */
    protected selectPrimaryTarget(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): ServerGameUnit | null {
        const targetsInRange = this.findTargetsInRange(attacker, potentialTargets, this.attackRange, 1);
        return targetsInRange.length > 0 ? targetsInRange[0] : null;
    }

    /**
     * 計算射擊方向（朝向目標）
     */
    protected calculateShootDirection(
        attacker: ServerGameUnit,
        target: ServerGameUnit
    ): { x: number, y: number } {
        // 計算方向向量
        const dx = target.position.x - attacker.position.x;
        const dy = target.position.y - attacker.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            return { x: 1, y: 0 };
        }

        // 歸一化方向向量，這裡可以加入精度偏差
        // TODO: 加入武器精度影響，低精度武器會有隨機偏差
        return {
            x: dx / distance,
            y: dy / distance
        };
    }

    /**
     * 計算受影響的目標（包含穿透和AOE邏輯）
     */
    protected calculateAffectedTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
        primaryTarget: ServerGameUnit,
        shootDirection: { x: number, y: number }
    ): ServerGameUnit[] {
        const affectedTargets: ServerGameUnit[] = [primaryTarget];

        // 穿透邏輯
        if (this.pierceCount > 0) {
            const pierceTargets = this.findPierceTargets(
                attacker,
                potentialTargets,
                primaryTarget,
                shootDirection,
                this.pierceCount
            );
            affectedTargets.push(...pierceTargets);
        }

        // AOE邏輯
        if (this.areaOfEffect > 0) {
            const aoeTargets = this.findAOETargets(
                potentialTargets,
                primaryTarget,
                this.areaOfEffect
            );
            // 避免重複添加
            aoeTargets.forEach(target => {
                if (!affectedTargets.includes(target)) {
                    affectedTargets.push(target);
                }
            });
        }

        return affectedTargets;
    }

    /**
     * 查找穿透目標
     */
    protected findPierceTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
        primaryTarget: ServerGameUnit,
        direction: { x: number, y: number },
        maxPierce: number
    ): ServerGameUnit[] {
        // 找出在射擊路徑上的敵人
        const pierceTargets: ServerGameUnit[] = [];

        for (const target of potentialTargets) {
            if (target === primaryTarget || pierceTargets.length >= maxPierce) continue;

            // 檢查目標是否在射擊路徑上
            if (this.isTargetOnShootPath(attacker, target, direction)) {
                pierceTargets.push(target);
            }
        }

        return pierceTargets;
    }

    /**
     * 查找AOE範圍內的目標
     */
    protected findAOETargets(
        potentialTargets: ServerGameUnit[],
        explosionCenter: ServerGameUnit,
        radius: number
    ): ServerGameUnit[] {
        return potentialTargets.filter(target => {
            if (target === explosionCenter) return false;

            const dx = target.position.x - explosionCenter.position.x;
            const dy = target.position.y - explosionCenter.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            return distance <= radius;
        });
    }

    /**
     * 檢查目標是否在射擊路徑上
     */
    protected isTargetOnShootPath(
        attacker: ServerGameUnit,
        target: ServerGameUnit,
        direction: { x: number, y: number }
    ): boolean {
        const targetVector = {
            x: target.position.x - attacker.position.x,
            y: target.position.y - attacker.position.y
        };

        const targetDistance = Math.sqrt(targetVector.x * targetVector.x + targetVector.y * targetVector.y);
        if (targetDistance === 0 || targetDistance > this.attackRange) return false;

        // 歸一化目標方向向量
        const targetDirection = {
            x: targetVector.x / targetDistance,
            y: targetVector.y / targetDistance
        };

        const dotProduct = direction.x * targetDirection.x + direction.y * targetDirection.y;
        const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

        // 允許誤差角度（約5度）
        return angle < (5 * Math.PI / 180);
    }

    /**
     * ??????????
     */
    protected createProjectileVisualEffects(
        attacker: ServerGameUnit,
        target: ServerGameUnit,
        direction: { x: number, y: number }
    ): VisualEffect[] {
        return [{
            type: 'projectile', // 🔧 使用正確的視覺效果類型
            eventType: 'projectile_fire',
            position: { x: attacker.position.x, y: attacker.position.y },
            direction: direction,
            data: {
                weaponType: this.weaponId,
                weaponId: this.weaponId, // 🔧 添加武器ID
                targetPosition: { x: target.position.x, y: target.position.y },
                startPosition: { x: attacker.position.x, y: attacker.position.y }, // 🔧 添加起始位置
                speed: this.projectileSpeed,
                damage: this.baseDamage, // 🔧 添加傷害數值
                range: this.attackRange,
                pierceCount: this.pierceCount,
                aoeRadius: this.areaOfEffect,
                bulletType: this.pierceCount > 0 ? 'piercing' : 'basic', // 🔧 添加子彈類型
                lifeTime: (this.attackRange / this.projectileSpeed) * 1000 // 🔧 根據射程和速度計算生存時間
            }
        }];
    }

    // Getter ??
    public get speed(): number { return this.projectileSpeed; }
    public get pierce(): number { return this.pierceCount; }
    public get aoe(): number { return this.areaOfEffect; }
    public get hitAccuracy(): number { return this.accuracy; }

    /**
     * 投射武器找到有效目標 - 最近的敵人優先
     */
    protected findValidTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): ServerGameUnit[] {
        // 投射武器只瞄準最近的一個敵人，創建投射物去攻擊
        const targetsInRange = this.findTargetsInRange(attacker, potentialTargets, this.attackRange, 1);
        return targetsInRange;
    }
}
