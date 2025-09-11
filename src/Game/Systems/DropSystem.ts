import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { ServerGameUnit } from "../../Colyseus/Schema/Unit/GameUnit";
import { ServerEnemy } from "../../Colyseus/Schema/Unit/Enemy";
import { ServerItem, ItemType } from "../../Colyseus/Schema/Item/ServerItem";
import { Vector2 } from "../../Colyseus/Schema/Unit/GameUnit";
import { IdGenerator } from "../../Util/IdGenerator";
import { ConfigManager } from "../Managers/ConfigManager";
import { BattleMathUtils } from "../../Util/BattleMathUtils";
import {
    RARITY_DROP_RATES,
    TYPE_DROP_MULTIPLIERS,
    CATEGORY_MULTIPLIERS,
    RARITY_LEVEL_REQUIREMENTS,
    WEAPON_DROP_CONFIG,
    BASIC_DROP_CONFIG
} from "./DropRates";
import { ItemConfigDefinition } from "@/Types/Equipment/ItemTypes";
import { WeaponSystemFacade } from "./WeaponSystemFacade";
import { WeaponData } from "../../Colyseus/Schema/Weapon/WeaponData";
import { WeaponQuality } from "@/Types/Equipment/WeaponPropertyTypes";

/**
 * 掉落表項目（兼容舊系統）
 */
interface DropTableEntry {
    itemType: 'exp' | 'gold' | 'material' | 'weapon';
    chance: number;
    minValue?: number;
    maxValue?: number;
    specificId?: string;
    rarity?: string;
}

/**
 * 物品掉落系統管理器 - 新版本
 * 使用統一配置管理器和智能掉落算法
 */
export class DropSystem {
    private room: GameRoom;

    constructor(room: GameRoom) {
        this.room = room;
    }

    /**
     * 🔧 初始化掉落系統
     */
    public async initialize(): Promise<void> {
        try {
            // 確保武器系統已初始化
            WeaponSystemFacade.initialize();
            console.log('✅ DropSystem 初始化完成');
        } catch (error) {
            console.error('❌ DropSystem 初始化失敗:', error);
        }
    }

    /**
     * 🎯 處理敵人死亡掉落 - 新版智能系統
     */
    public handleEnemyDeath(enemy: ServerEnemy, killer: ServerGameUnit): void {
        console.log(`🎁 處理敵人 ${enemy.name}(Lv.${enemy.lv}) 的智能掉落...`);

        const dropPosition = this.getRandomDropPosition(enemy.position);
        const droppedItems = this.generateSmartDropItems(enemy, dropPosition.x, dropPosition.y);

        // 將掉落物品加入房間
        droppedItems.forEach(item => {
            this.room.state.gameCore.mapItems.push(item);
        });

        console.log(`✅ 敵人 ${enemy.name} 掉落 ${droppedItems.length} 個物品`);
    }

    /**
     * 🎯 智能掉落物品生成系統
     */
    private generateSmartDropItems(enemy: ServerEnemy, x: number, y: number): ServerItem[] {
        const items: ServerItem[] = [];

        // 1. 必定掉落：經驗值
        //  const expAmount = this.calculateExpDrop(enemy);
        //items.push(ServerItem.createExp(x, y, expAmount));

        // 2. 高機率掉落：金幣
        // if (this.rollDrop(BASIC_DROP_CONFIG.gold.dropRate)) {
        //     const goldAmount = this.calculateGoldDrop(enemy);
        //     items.push(ServerItem.createGold(x, y, goldAmount));
        // }

        // 3. 🎯 智能物品掉落：基於物品配置表
        // const droppedItems = this.rollItemDrops(enemy);
        // droppedItems.forEach(itemDrop => {
        //     const dropItem = this.createItemFromConfig(itemDrop.config, x, y, itemDrop.quantity);
        //     if (dropItem) {
        //         items.push(dropItem);
        //     }
        // });

        // 4. 🎯 武器掉落：使用武器管理器生成完整武器
        if (this.rollDrop(this.calculateWeaponDropRate(enemy))) {
            const weaponData = this.generateCompleteWeapon(enemy);
            if (weaponData) {
                try {
                    // 使用 WeaponData 創建掉落物品（包含完整屬性）
                    const weaponItem = ServerItem.createFromWeaponData(weaponData, x, y);
                    items.push(weaponItem);
                    console.log(`🗡️ 掉落武器: ${weaponData.name} (品質: ${weaponData.quality}, 等級: ${weaponData.level})`);
                } catch (error) {
                    console.error('❌ 創建武器掉落物品失敗:', error);
                    // 使用簡單方式創建武器物品作為後備
                    const simpleWeaponItem = ServerItem.createWeapon(
                        x, y,
                        weaponData.weaponId,
                        weaponData.name || '未知武器',
                        weaponData.quality || 'normal'
                    );
                    items.push(simpleWeaponItem);
                    console.log(`🔄 使用簡單方式創建武器掉落: ${weaponData.weaponId}`);
                }
            } else {
                console.warn(`⚠️ 無法生成武器，跳過武器掉落`);
            }
        }

        return items;
    }

