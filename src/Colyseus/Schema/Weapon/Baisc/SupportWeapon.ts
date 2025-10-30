import { WeaponBasic } from './WeaponBasic';
import { AttackFailReason, VisualEffect, AttackResult } from '@/Types';
import { ServerGameUnit } from '../../Unit/GameUnit';


/**
 * 輔助武器抽象類
 * 特點：可以治療友軍、提供增益效果、範圍支援
 * 移除 Schema 導入，SupportWeapon 現在是純邏輯層類
 * 🆕 支持配置驅動的初始化
 */
export abstract class SupportWeapon extends WeaponBasic {

    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 子類可覆寫的輔助武器特定配置方法
     */
    protected applySupportSpecificConfig(): void {
        // 預設實現，子類可覆寫
    }

    public tryAttack(
        user: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
    ): AttackResult {
        // 檢查冷卻時間
        if (!this.canAttack()) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.ON_COOLDOWN,
            };
        }

        // 找到需要支援的目標
        const supportTargets = this.findSupportTargets(user, potentialTargets);

        if (supportTargets.length === 0) {
            return {
                success: false,
                weaponId: this.weaponId,
                baseDamage: 0,
                reason: AttackFailReason.NO_TARGET,
            };
        }

        // 更新攻擊時間
        this.updateLastAttackTime();

        return {
            success: true,
            weaponId: this.weaponId,
            targetIds: supportTargets.map((target) => target.id),
            baseDamage: this.baseDamage, // 對於支援武器，baseDamage 代表治療量
            attackData: {
                position: { x: user.position.x, y: user.position.y },
                direction: { x: 0, y: 0 }, // 支援武器通常沒有方向性
                range: this.attackRange,
                supportRadius: this.range,
            },
            visualEffects: this.createSupportVisualEffects(user, supportTargets),
        };
    }

    /**
     * 尋找需要支援的目標
     * 預設邏輯：優先選擇血量最少的友軍
     */
    protected findSupportTargets(
        user: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
    ): ServerGameUnit[] {
        const supportTargets: ServerGameUnit[] = [];

        // 檢查是否可以對自己使用
        if (this.needsSupport(user)) {
            supportTargets.push(user);
        }

        // 尋找範圍內需要支援的友軍
        for (const target of potentialTargets) {

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
        if (this.range > 0) {
            return supportTargets.slice(0, 3); // 最多支援3個目標
        } else {
            return supportTargets.slice(0, 1); // 單體支援
        }
    }

    /**
     * 判斷是否為支援目標（友軍）
     */
    protected isSupportTarget(
        user: ServerGameUnit,
        target: ServerGameUnit,
    ): boolean {
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
        targets: ServerGameUnit[],
    ): VisualEffect[] {
        const effects: VisualEffect[] = [];

        // 主要支援效果
        const supportEffect: VisualEffect = {
            type: 'support',
            position: { x: user.position.x, y: user.position.y },
            direction: { x: 0, y: 0 },
            data: {
                amount: this.damage,
                radius: this.range,
                buffType: `支援範圍 ${this.range}`,
            },
        };
        effects.push(supportEffect);

        // 為每個目標創建治療效果
        targets.forEach((target) => {
            const healEffect: VisualEffect = {
                type: 'heal',
                position: { x: target.position.x, y: target.position.y },
                direction: { x: 0, y: 0 },
                data: {
                    amount: this.damage,
                    buffType: 'heal',
                },
            };
            effects.push(healEffect);
        });

        return effects;
    }

    /**
     * 取得支援類型（子類需要重寫）
     */
    public abstract getSupportType(): 'heal' | 'buff' | 'shield' | 'hybrid';

    /**
     * 支援武器的目標選擇邏輯 - 實現抽象方法
     * 對於支援武器，findValidTargets 等同於 findSupportTargets
     */
    protected findValidTargets(
        user: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
    ): ServerGameUnit[] {
        return this.findSupportTargets(user, potentialTargets);
    }
}
