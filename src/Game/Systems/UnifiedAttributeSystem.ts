/**
 * 🎯 POE風格統一屬性計算系統 - 漸進式實施方案
 * 
 * 策略：不破壞現有系統，逐步統一計算邏輯
 * 
 * Phase 1: 統一武器屬性計算
 * Phase 2: 整合英雄屬性計算  
 * Phase 3: 加入天賦和狀態效果
 * Phase 4: 完整的POE風格系統
 */

import { ServerGameUnit } from '@/Colyseus/Schema/Unit/GameUnit';
import { WeaponBasic } from '@/Colyseus/Schema/Weapon/Baisc/WeaponBasic';
import { BonusCalculator, BonusBreakdown } from './BonusCalculator';
import { AttributeMappingService } from '@/Game/Services/AttributeMappingService';

/**
 * 🆕 統一屬性計算系統 (POE風格)
 * 
 * 目標：替代現在的雙重計算問題
 * 方法：統一入口，智能路由到正確的計算邏輯
 */
export class UnifiedAttributeSystem {
    private static cache = new Map<string, any>();
    private static lastModified = new Map<string, number>();
    private static mappingService: AttributeMappingService;

    /**
     * 🎯 統一入口：獲取任何屬性的最終值
     * 
     * @param entity 實體（英雄、武器等）
     * @param attributeId 屬性ID (weapon_damage, attack_range, critical_chance 等)
     * @param context 上下文（用於武器屬性需要持有者信息）
     * @returns 最終屬性值
     */
    static getFinalAttribute(
        entity: ServerGameUnit | WeaponBasic,
        attributeId: string,
        context?: { weapon?: WeaponBasic; owner?: ServerGameUnit }
    ): number {
        // 🔍 生成緩存鍵
        const cacheKey = this.generateCacheKey(entity, attributeId, context);

        // ⚡ 檢查緩存
        if (this.isCacheValid(cacheKey, entity)) {
            return this.cache.get(cacheKey) || 0;
        }

        // 🧮 計算屬性
        const result = this.calculateAttribute(entity, attributeId, context);

        // 💾 更新緩存
        this.updateCache(cacheKey, result, entity);

        return result;
    }

    /**
     * 🧮 核心計算邏輯
     */
    private static calculateAttribute(
        entity: ServerGameUnit | WeaponBasic,
        attributeId: string,
        context?: { weapon?: WeaponBasic; owner?: ServerGameUnit }
    ): number {
        // 🎯 路由到正確的計算方法
        if (entity instanceof WeaponBasic) {
            return this.calculateWeaponAttribute(entity, attributeId, context?.owner);
        } else {
            return this.calculateUnitAttribute(entity, attributeId);
        }
    }

    /**
     * ⚔️ 武器屬性計算（統一武器本身 + 外部加成）
     */
    private static calculateWeaponAttribute(
        weapon: WeaponBasic,
        attributeId: string,
        owner?: ServerGameUnit
    ): number {
        // 1. 獲取武器本身屬性（從 getFinalStats）
        const weaponStats = weapon.getFinalStats();
        const baseValue = this.getWeaponBaseValue(weaponStats, attributeId);

        // 2. 如果沒有持有者，只返回武器本身屬性
        if (!owner) {
            return baseValue;
        }

        // 3. 獲取外部加成（使用現有的 BonusCalculator）
        const externalBonus = BonusCalculator.getPropertyBonus(attributeId, owner);

        // 4. 應用POE公式
        return BonusCalculator.applyBonus(baseValue, externalBonus, `Weapon ${attributeId}`);
    }

    /**
     * 🧙‍♂️ 單位屬性計算（英雄、敵人等）
     */
    private static calculateUnitAttribute(
        unit: ServerGameUnit,
        attributeId: string
    ): number {
        // 🎯 這裡可以整合英雄的基礎屬性、天賦、狀態效果等
        // 目前先使用現有的 BonusCalculator
        const bonus = BonusCalculator.getPropertyBonus(attributeId, unit);
        return BonusCalculator.applyBonus(0, bonus, `Unit ${attributeId}`);
    }

    /**
     * 🔍 從武器Stats獲取基礎值（配置驅動版本）
     * ✅ Phase 2: 使用 AttributeMappingService 替代硬編碼
     */
    private static getWeaponBaseValue(weaponStats: any, attributeId: string): number {
        // ✅ 使用配置服務獲取映射
        if (!this.mappingService) {
            console.warn('⚠️ AttributeMappingService 未初始化，使用後備邏輯');
            return weaponStats[attributeId] || 0;
        }

        const statKey = this.mappingService.getStatKey(attributeId);

        if (!statKey) {
            // 屬性ID不存在，嘗試直接使用（後備方案）
            console.warn(`⚠️ 未知的屬性ID: ${attributeId}，嘗試直接讀取`);
            return weaponStats[attributeId] || 0;
        }

        return weaponStats[statKey] || 0;
    }

