import { WeaponBasic } from "./WeaponBasic";
import { AttackFailReason, VisualEffect, AttackResult } from "@/Types";
import { ServerGameUnit } from "../../Unit/GameUnit";
import { WeaponType } from "@/Types";

/**
 * 輔助武器抽象類
 * 特點：可以治療友軍、提供增益效果、範圍支援
 * 移除 Schema 導入，SupportWeapon 現在是純邏輯層類
 * 🆕 支持配置驅動的初始化
 */
export abstract class SupportWeapon extends WeaponBasic {
    healAmount: number = 0; // 治療量
    buffDuration: number = 0; // 增益持續時間
    supportRadius: number = 0; // 支援範圍
    canTargetSelf: boolean = true; // 是否可以對自己使用

    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 實現基類的配置應用方法
     */
    protected applyWeaponSpecificConfig(): void {
        // 輔助武器的通用配置邏輯
        console.log(`🛡️ 輔助武器配置已應用: ${this.name}`);
        
        // 設置輔助武器的預設值
        this.healAmount = 20;        // 預設治療量
        this.buffDuration = 5000;    // 預設增益持續時間 (5秒)
        this.supportRadius = 150;    // 預設支援範圍
        this.canTargetSelf = true;   // 預設可以對自己使用

        // 子類可以覆寫此方法來應用特定配置
        this.applySupportSpecificConfig();
    }

    /**
     * 🆕 子類可覆寫的輔助武器特定配置方法
     */
    protected applySupportSpecificConfig(): void {
        // 預設實現，子類可覆寫
    }

    public tryAttack(
        user: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): AttackResult {
        // 檢查冷卻時間
        if (!this.canAttack()) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.ON_COOLDOWN
            };
        }

        // 找到需要支援的目標
        const supportTargets = this.findSupportTargets(user, potentialTargets);

        if (supportTargets.length === 0) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.NO_TARGET
            };
        }

        // 更新攻擊時間
        this.updateLastAttackTime();

        return {
            success: true,
            weaponId: this.weaponId,
            targetIds: supportTargets.map(target => target.id),
            baseDamage: this.healAmount, // 對於支援武器，baseDamage 代表治療量
            attackData: {
                position: { x: user.position.x, y: user.position.y },
                direction: { x: 0, y: 0 }, // 支援武器通常沒有方向性
                range: this.attackRange,
                supportRadius: this.supportRadius
            },
            visualEffects: this.createSupportVisualEffects(user, supportTargets)
        };
    }

    /**
     * 尋找需要支援的目標
     * 預設邏輯：優先選擇血量最少的友軍
     */
    protected findSupportTargets(
        user: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): ServerGameUnit[] {
        const supportTargets: ServerGameUnit[] = [];

        // 檢查是否可以對自己使用
        if (this.canTargetSelf && this.needsSupport(user)) {
            supportTargets.push(user);
        }

        // 尋找範圍內需要支援的友軍
        for (const target of potentialTargets) {
            if (target === user && !this.canTargetSelf) continue;
            if (!this.isSupportTarget(user, target)) continue;
            if (!this.isInRange(user, target)) continue;
            if (!this.needsSupport(target)) continue;

            supportTargets.push(target);
        }

        // 按血量百分比排序，優先治療血量最少的
        supportTargets.sort((a, b) => {
            const aHealthPercent = a.hp / a.maxHp;
            const bHealthPercent = b.hp / b.maxHp;
            return aHealthPercent - bHealthPercent;
        });

        // 如果有支援範圍，可以同時支援多個目標
        if (this.supportRadius > 0) {
            return supportTargets.slice(0, 3); // 最多支援3個目標
        } else {
            return supportTargets.slice(0, 1); // 單體支援
        }
    }

    /**
     * 判斷是否為支援目標（友軍）
     */
    protected isSupportTarget(user: ServerGameUnit, target: ServerGameUnit): boolean {
        // 同陣營的單位可以互相支援
        return user.owner === target.owner;
    }

    /**
     * 判斷目標是否需要支援
     */
    protected needsSupport(target: ServerGameUnit): boolean {
        // 血量低於80%時需要治療
        return target.hp < target.maxHp * 0.8;
    }

    /**
     * 檢查目標是否在範圍內
     */
    protected isInRange(user: ServerGameUnit, target: ServerGameUnit): boolean {
        const dx = target.position.x - user.position.x;
        const dy = target.position.y - user.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.attackRange;
    }

    /**
     * 創建支援武器視覺效果
     */
    protected createSupportVisualEffects(
        user: ServerGameUnit,
        targets: ServerGameUnit[]
    ): VisualEffect[] {
        const effects: VisualEffect[] = [];

        // 主要支援效果
        effects.push({
            type: 'support',
            eventType: 'support_cast',
            position: { x: user.position.x, y: user.position.y },
            direction: { x: 0, y: 0 },
            data: {
                weaponType: this.weaponId,
                healAmount: this.healAmount,
                buffDuration: this.buffDuration,
                supportRadius: this.supportRadius,
                targetCount: targets.length
            }
        });

        // 為每個目標創建治療效果
        targets.forEach(target => {
            effects.push({
                type: 'heal',
                eventType: 'heal_effect',
                position: { x: target.position.x, y: target.position.y },
                direction: { x: 0, y: 0 },
                data: {
                    targetId: target.id,
                    healAmount: this.healAmount
                }
            });
        });

        return effects;
    }

    /**
     * 取得支援類型（子類需要重寫）
     */
    public abstract getSupportType(): 'heal' | 'buff' | 'shield' | 'hybrid';

    // Getter 方法
    public get healing(): number { return this.healAmount; }
    public get buffTime(): number { return this.buffDuration; }
    public get radius(): number { return this.supportRadius; }

    /**
     * 支援武器的目標選擇邏輯 - 實現抽象方法
     * 對於支援武器，findValidTargets 等同於 findSupportTargets
     */
    protected findValidTargets(
        user: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): ServerGameUnit[] {
        return this.findSupportTargets(user, potentialTargets);
    }
}
