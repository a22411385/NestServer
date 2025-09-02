/**
 * 武器配置定義 - 集中管理所有武器的基本信息
 */

export interface WeaponConfig {
    id: string;
    name: string;
    displayName: string;
    type: 'melee' | 'projectile' | 'support';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    description?: string;
    icon?: string;
    // 基礎屬性
    baseDamage: number;
    attackSpeed: number;
    attackRange: number;
    // 特殊屬性
    specialProperties?: Record<string, any>;
}

/**
 * 武器配置數據庫
 */
export const WEAPON_CONFIGS: Record<string, WeaponConfig> = {
    // =================== 近戰武器 ===================
    baseball_bat: {
        id: 'baseball_bat',
        name: 'Baseball Bat',
        displayName: '球棒',
        type: 'melee',
        rarity: 'common',
        description: '一把普通的球棒，揮擊時有不錯的擊退效果',
        baseDamage: 25,
        attackSpeed: 1200,
        attackRange: 80,
        specialProperties: {
            knockbackForce: 150,
            sweepAngle: 0.5
        }
    },

    iron_sword: {
        id: 'iron_sword',
        name: 'Iron Sword',
        displayName: '鐵劍',
        type: 'melee',
        rarity: 'common',
        description: '堅固的鐵製劍，攻擊速度適中',
        baseDamage: 30,
        attackSpeed: 1000,
        attackRange: 100,
        specialProperties: {
            knockbackForce: 100,
            sweepAngle: 0.3
        }
    },

    flame_sword: {
        id: 'flame_sword',
        name: 'Flame Sword',
        displayName: '烈焰劍',
        type: 'melee',
        rarity: 'rare',
        description: '附帶火焰傷害的魔法劍',
        baseDamage: 45,
        attackSpeed: 1100,
        attackRange: 95,
        specialProperties: {
            knockbackForce: 120,
            sweepAngle: 0.4,
            burnDamage: 5,
            burnDuration: 3000
        }
    },

    // =================== 遠程武器 ===================
    fireball: {
        id: 'fireball',
        name: 'Fireball',
        displayName: '火球',
        type: 'projectile',
        rarity: 'rare',
        description: '發射火球攻擊敵人',
        baseDamage: 35,
        attackSpeed: 1500,
        attackRange: 400,
        specialProperties: {
            projectileSpeed: 200,
            areaOfEffect: 50,
            pierceCount: 0
        }
    },

    magic_bow: {
        id: 'magic_bow',
        name: 'Magic Bow',
        displayName: '魔法弓',
        type: 'projectile',
        rarity: 'uncommon',
        description: '發射魔法箭矢的弓',
        baseDamage: 28,
        attackSpeed: 800,
        attackRange: 350,
        specialProperties: {
            projectileSpeed: 300,
            pierceCount: 1
        }
    },

    lightning_wand: {
        id: 'lightning_wand',
        name: 'Lightning Wand',
        displayName: '閃電法杖',
        type: 'projectile',
        rarity: 'epic',
        description: '釋放閃電攻擊多個目標',
        baseDamage: 40,
        attackSpeed: 1200,
        attackRange: 300,
        specialProperties: {
            projectileSpeed: 500,
            chainCount: 3,
            stunDuration: 1000
        }
    },

    // =================== 支援武器 ===================
    healing_potion: {
        id: 'healing_potion',
        name: 'Healing Potion',
        displayName: '治療藥水',
        type: 'support',
        rarity: 'common',
        description: '恢復血量的治療藥水',
        baseDamage: 0,
        attackSpeed: 2000,
        attackRange: 100,
        specialProperties: {
            healAmount: 50,
            supportRadius: 80,
            canTargetSelf: true
        }
    },

    blessing_staff: {
        id: 'blessing_staff',
        name: 'Blessing Staff',
        displayName: '祝福法杖',
        type: 'support',
        rarity: 'uncommon',
        description: '為周圍隊友提供屬性增益',
        baseDamage: 0,
        attackSpeed: 3000,
        attackRange: 150,
        specialProperties: {
            healAmount: 30,
            buffDuration: 5000,
            supportRadius: 120,
            attackBoostPercentage: 20
        }
    },

    revival_crystal: {
        id: 'revival_crystal',
        name: 'Revival Crystal',
        displayName: '復活水晶',
        type: 'support',
        rarity: 'legendary',
        description: '能夠復活倒下隊友的神秘水晶',
        baseDamage: 0,
        attackSpeed: 5000,
        attackRange: 200,
        specialProperties: {
            healAmount: 100,
            canRevive: true,
            supportRadius: 100,
            reviveHealthPercentage: 50
        }
    }
};

/**
 * 根據武器ID獲取配置
 */
export function getWeaponConfig(weaponId: string): WeaponConfig | null {
    return WEAPON_CONFIGS[weaponId] || null;
}

/**
 * 獲取指定類型的所有武器
 */
export function getWeaponsByType(type: 'melee' | 'projectile' | 'support'): WeaponConfig[] {
    return Object.values(WEAPON_CONFIGS).filter(config => config.type === type);
}

/**
 * 獲取指定稀有度的所有武器
 */
export function getWeaponsByRarity(rarity: string): WeaponConfig[] {
    return Object.values(WEAPON_CONFIGS).filter(config => config.rarity === rarity);
}

/**
 * 獲取所有武器配置
 */
export function getAllWeaponConfigs(): WeaponConfig[] {
    return Object.values(WEAPON_CONFIGS);
}