    /**
     * 🔧 緩存管理
     */
    private static generateCacheKey(
        entity: ServerGameUnit | WeaponBasic,
        attributeId: string,
        context?: any
    ): string {
        const entityId = entity instanceof WeaponBasic ?
            `weapon_${entity.weaponId}` :
            `unit_${entity.id}`;
        const contextId = context?.owner?.id || 'no_owner';
        return `${entityId}_${attributeId}_${contextId}`;
    }

    private static isCacheValid(cacheKey: string, entity: any): boolean {
        if (!this.cache.has(cacheKey)) return false;

        const lastModified = this.lastModified.get(cacheKey) || 0;
        const entityModified = entity.lastModified || Date.now();

        return lastModified >= entityModified;
    }

    private static updateCache(cacheKey: string, value: number, entity: any): void {
        this.cache.set(cacheKey, value);
        this.lastModified.set(cacheKey, entity.lastModified || Date.now());
    }

    /**
     * 🗑️ 緩存失效管理
     */
    static invalidateCache(entityId: string): void {
        for (const [key] of this.cache) {
            if (key.includes(entityId)) {
                this.cache.delete(key);
                this.lastModified.delete(key);
            }
        }
    }

    static invalidateAttributeCache(entityId: string, attributeId: string): void {
        for (const [key] of this.cache) {
            if (key.includes(entityId) && key.includes(attributeId)) {
                this.cache.delete(key);
                this.lastModified.delete(key);
            }
        }
    }

    /**
     * 🎯 便利方法：常用屬性計算（擴展版）
     */
    static getWeaponDamage(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return this.getFinalAttribute(weapon, 'weapon_damage', { owner });
    }

    static getAttackRange(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return this.getFinalAttribute(weapon, 'attack_range', { owner });
    }

    static getAttackSpeed(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return this.getFinalAttribute(weapon, 'attack_speed', { owner });
    }

    static getCriticalChance(unit: ServerGameUnit): number {
        return this.getFinalAttribute(unit, 'critical_chance');
    }

    static getCriticalDamage(unit: ServerGameUnit): number {
        return this.getFinalAttribute(unit, 'critical_damage');
    }

    // 🆕 Phase 2: 新增的便利方法
    static getLifeSteal(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return this.getFinalAttribute(weapon, 'life_steal', { owner });
    }

    static getProjectileSpeed(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return this.getFinalAttribute(weapon, 'projectile_speed', { owner });
    }

    static getProjectileCount(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return this.getFinalAttribute(weapon, 'additional_projectiles', { owner });
    }

    static getAreaRadius(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return this.getFinalAttribute(weapon, 'area_of_effect', { owner });
    }

    static getChainCount(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return this.getFinalAttribute(weapon, 'chain_count', { owner });
    }

    static getPierceCount(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return this.getFinalAttribute(weapon, 'pierce_count', { owner });
    }

    // 🆕 元素傷害加成
    static getElementalDamageBonus(unit: ServerGameUnit, elementType: string): number {
        return this.getFinalAttribute(unit, `${elementType}_damage`);
    }

    // 🆕 冷卻縮減
    static getCooldownReduction(unit: ServerGameUnit): number {
        return this.getFinalAttribute(unit, 'cooldown_reduction');
    }

    /**
     * 🔧 系統管理
     */
    static initialize(mappingService?: AttributeMappingService): void {
        // 如果提供了服務實例，使用它；否則創建新實例
        this.mappingService = mappingService || new AttributeMappingService();
        console.log('🎯 UnifiedAttributeSystem 已初始化（配置驅動版本）');
    }

    static clearAllCache(): void {
        this.cache.clear();
        this.lastModified.clear();
        console.log('🗑️ 所有屬性緩存已清除');
    }

    static getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

/**
 * 🎯 便利的全局訪問器（擴展版）
 * Phase 2: 加入更多遊戲專用的便利方法
 */
export class Attributes {
    // ==================== 武器屬性 ====================

    /**
     * 快速獲取武器最終傷害
     */
    static weaponDamage(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return UnifiedAttributeSystem.getWeaponDamage(weapon, owner);
    }

    /**
     * 快速獲取攻擊範圍
     */
    static attackRange(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return UnifiedAttributeSystem.getAttackRange(weapon, owner);
    }

    /**
     * 快速獲取攻擊速度（冷卻時間）
     */
    static attackSpeed(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return UnifiedAttributeSystem.getAttackSpeed(weapon, owner);
    }