    /**
     * 🎯 基於物品配置表的智能掉落
     */
    private rollItemDrops(enemy: ServerEnemy): Array<{ config: ItemConfigDefinition, quantity: number }> {
        const droppedItems: Array<{ config: ItemConfigDefinition, quantity: number }> = [];

        // 獲取啟用的非武器物品
        const enabledItems = ConfigManager.getEnabledItems().filter(item => item.type !== ItemType.WEAPON);

        for (const itemConfig of enabledItems) {
            // 計算掉落機率
            const dropRate = this.calculateItemDropRate(itemConfig, enemy);

            if (this.rollDrop(dropRate)) {
                // 計算掉落數量
                const quantity = this.calculateDropQuantity(itemConfig, enemy);
                droppedItems.push({ config: itemConfig, quantity });

                console.log(`📦 掉落物品: ${itemConfig.name} x${quantity} (${(dropRate * 100).toFixed(2)}%)`);
            }
        }

        return droppedItems;
    }

    /**
     * 🎯 計算物品掉落機率
     */
    private calculateItemDropRate(itemConfig: ItemConfigDefinition, enemy: ServerEnemy): number {
        // 基礎稀有度機率
        let baseRate = RARITY_DROP_RATES[itemConfig.rarity as keyof typeof RARITY_DROP_RATES] || 0.1;

        // 物品類型調整
        const typeMultiplier = TYPE_DROP_MULTIPLIERS[itemConfig.type as keyof typeof TYPE_DROP_MULTIPLIERS] || 1.0;
        baseRate *= typeMultiplier;

        // 等級調整
        const levelMultiplier = this.calculateLevelMultiplier(itemConfig, enemy);
        baseRate *= levelMultiplier;

        // 物品價值調整（越貴越難掉）
        const valueMultiplier = BattleMathUtils.atLeast(1 / Math.sqrt(itemConfig.baseValue / 10), 0.1);
        baseRate *= valueMultiplier;

        // 分類特殊調整
        baseRate *= this.getCategoryMultiplier(itemConfig.category);

        return BattleMathUtils.clamp(baseRate, 0.001, 1);
    }

    /**
     * 🎯 等級相關的掉落機率調整
     */
    private calculateLevelMultiplier(itemConfig: ItemConfigDefinition, enemy: ServerEnemy): number {
        const enemyLevel = enemy.lv || 1;

        // 根據物品類型和稀有度調整等級需求
        const levelRequirement = this.getItemLevelRequirement(itemConfig);

        if (enemyLevel < levelRequirement) {
            // 等級不夠，大幅降低掉落率
            return 0.1;
        }

        // 等級超過太多，適度降低掉落率
        const levelDifference = enemyLevel - levelRequirement;
        if (levelDifference > 10) {
            return BattleMathUtils.atLeast(1 - (levelDifference - 10) * 0.05, 0.3);
        }

        return 1.0;
    }

    /**
     * 🎯 獲取物品的建議等級需求
     */
    private getItemLevelRequirement(itemConfig: ItemConfigDefinition): number {
        // 基於稀有度的基礎等級需求
        let baseLevel: number = RARITY_LEVEL_REQUIREMENTS[itemConfig.rarity as keyof typeof RARITY_LEVEL_REQUIREMENTS] || 1;

        // 特殊物品的等級調整
        if (itemConfig.category === 'ore') {
            if (itemConfig.id.includes('mithril')) baseLevel = 30;
            if (itemConfig.id.includes('adamant')) baseLevel = 50;
        }

        if (itemConfig.category === 'magic') {
            baseLevel += 10; // 魔法物品需要更高等級
        }

        if (itemConfig.category === 'rare_drop') {
            baseLevel += 20; // 稀有掉落需要更高等級
        }

        return baseLevel;
    }

    /**
     * 🎯 分類特殊倍率
     */
    private getCategoryMultiplier(category: string): number {
        return CATEGORY_MULTIPLIERS[category] || 1.0;
    }

