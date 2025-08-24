// 武器基礎接口
export interface WeaponData {
    id: string
    name: string
    type: 'melee' | 'ranged' | 'magic' | 'passive'
    rarity: 'common' | 'rare' | 'epic' | 'legendary'

    // 攻擊屬性
    baseDamage: number
    attackSpeed: number      // 攻擊間隔 (ms)
    range: number           // 攻擊範圍

    // 投射物屬性
    projectile: {
        type: 'basic' | 'piercing' | 'explosive' | 'homing' | 'chain'
        speed: number
        count: number        // 同時發射數量
        spread: number       // 散射角度
        lifetime: number     // 存活時間
    }

    // 特殊效果
    effects: WeaponEffect[]

    // 升級相關
    // level: number
    // maxLevel: number
    // evolutionRequirements?: EvolutionRequirement[]
}

export interface WeaponEffect {
    type: 'damage_bonus' | 'crit_chance' | 'life_steal' | 'freeze' | 'burn'
    value: number
    chance?: number         // 觸發機率 (0-1)
    duration?: number       // 效果持續時間
}