    // ==================== 暴擊系統 ====================

    /**
     * 快速獲取暴擊率
     */
    static criticalChance(unit: ServerGameUnit): number {
        return UnifiedAttributeSystem.getCriticalChance(unit);
    }

    /**
     * 快速獲取暴擊傷害
     */
    static criticalDamage(unit: ServerGameUnit): number {
        return UnifiedAttributeSystem.getCriticalDamage(unit);
    }

    // ==================== 投射物系統 ====================

    /**
     * 投射物速度
     */
    static projectileSpeed(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return UnifiedAttributeSystem.getProjectileSpeed(weapon, owner);
    }

    /**
     * 額外投射物數量
     */
    static additionalProjectiles(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return UnifiedAttributeSystem.getProjectileCount(weapon, owner);
    }

    // ==================== 範圍效果 ====================

    /**
     * 範圍效果半徑
     */
    static areaRadius(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return UnifiedAttributeSystem.getAreaRadius(weapon, owner);
    }

    // ==================== 連鎖效果 ====================

    /**
     * 連鎖次數
     */
    static chainCount(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return UnifiedAttributeSystem.getChainCount(weapon, owner);
    }

    /**
     * 穿透次數
     */
    static pierceCount(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return UnifiedAttributeSystem.getPierceCount(weapon, owner);
    }

    // ==================== 生存屬性 ====================

    /**
     * 生命偷取
     */
    static lifeSteal(weapon: WeaponBasic, owner?: ServerGameUnit): number {
        return UnifiedAttributeSystem.getLifeSteal(weapon, owner);
    }

    // ==================== 元素傷害 ====================

    /**
     * 元素傷害加成
     */
    static elementalDamage(unit: ServerGameUnit, elementType: 'fire' | 'cold' | 'lightning' | 'chaos' | 'physical'): number {
        return UnifiedAttributeSystem.getElementalDamageBonus(unit, elementType);
    }

    // ==================== 冷卻系統 ====================

    /**
     * 冷卻縮減
     */
    static cooldownReduction(unit: ServerGameUnit): number {
        return UnifiedAttributeSystem.getCooldownReduction(unit);
    }

    // ==================== 通用接口 ====================

    /**
     * 通用屬性獲取
     */
    static get(entity: any, attributeId: string, context?: any): number {
        return UnifiedAttributeSystem.getFinalAttribute(entity, attributeId, context);
    }

    // ==================== 🆕 批量屬性獲取 ====================

    /**
     * 🎯 獲取武器的所有主要屬性（用於UI顯示）
     */
    static getWeaponStats(weapon: WeaponBasic, owner?: ServerGameUnit): {
        damage: number;
        attackSpeed: number;
        attackRange: number;
        critChance: number;
        critDamage: number;
        lifeSteal: number;
    } {
        return {
            damage: this.weaponDamage(weapon, owner),
            attackSpeed: this.attackSpeed(weapon, owner),
            attackRange: this.attackRange(weapon, owner),
            critChance: owner ? this.criticalChance(owner) : 0,
            critDamage: owner ? this.criticalDamage(owner) : 0,
            lifeSteal: this.lifeSteal(weapon, owner),
        };
    }

    /**
     * 🎯 獲取投射物武器的特殊屬性
     */
    static getProjectileStats(weapon: WeaponBasic, owner?: ServerGameUnit): {
        speed: number;
        additionalProjectiles: number;
        pierceCount: number;
        chainCount: number;
        areaRadius: number;
    } {
        return {
            speed: this.projectileSpeed(weapon, owner),
            additionalProjectiles: this.additionalProjectiles(weapon, owner),
            pierceCount: this.pierceCount(weapon, owner),
            chainCount: this.chainCount(weapon, owner),
            areaRadius: this.areaRadius(weapon, owner),
        };
    }

    // ==================== 🆕 調試和監控 ====================

    /**
     * 🔍 調試：顯示屬性計算的詳細過程
     */
    static debug(entity: any, attributeId: string, context?: any): {
        finalValue: number;
        baseValue: number;
        bonuses: any;
        cacheHit: boolean;
    } {
        const cacheKey = (UnifiedAttributeSystem as any).generateCacheKey(entity, attributeId, context);
        const cacheHit = (UnifiedAttributeSystem as any).cache.has(cacheKey);

        // 暫時清除緩存來獲取計算詳情
        if (cacheHit) {
            (UnifiedAttributeSystem as any).cache.delete(cacheKey);
        }

        const finalValue = this.get(entity, attributeId, context);

        return {
            finalValue,
            baseValue: 0, // TODO: 實作詳細分解
            bonuses: {},  // TODO: 實作詳細分解  
            cacheHit,
        };
    }
}