    /**
     * 🎯 計算掉落數量
     */
    private calculateDropQuantity(itemConfig: ItemConfigDefinition, enemy: ServerEnemy): number {
        let baseQuantity = 1;
        const enemyLevel = enemy.lv || 1;

        // 基於物品類型的基礎數量
        if (itemConfig.type === 'CURRENCY') {
            // 貨幣類：根據價值和等級計算
            if (itemConfig.id === 'gold') {
                baseQuantity = Math.floor(enemyLevel * (2 + BattleMathUtils.randomFloatRange(0, 3)));
            } else if (itemConfig.id === 'gem') {
                baseQuantity = BattleMathUtils.randomIntRange(1, 2);
            } else if (itemConfig.id === 'crystal') {
                baseQuantity = 1;
            }
        } else if (itemConfig.type === 'MATERIAL') {
            // 材料類：根據稀有度調整
            const rarityQuantities = {
                common: [1, 5],
                uncommon: [1, 3],
                rare: [1, 2],
                epic: [1, 1],
                legendary: [1, 1]
            };

            const [min, max] = rarityQuantities[itemConfig.rarity as keyof typeof rarityQuantities] || [1, 1];
            baseQuantity = BattleMathUtils.randomIntRange(min, max);
        } else if (itemConfig.type === 'CONSUMABLE') {
            // 消耗品：通常單個
            baseQuantity = BattleMathUtils.rollProbability(0.3) ? 2 : 1;
        }

        return BattleMathUtils.atLeast(baseQuantity, 1);
    }

    /**
     * 🎯 從配置創建物品
     */
    private createItemFromConfig(itemConfig: ItemConfigDefinition, x: number, y: number, quantity: number): ServerItem | null {
        const randomOffset = BattleMathUtils.getRandomOffset();
        const finalX = x + randomOffset.x;
        const finalY = y + randomOffset.y;
        const name = itemConfig.name;
        switch (itemConfig.type) {
            case ItemType.CURRENCY:
                if (itemConfig.id === 'gold') {
                    return ServerItem.createGold(finalX, finalY, quantity);
                } else {
                    return ServerItem.createMaterial(finalX, finalY, itemConfig.id, name, quantity);
                }

            case ItemType.MATERIAL:
                return ServerItem.createMaterial(finalX, finalY, itemConfig.id, name, quantity);

            case ItemType.CONSUMABLE:
                return ServerItem.createMaterial(finalX, finalY, itemConfig.id, name, quantity);

            case ItemType.MISC:
                return ServerItem.createMaterial(finalX, finalY, itemConfig.id, name, quantity);

            default:
                console.warn(`未知物品類型: ${itemConfig.type} for item: ${itemConfig.id}`);
                return null;
        }
    }

    /**
     * 🎯 武器掉落機率計算
     */
    private calculateWeaponDropRate(enemy: ServerEnemy): number {
        // 基礎武器掉落率
        let baseRate = WEAPON_DROP_CONFIG.baseDropRate;

        // 等級調整
        const enemyLevel = enemy.lv || 1;
        baseRate += enemyLevel * WEAPON_DROP_CONFIG.levelMultiplier;

        // 最大掉落率限制
        return Math.min(WEAPON_DROP_CONFIG.maxDropRate, baseRate);
    }

    /**
     * 🎯 生成完整武器數據（使用武器管理器）
     */
    private generateCompleteWeapon(enemy: ServerEnemy): WeaponData | null {
        try {
            const enabledWeapons = ConfigManager.getEnabledWeapons();
            if (enabledWeapons.length === 0) {
                console.warn('❌ 沒有可用的武器配置');
                return null;
            }

            // 隨機選擇武器
            const weaponConfig = enabledWeapons[Math.floor(Math.random() * enabledWeapons.length)];
            const weaponId = weaponConfig.id;

            // 使用 WeaponSystemFacade 創建完整武器
            const { data: weaponData } = WeaponSystemFacade.createAndGetWeapon(weaponId);
            if (!weaponData) {
                console.warn(`❌ 無法創建武器數據: ${weaponId}`);
                return null;
            }

            // 根據敵人等級調整武器等級
            const enemyLevel = enemy.lv || 1;
            const weaponLevel = Math.max(1, enemyLevel + Math.floor(Math.random() * 3) - 1);

            // 設置武器等級（這會觸發重新計算屬性）
            weaponData.level = weaponLevel;

            // 根據配置的品質機率重新確定品質（可選）
            const desiredQuality = this.rollQualityFromConfig(WEAPON_DROP_CONFIG.qualityRates);
            if (desiredQuality !== weaponData.quality) {
                // 如果需要不同品質，重新生成（簡化處理）
                weaponData.quality = desiredQuality;
            }

            console.log(`🔧 生成完整武器: ${weaponId} Lv.${weaponLevel} (品質: ${weaponData.quality})`);
            return weaponData;
        } catch (error) {
            console.error('❌ 生成完整武器失敗:', error);
            // 回退到簡單武器生成
            return this.fallbackSimpleWeapon(enemy);
        }
    }

