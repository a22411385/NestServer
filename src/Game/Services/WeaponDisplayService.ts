/**
 * 🎨 武器顯示資料服務
 * 負責將 WeaponSchema 轉換為客戶端友好的顯示格式
 */

import { WeaponSchema } from '@/Colyseus/Schema/Weapon/WeaponSchema';
import {
    WeaponDisplayData,
    StatusEffectDisplay,
    WeaponModifierDisplay,
    AttributeBonusDisplay,
} from '@/Types/Equipment/WeaponDisplayTypes';
import { PropertyValue, WeaponModifier, AttributeBonus, ModifierType } from '@/Types/Equipment/WeaponPropertyTypes';
import { WeaponDataService } from './WeaponDataService';

export class WeaponDisplayService {
    /**
     * 🎨 將 WeaponSchema 轉換為客戶端顯示格式
     */
    public static toDisplayData(weaponSchema: WeaponSchema): WeaponDisplayData {
        // 計算最終屬性
        const finalStats = WeaponDataService.calculateFinalStats(weaponSchema);

        return {
            // 基本資訊
            uniqueId: weaponSchema.uniqueId,
            weaponId: weaponSchema.weaponId,
            name: weaponSchema.name,
            description: weaponSchema.description || '',
            rarity: weaponSchema.rarity,
            level: weaponSchema.level,
            exp: weaponSchema.exp,
            expToNext: 100, // TODO: 從配置或計算獲取
            isEquipped: weaponSchema.isEquipped,

            // 基礎屬性（✅ 使用配置表標準名稱）
            baseStats: {
                damage: finalStats.weaponDamage,       // ✅ 配置表標準名稱
                attackSpeed: finalStats.attackSpeed,   // ✅ 配置表標準名稱
                attackRange: finalStats.attackRange,   // ✅ 配置表標準名稱
                critRate: finalStats.critRate || 0,    // ✅ 配置表標準名稱
                critDamage: finalStats.critDamage || 0,// ✅ 配置表標準名稱
            },
            // 🆕 狀態效果列表
            statusEffects: this.formatStatusEffects(weaponSchema.fixedProperties),

            // 🆕 武器詞綴列表（暫時為空，等待 Schema 更新）
            weaponModifiers: [], // this.formatWeaponModifiers(weaponSchema.modifiers || []),

            // 🆕 屬性加成列表（暫時為空，等待 Schema 更新）
            attributeBonuses: [], // this.formatAttributeBonuses(weaponSchema.bonuses || []),

            // 其他資訊
            tags: [], // TODO: 從 WeaponConfig 獲取
            weaponType: weaponSchema.weaponType,
            sellPrice: this.calculateSellPrice(weaponSchema),
        };
    }

    /**
     * 🎨 格式化狀態效果顯示
     */
    private static formatStatusEffects(properties: PropertyValue[]): StatusEffectDisplay[] {
        return properties.map(prop => ({
            id: prop.id,
            displayName: prop.displayName,
            description: this.generateStatusEffectDescription(prop),
            icon: this.getStatusEffectIcon(prop.id),

            probability: prop.probability,
            duration: prop.duration,
            damage: prop.baseDamage > 0 ? prop.baseDamage : undefined,
            value: prop.value,

            category: prop.category || 'utility',
            tags: prop.tags || [],
        }));
    }

    /**
     * 🎨 格式化武器詞綴顯示
     */
    private static formatWeaponModifiers(modifiers: WeaponModifier[]): WeaponModifierDisplay[] {
        return modifiers.map(mod => ({
            id: mod.id,
            displayName: mod.displayName,
            description: this.generateModifierDescription(mod),
            icon: this.getModifierIcon(mod.id),

            value: mod.baseValue,
            valueType: mod.valueType,
            modifierType: mod.modifierType,
            affectedStat: mod.affectedStat,

            formattedText: this.formatModifierText(mod),

            category: mod.category || 'combat',
            tags: mod.tags ? mod.tags.split(',').map(t => t.trim()) : [],
        }));
    }

    /**
     * 🎨 格式化屬性加成顯示
     */
    private static formatAttributeBonuses(bonuses: AttributeBonus[]): AttributeBonusDisplay[] {
        return bonuses.map(bonus => ({
            id: bonus.id,
            displayName: bonus.displayName,
            description: this.generateBonusDescription(bonus),
            icon: this.getBonusIcon(bonus.id),

            value: bonus.baseValue,
            modifierType: bonus.modifierType,
            affectedStat: bonus.affectedStat,

            formattedText: this.formatBonusText(bonus),

            category: bonus.category || 'attribute',
            tags: bonus.tags ? bonus.tags.split(',').map(t => t.trim()) : [],
        }));
    }

    /**
     * 📝 生成狀態效果描述文字
     */
    private static generateStatusEffectDescription(prop: PropertyValue): string {
        const parts: string[] = [];

        if (prop.probability > 0 && prop.probability < 100) {
            parts.push(`${prop.probability}% 機率觸發`);
        }

        if (prop.duration > 0) {
            parts.push(`持續 ${prop.duration} 秒`);
        }

        if (prop.baseDamage > 0) {
            parts.push(`造成 ${prop.baseDamage} 傷害`);
        }

        if (prop.value > 0) {
            switch (prop.id) {
                case 'slow':
                    parts.push(`減速 ${prop.value}%`);
                    break;
                case 'knockback':
                    parts.push(`擊退 ${prop.value} 距離`);
                    break;
                default:
                    parts.push(`效果值 ${prop.value}`);
            }
        }

        return parts.length > 0 ? parts.join('，') : prop.displayName;
    }

