/**
 * 武器屬性調試工具
 * 在 NestJS 應用程式中使用
 */

import { WeaponPropertyService } from '../Services/WeaponPropertyService';
import { GoogleSheetCache } from '../../Tasks/GoogleSheetCache';
import { WeaponQuality } from '../../Types/Equipment/WeaponPropertyTypes';

export class WeaponPropertyDebugger {

    /**
     * 調試 fireball 武器屬性生成問題
     */
    public static async debugFireball(): Promise<void> {
        console.log('🔥 開始調試 fireball 武器屬性生成...\n');

        try {
            const service = WeaponPropertyService.getInstance();
            const cachedData = GoogleSheetCache.getInstance().getData();

            // 1. 檢查 fireball 配置
            console.log('1️⃣ 檢查 fireball 配置...');
            if (cachedData && cachedData.WeaponConfigs) {
                const fireballConfig = cachedData.WeaponConfigs.find(config => config.id === 'fireball');
                if (fireballConfig) {
                    console.log('✅ 找到 fireball 配置:', fireballConfig);

                    // 2. 檢查固定屬性配置
                    if (fireballConfig.fixedProperties) {
                        console.log('\n2️⃣ 檢查固定屬性...');
                        const fixedProps = fireballConfig.fixedProperties.split(',');

                        for (const propType of fixedProps) {
                            const trimmedProp = propType.trim();
                            const propDef = service.getPropertyDefinition(trimmedProp);

                            console.log(`🔧 屬性 "${trimmedProp}":`);
                            if (propDef) {
                                console.log(`   - valueType: ${propDef.valueType}`);
                                console.log(`   - valueMin: ${propDef.valueMin} (${typeof propDef.valueMin})`);
                                console.log(`   - valueMax: ${propDef.valueMax} (${typeof propDef.valueMax})`);
                                console.log(`   - displayName: ${propDef.displayName}`);
                            } else {
                                console.log('   ❌ 屬性定義不存在');
                            }
                        }
                    }

                    // 3. 嘗試生成屬性
                    console.log('\n3️⃣ 嘗試生成屬性...');
                    try {
                        const properties = service.generateWeaponProperties(
                            'fireball',
                            WeaponQuality.NORMAL,
                            12345
                        );

                        console.log('✅ 成功生成屬性:');
                        properties.forEach(prop => {
                            console.log(`   - ${prop.type}: ${prop.value}`);
                        });

                    } catch (error) {
                        console.error('❌ 生成屬性時發生錯誤:', error);
                        console.error('Stack trace:', error.stack);
                    }

                } else {
                    console.log('❌ 找不到 fireball 配置');

                    // 列出所有可用的武器配置
                    console.log('\n可用的武器配置:');
                    cachedData.WeaponConfigs.forEach(config => {
                        console.log(`  - ${config.id}: ${config.name}`);
                    });
                }
            } else {
                console.log('❌ 無法獲取快取資料');
            }

        } catch (error) {
            console.error('❌ 調試過程中發生錯誤:', error);
        }
    }

    /**
     * 列出所有屬性定義的摘要
     */
    public static async listPropertyDefinitions(): Promise<void> {
        console.log('📋 列出所有屬性定義...\n');

        try {
            const cachedData = GoogleSheetCache.getInstance().getData();

            if (cachedData && cachedData.WeaponProperties) {
                console.log(`總共 ${cachedData.WeaponProperties.length} 個屬性定義:\n`);

                // 按 valueType 分組
                const byValueType: { [key: string]: any[] } = {};
                cachedData.WeaponProperties.forEach((prop: any) => {
                    const type = prop.valueType || 'unknown';
                    if (!byValueType[type]) {
                        byValueType[type] = [];
                    }
                    byValueType[type].push(prop);
                });

                for (const [valueType, props] of Object.entries(byValueType)) {
                    console.log(`📂 ${valueType} (${props.length} 個):`);

                    (props as any[]).forEach((prop: any) => {
                        console.log(`   - ${prop.propertyType}: ${prop.valueMin} → ${prop.valueMax}`);
                    });
                    console.log('');
                }

            } else {
                console.log('❌ 無法獲取屬性定義');
            }

        } catch (error) {
            console.error('❌ 列出屬性定義時發生錯誤:', error);
        }
    }

    /**
     * 測試特定屬性的值生成
     */
    public static async testPropertyGeneration(propertyType: string): Promise<void> {
        console.log(`🧪 測試屬性 "${propertyType}" 的值生成...\n`);

        try {
            const service = WeaponPropertyService.getInstance();
            const propDef = service.getPropertyDefinition(propertyType);

            if (!propDef) {
                console.log(`❌ 屬性 "${propertyType}" 不存在`);
                return;
            }

            console.log('屬性定義:', propDef);

            // 使用私有方法需要反射，這裡先跳過具體測試
            console.log('✅ 屬性定義查詢成功');

        } catch (error) {
            console.error('❌ 測試屬性生成時發生錯誤:', error);
        }
    }
}

// 導出用於在控制器中使用
export { WeaponPropertyDebugger as default };