    /**
     * 🔄 後備簡單武器生成（當武器管理器失敗時使用）
     */
    private fallbackSimpleWeapon(enemy: ServerEnemy): WeaponData | null {
        try {
            const enabledWeapons = ConfigManager.getEnabledWeapons();
            if (enabledWeapons.length === 0) return null;

            const weaponConfig = enabledWeapons[Math.floor(Math.random() * enabledWeapons.length)];
            const weaponData = new WeaponData(weaponConfig.id);

            // 設置基本屬性
            const enemyLevel = enemy.lv || 1;
            weaponData.level = Math.max(1, enemyLevel + Math.floor(Math.random() * 3) - 1);
            weaponData.quality = this.rollQualityFromConfig(WEAPON_DROP_CONFIG.qualityRates);

            console.log(`🔄 使用後備方式生成武器: ${weaponConfig.id}`);
            return weaponData;
        } catch (error) {
            console.error('❌ 後備武器生成也失敗:', error);
            return null;
        }
    }

    /**
     * 🎯 根據配置機率抽取品質（轉換為 WeaponQuality 枚舉）
     */
    private rollQualityFromConfig(rates: Record<string, number>): WeaponQuality {
        const qualityString = this.rollQuality(rates);

        // 轉換字符串到 WeaponQuality 枚舉
        switch (qualityString.toLowerCase()) {
            case 'common':
            case 'normal':
                return WeaponQuality.NORMAL;
            case 'uncommon':
            case 'magic':
                return WeaponQuality.MAGIC;
            case 'rare':
                return WeaponQuality.RARE;
            case 'epic':
                return WeaponQuality.EPIC;
            case 'legendary':
                return WeaponQuality.LEGENDARY;
            default:
                return WeaponQuality.NORMAL;
        }
    }

    /**
     * 🎯 生成隨機武器（舊方法，保留作為後備）
     * @deprecated 請使用 generateCompleteWeapon 代替
     */
    private generateRandomWeapon(enemy: ServerEnemy): {
        weaponId: string;
        name: string;
        quality: string;
        //level: number;
    } {
        const enabledWeapons = ConfigManager.getEnabledWeapons();
        // 隨機選擇武器
        const weaponConfig = enabledWeapons[Math.floor(Math.random() * enabledWeapons.length)];
        const weaponId = weaponConfig.id;

        // 根據配置的品質機率生成品質
        const quality = this.rollQuality(WEAPON_DROP_CONFIG.qualityRates);

        // 等級基於敵人等級 ±1
        //   const level = Math.max(1, (enemy.lv || 1) + Math.floor(Math.random() * 3) - 1);

        return {
            weaponId,
            quality,
            //     level,
            name: weaponConfig.name
        };
    }

    /**
     * 🎯 品質抽取
     */
    private rollQuality(rates: Record<string, number>): string {
        const roll = Math.random();
        let cumulative = 0;

        for (const [quality, rate] of Object.entries(rates)) {
            cumulative += rate;
            if (roll <= cumulative) {
                return quality;
            }
        }
        return 'common';
    }

    /**
     * 🎯 機率判定
     */
    private rollDrop(probability: number): boolean {
        return BattleMathUtils.rollProbability(probability);
    }

    /**
     * 🎯 計算經驗值掉落
     */
    private calculateExpDrop(enemy: ServerEnemy): number {
        const enemyLevel = enemy.lv || 1;
        const baseAmount = BASIC_DROP_CONFIG.exp.baseAmount;
        const levelMultiplier = BASIC_DROP_CONFIG.exp.levelMultiplier;
        const randomRange = BASIC_DROP_CONFIG.exp.randomRange;

        return Math.floor(enemyLevel * baseAmount * levelMultiplier + Math.random() * randomRange);
    }

    /**
     * 🎯 計算金幣掉落
     */
    private calculateGoldDrop(enemy: ServerEnemy): number {
        const enemyLevel = enemy.lv || 1;
        const baseAmount = BASIC_DROP_CONFIG.gold.baseAmount;
        const levelMultiplier = BASIC_DROP_CONFIG.gold.levelMultiplier;
        const randomRange = BASIC_DROP_CONFIG.gold.randomRange;

        return Math.floor(enemyLevel * baseAmount * levelMultiplier + BattleMathUtils.randomFloatRange(0, randomRange));
    }

    /**
     * 獲取隨機掉落位置（在原位置周圍散佈）
     */
    private getRandomDropPosition(basePosition: Vector2): Vector2 {
        const scatterRadius = 50; // 散佈半徑
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * scatterRadius;

        return new Vector2(
            basePosition.x + Math.cos(angle) * distance,
            basePosition.y + Math.sin(angle) * distance
        );
    }

    /**
     * 清理系統資源
     */
    public cleanup(): void {
        console.log('🧹 DropSystem 已清理');
    }
}
