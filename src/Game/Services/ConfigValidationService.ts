/**
 * 🔍 配置驗證服務
 * 負責驗證各配置表之間的參照完整性
 * 
 * ⚠️ 注意：此服務已過時，需要更新為新的 WeaponMods 系統
 * 
 * 新驗證項目：
 * 1. WeaponMods.affectedStat → WeaponStatConfig.attributeId
 * 2. WeaponConfig.weaponMods → WeaponMods.id
 */

import { ConfigManager } from '../Managers/ConfigManager';
import { WeaponStatConfig } from '@/Types/Equipment/WeaponTypes';
import { WeaponConfigDefinition } from '@/Types/Equipment/WeaponPropertyTypes';
import { WeaponMod } from '@/Types/Equipment/WeaponModTypes';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export class ConfigValidationService {
    /**
     * 🔍 驗證所有配置的完整性
     */
    public static validateAllConfigs(): ValidationResult {
        console.log('🔍 開始驗證配置完整性...\n');

        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // 1. 載入所有配置
        const weaponStatConfigs = ConfigManager.getAll<WeaponStatConfig>('WeaponStatConfigs');
        const weaponMods = ConfigManager.getAll<WeaponMod>('WeaponMods');
        const weaponConfigs = ConfigManager.getAll<WeaponConfigDefinition>('WeaponConfigs');

        console.log('📊 配置統計:');
        console.log(`   - WeaponStatConfigs: ${weaponStatConfigs.length} 個`);
        console.log(`   - WeaponMods: ${weaponMods.length} 個`);
        console.log(`   - WeaponConfigs: ${weaponConfigs.length} 個\n`);

        // 2. 建立 WeaponStatConfig 的有效 attributeId 集合
        const validAttributeIds = new Set(
            weaponStatConfigs
                .filter(config => config.enabled)
                .map(config => config.attributeId)
        );

        console.log(`✅ 有效的屬性 ID (${validAttributeIds.size} 個):`);
        console.log(`   ${Array.from(validAttributeIds).join(', ')}\n`);

        // 3. 驗證 WeaponMods.affectedStat
        this.validateWeaponMods(weaponMods, validAttributeIds, result);

        // 4. 驗證 WeaponConfig 的參照
        this.validateWeaponConfigs(weaponConfigs, weaponMods, result);

        // 6. 輸出驗證結果
        this.printValidationResult(result);

        return result;
    }

    /**
     * 🔍 驗證 WeaponMods.modifiers[].affectedStat 是否參照有效的 WeaponStatConfig
     */
    private static validateWeaponMods(
        mods: WeaponMod[],
        validAttributeIds: Set<string>,
        result: ValidationResult
    ): void {
        console.log('🔍 驗證 WeaponMods.affectedStat...');

        const invalidMods: string[] = [];
        const disabledButInvalid: string[] = [];

        for (const mod of mods) {
            // 檢查 affectedStat（現在是扁平結構）
            if (!mod.affectedStat) {
                result.errors.push(`❌ WeaponMod "${mod.id}" 缺少 affectedStat 欄位`);
                invalidMods.push(mod.id);
                continue;
            }

            // 檢查 affectedStat 是否有效
            if (!validAttributeIds.has(mod.affectedStat)) {
                const errorMsg = `❌ WeaponMod "${mod.id}" 的 affectedStat "${mod.affectedStat}" 不存在於 WeaponStatConfig 中`;

                if (mod.enabled) {
                    result.errors.push(errorMsg);
                    if (!invalidMods.includes(mod.id)) {
                        invalidMods.push(mod.id);
                    }
                } else {
                    result.warnings.push(`⚠️ (已停用) ${errorMsg}`);
                    if (!disabledButInvalid.includes(mod.id)) {
                        disabledButInvalid.push(mod.id);
                    }
                }
            }
        }

        if (invalidMods.length === 0 && disabledButInvalid.length === 0) {
            console.log('   ✅ 所有 WeaponMod 的修改器 affectedStat 都有效\n');
        } else {
            if (invalidMods.length > 0) {
                console.log(`   ❌ 發現 ${invalidMods.length} 個無效的 WeaponMod (已啟用):`);
                console.log(`      ${invalidMods.join(', ')}`);
                result.isValid = false;
            }
            if (disabledButInvalid.length > 0) {
                console.log(`   ⚠️ 發現 ${disabledButInvalid.length} 個無效的 WeaponMod (已停用):`);
                console.log(`      ${disabledButInvalid.join(', ')}`);
            }
            console.log('');
        }
    }

    /**
     * 🔍 驗證 WeaponConfig 的 weaponMods 參照
     */
    private static validateWeaponConfigs(
        weaponConfigs: WeaponConfigDefinition[],
        weaponMods: WeaponMod[],
        result: ValidationResult
    ): void {
        console.log('🔍 驗證 WeaponConfig 參照...');

        // 建立有效的 WeaponMod ID 集合
        const validModIds = new Set(weaponMods.map(m => m.id));

        const invalidWeapons: string[] = [];

        for (const weapon of weaponConfigs) {
            if (!weapon.enabled) continue;

            let hasError = false;

            // ⚠️ 注意：WeaponConfig 可能還有舊欄位 bonuses 和 modifiers
            // 新系統應該使用 weaponMods 欄位

            // 驗證新的 weaponMods 參照
            if (weapon.weaponMods) {
                const modIds = weapon.weaponMods.split(',').map(s => s.trim()).filter(s => s);
                for (const modId of modIds) {
                    if (!validModIds.has(modId)) {
                        result.errors.push(`❌ WeaponConfig "${weapon.id}" 參照了不存在的 WeaponMod "${modId}"`);
                        hasError = true;
                    }
                }
            }

            if (hasError) {
                invalidWeapons.push(weapon.id);
            }
        }

        if (invalidWeapons.length === 0) {
            console.log('   ✅ 所有 WeaponConfig 的參照都有效\n');
        } else {
            console.log(`   ❌ 發現 ${invalidWeapons.length} 個有參照錯誤的 WeaponConfig:`);
            console.log(`      ${invalidWeapons.join(', ')}\n`);
            result.isValid = false;
        }
    }

    /**
     * 📊 輸出驗證結果摘要
     */
    private static printValidationResult(result: ValidationResult): void {
        console.log('═'.repeat(60));
        console.log('📊 驗證結果摘要');
        console.log('═'.repeat(60));

        if (result.isValid) {
            console.log('✅ 配置驗證通過！所有參照都有效。');
        } else {
            console.log(`❌ 配置驗證失敗！發現 ${result.errors.length} 個錯誤。`);
        }

        if (result.warnings.length > 0) {
            console.log(`⚠️  有 ${result.warnings.length} 個警告（已停用的配置）。`);
        }

        console.log('═'.repeat(60));

        // 詳細錯誤列表
        if (result.errors.length > 0) {
            console.log('\n❌ 錯誤列表:');
            result.errors.forEach(error => console.log(`   ${error}`));
        }

        // 詳細警告列表
        if (result.warnings.length > 0) {
            console.log('\n⚠️  警告列表:');
            result.warnings.forEach(warning => console.log(`   ${warning}`));
        }

        console.log('');
    }

    /**
     * 🔍 單獨驗證 WeaponMods 配置
     * (用於快速檢查特定配置表)
     */
    public static validateWeaponModsConfig(): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        const weaponStatConfigs = ConfigManager.getAll<WeaponStatConfig>('WeaponStatConfigs');
        const weaponMods = ConfigManager.getAll<WeaponMod>('WeaponMods');

        const validAttributeIds = new Set(
            weaponStatConfigs
                .filter(config => config.enabled)
                .map(config => config.attributeId)
        );

        this.validateWeaponMods(weaponMods, validAttributeIds, result);

        return result;
    }
}