    /**
     * 📝 生成詞綴描述文字
     * valueType 可以是中文單位 ('%', '次', '度', '距離' 等)
     */
    private static generateModifierDescription(mod: WeaponModifier): string {
        const statName = this.getStatDisplayName(mod.affectedStat);
        const modTypeText = this.getModifierTypeText(mod.modifierType);
        const unit = mod.valueType || '';

        return `${statName} ${modTypeText} ${mod.baseValue}${unit}`;
    }

    /**
     * 📝 生成屬性加成描述文字
     */
    private static generateBonusDescription(bonus: AttributeBonus): string {
        const statName = this.getStatDisplayName(bonus.affectedStat);
        const modTypeText = this.getModifierTypeText(bonus.modifierType);

        if (bonus.modifierType === 'flat') {
            return `+${bonus.baseValue} ${statName}`;
        } else {
            return `${statName} ${modTypeText} ${bonus.baseValue}%`;
        }
    }

    /**
     * 🎯 格式化詞綴文字（簡短版，用於列表）
     * valueType 可以是中文單位 ('%', '次', '度', '距離' 等)
     */
    private static formatModifierText(mod: WeaponModifier): string {
        const statName = this.getStatDisplayName(mod.affectedStat);
        const unit = mod.valueType || '';

        return `${statName} +${mod.baseValue}${unit}`;
    }

    /**
     * 🎯 格式化加成文字（簡短版，用於列表）
     */
    private static formatBonusText(bonus: AttributeBonus): string {
        const statName = this.getStatDisplayName(bonus.affectedStat);

        if (bonus.modifierType === 'flat') {
            return `+${bonus.baseValue} ${statName}`;
        } else {
            return `${statName} +${bonus.baseValue}%`;
        }
    }

    /**
     * 🌐 獲取屬性顯示名稱（中文）
     */
    private static getStatDisplayName(statId: string): string {
        const nameMap: Record<string, string> = {
            // 基礎屬性
            'strength': '力量',
            'intelligence': '智力',
            'agility': '敏捷',
            'vitality': '體質',

            // 戰鬥屬性
            'attack_damage': '攻擊力',
            'attack_speed': '攻擊速度',
            'attack_range': '攻擊範圍',
            'critical_chance': '暴擊率',
            'critical_damage': '暴擊傷害',

            // 特殊屬性
            'pierce_count': '穿透',
            'chain_count': '連鎖',
            'bounce_count': '彈射',
            'projectile_speed': '投射物速度',
            'projectile_size': '投射物大小',
            'sweep_angle': '掃擊角度',

            // 生存屬性
            'max_hp': '最大生命',
            'max_mp': '最大魔力',
            'hp_regen': '生命回復',
            'mp_regen': '魔力回復',
        };

        return nameMap[statId] || statId;
    }

    /**
     * 🌐 獲取修改器類型文字
     */
    private static getModifierTypeText(modType: string): string {
        switch (modType) {
            case 'FLAT': return '額外';
            case 'INCREASED': return '提高';
            case 'MORE': return '更多';
            default: return '';
        }
    }

    /**
     * 🎨 獲取狀態效果圖示
     */
    private static getStatusEffectIcon(effectId: string): string {
        const iconMap: Record<string, string> = {
            'burn': 'fire',
            'freeze': 'ice',
            'poison': 'poison',
            'slow': 'slow',
            'stun': 'stun',
            'bleed': 'bleed',
            'knockback': 'knockback',
        };

        return iconMap[effectId] || 'default';
    }

    /**
     * 🎨 獲取詞綴圖示
     */
    private static getModifierIcon(modId: string): string {
        const iconMap: Record<string, string> = {
            'piercing': 'arrow',
            'chain_attack': 'chain',
            'critical_chance': 'crit',
            'critical_damage': 'crit_damage',
            'bounce': 'bounce',
            'homing': 'target',
        };

        return iconMap[modId] || 'sword';
    }

    /**
     * 🎨 獲取加成圖示
     */
    private static getBonusIcon(bonusId: string): string {
        const iconMap: Record<string, string> = {
            'strength': 'strength',
            'intelligence': 'intelligence',
            'agility': 'agility',
            'vitality': 'vitality',
            'attack_speed': 'speed',
            'max_hp': 'heart',
        };

        return iconMap[bonusId] || 'star';
    }

    /**
     * 💰 計算賣價
     */
    private static calculateSellPrice(weaponSchema: WeaponSchema): number {
        let basePrice = 100;

        const qualityMultiplier: Record<string, number> = {
            'normal': 1,
            'rare': 5,
            'magic': 30,
            'epic': 15,
            'legendary': 50,
        };

        const multiplier = qualityMultiplier[weaponSchema.rarity] || 1;
        const levelBonus = weaponSchema.level * 10;

        return Math.floor(basePrice * multiplier + levelBonus);
    }

    /**
     * 📊 批量轉換
     */
    public static toDisplayDataArray(weapons: WeaponSchema[]): WeaponDisplayData[] {
        return weapons.map(weapon => this.toDisplayData(weapon));
    }
}
