import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { TagDefinition, WeaponConfigDefinition, StatusEffectDefinition, WeaponModifier, AttributeBonus } from '@/Types/Equipment/WeaponPropertyTypes';
import { MaterialConfigDefinition } from '@/Types/Equipment/MaterialTypes';
import { EnemyConfigDefinition } from '@/Types/Game/EnemyTypes';
import { GoogleCacheData } from '@/Types';
import { TalentConfig, TalentEffect } from '@/Types/Game/TalentTypes';

/**
 * Google Sheets 數據快取模組
 * 
 * 用於緩存從 Google Sheets 獲取的數據，提供高效的數據訪問機制。
 * 
 * @description 此模組負責處理 Google Sheets 數據的下載、轉換和快取功能
 * @example
 * ```typescript
 * const cache = new GoogleSheetCache();
 * await cache.updateCache();
 * const data = cache.getData();
 * ```
 * 
 * @remarks
 * - 數據來源: Google Sheets (URL 從環境變數 GOOGLE_SHEET_URL 獲取)
 * - 主要Tables: [StatusEffectDefinitions, WeaponModifiers, AttributeBonus, WeaponConfigs, TagDefinitions]
 * - 下載格式: XLSX
 * - 輸出格式: JSON
 * - 快取檔案位置: /data/google-sheets-cache.json
 * - 使用 axios 進行 HTTP 請求
 * 
 * @since 1.0.0
 */



export class GoogleSheetCache {
    private readonly cacheFilePath = path.join(process.cwd(), 'data', 'google-sheets-cache.json');
    private cacheData: GoogleCacheData | null = null;
    static instance: GoogleSheetCache | null = null;

    public static getInstance(): GoogleSheetCache {
        if (!GoogleSheetCache.instance) {
            GoogleSheetCache.instance = new GoogleSheetCache();
        }
        return GoogleSheetCache.instance;
    }

    public async init(): Promise<void> {
        const dataDir = path.dirname(this.cacheFilePath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // 檢查本地檔案是否存在，不存在就更新快取
        if (!fs.existsSync(this.cacheFilePath)) {
            console.log('📥 快取檔案不存在，從 Google Sheets 下載...');
            await this.updateCache();
        } else {
            // 🎯 重要：即使檔案存在，也要載入到記憶體
            console.log('📂 載入本地快取檔案到記憶體...');
            this.loadFromFile();

            if (!this.cacheData) {
                console.warn('⚠️ 快取檔案損壞，重新下載...');
                await this.updateCache();
            } else {
                console.log('✅ Google Sheets 快取已載入');
            }
        }
    }

    public async updateCache(): Promise<void> {
        try {
            const sheetUrl = process.env.GOOGLE_SHEET_URL;
            if (!sheetUrl) {
                throw new Error('GOOGLE_SHEET_URL environment variable is not set');
            }

            const response = await axios.get(sheetUrl, {
                responseType: 'arraybuffer'
            });

            const workbook = XLSX.read(response.data, { type: 'buffer' });

            const statusEffectSheet = workbook.Sheets['StatusEffectDefinitions'];
            const weaponModifiersSheet = workbook.Sheets['WeaponModifiers'];        // 🆕 武器詞綴表
            const attributeBonusSheet = workbook.Sheets['AttributeBonus'];          // 🆕 屬性加成表
            const weaponConfigsSheet = workbook.Sheets['WeaponConfigs'];

            const materialConfigsSheet = workbook.Sheets['MaterialConfigs'];
            const enemyConfigsSheet = workbook.Sheets['EnemyConfigs'];
            const talentConfigSheet = workbook.Sheets['Talents'];
            const talentEffectSheet = workbook.Sheets['TalentEffects'];
            const tagDefinitionsSheet = workbook.Sheets['TagDefinitions'];

            if (!statusEffectSheet || !weaponConfigsSheet || !materialConfigsSheet || !enemyConfigsSheet || !talentConfigSheet || !talentEffectSheet) {
                throw new Error('Required sheets not found in the workbook');
            }

            const statusEffects = XLSX.utils.sheet_to_json<StatusEffectDefinition>(statusEffectSheet);
            const weaponModifiers = weaponModifiersSheet ? XLSX.utils.sheet_to_json<WeaponModifier>(weaponModifiersSheet) : [];
            const attributeBonus = attributeBonusSheet ? XLSX.utils.sheet_to_json<AttributeBonus>(attributeBonusSheet) : [];
            const weaponConfigs = XLSX.utils.sheet_to_json<WeaponConfigDefinition>(weaponConfigsSheet);
            const materialConfigs = XLSX.utils.sheet_to_json<MaterialConfigDefinition>(materialConfigsSheet);
            const enemyConfigs = XLSX.utils.sheet_to_json<EnemyConfigDefinition>(enemyConfigsSheet);  // 🆕 讀取敵人配置
            const talentConfigs = XLSX.utils.sheet_to_json<TalentConfig>(talentConfigSheet);
            const talentEffects = XLSX.utils.sheet_to_json<TalentEffect>(talentEffectSheet);
            const tagDefinitions = tagDefinitionsSheet ? XLSX.utils.sheet_to_json<TagDefinition>(tagDefinitionsSheet) : [];

            this.cacheData = {
                TagDefinitions: tagDefinitions,
                StatusEffectDefinitions: statusEffects,
                WeaponModifiers: weaponModifiers,        // 🆕 武器詞綴
                AttributeBonus: attributeBonus,          // 🆕 屬性加成
                WeaponConfigs: weaponConfigs,
                MaterialConfigs: materialConfigs,
                EnemyConfigs: enemyConfigs,  // 🆕 添加到快取數據
                TalentConfigs: talentConfigs,
                TalentEffects: talentEffects,
                lastUpdated: new Date().toISOString()
            };

            fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.cacheData, null, 2));
        } catch (error) {
            throw new Error(`Failed to update cache: ${error.message}`);
        }
    }

    public getData(): GoogleCacheData | null {
        if (!this.cacheData) {
            this.loadFromFile();
        }
        return this.cacheData;
    }

    private loadFromFile(): void {
        try {
            if (fs.existsSync(this.cacheFilePath)) {
                const fileContent = fs.readFileSync(this.cacheFilePath, 'utf-8');
                this.cacheData = JSON.parse(fileContent);
            }
        } catch (error) {
            console.error('Failed to load cache from file:', error);
            this.cacheData = null;
        }
    }

    public getLastUpdated(): string | null {
        const data = this.getData();
        return data?.lastUpdated || null;
    }

    public clearCache(): void {
        this.cacheData = null;
        if (fs.existsSync(this.cacheFilePath)) {
            fs.unlinkSync(this.cacheFilePath);
        }
    }
}