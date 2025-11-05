import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { GoogleCacheData } from '@/Types';

/**
 * 🎯 Sheet 配置介面
 * 用於描述每個需要下載的 Google Sheets 表單
 */
interface SheetConfig {
    /** Google Sheets 中的表單名稱 */
    sheetName: keyof GoogleCacheData;
    required?: boolean;

}

/**
 * 🎯 Sheet 配置表
 * ✅ 新增表單只需在這裡添加一行配置，無需修改 updateCache() 邏輯
 * 
 * 使用範例：
 * ```typescript
 * // 新增一個可選表單
 * { sheetName: 'VisualEffectDefinitions', cacheKey: 'VisualEffectDefinitions' },
 * 
 * // 新增一個必需表單
 * { sheetName: 'NewTable', cacheKey: 'NewTable', required: true },
 * 
 * // 新增帶資料轉換的表單
 * { 
 *   sheetName: 'CustomTable', 
 *   cacheKey: 'CustomTable',
 *   transform: (data) => data.filter(row => row.enabled) 
 * }
 * ```
 */
const SHEET_CONFIGS: SheetConfig[] = [
    // 核心配置表（必需）
    { sheetName: 'StatusEffectDefinitions', required: true },
    { sheetName: 'WeaponConfigs', required: true },
    { sheetName: 'MaterialConfigs', required: true },
    { sheetName: 'EnemyConfigs', required: true },
    { sheetName: 'Talents', required: true },
    { sheetName: 'TalentEffects', required: true },

    // 擴展配置表（可選）
    { sheetName: 'WeaponMods' },
    { sheetName: 'TagDefinitions' },
    { sheetName: 'WeaponStatConfigs' },

    // � 視覺效果配置表
    { sheetName: 'VisualEffectDefinitions' },
];

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
 * - 配置驅動: 通過 SHEET_CONFIGS 配置表動態讀取所有表單
 * - 下載格式: XLSX
 * - 輸出格式: JSON
 * - 快取檔案位置: /data/google-sheets-cache.json
 * - 使用 axios 進行 HTTP 請求
 * 
 * @since 1.0.0
 * @version 2.0.0 - 重構為配置驅動架構
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
        if (!fs.existsSync(this.cacheFilePath) || process.env.FORCE_UPDATE_CACHE === 'true') {
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

    /**
     * 🎯 標準化布林值欄位
     * 將字串 "TRUE"/"FALSE" 轉換為布林值 true/false
     */
    private normalizeBooleanFields(data: any[]): any[] {
        return data.map(row => {
            const normalizedRow = { ...row };

            // 處理所有可能的布林欄位
            const booleanFields = ['enabled', 'stackable', 'required', 'isActive', 'is_active'];

            for (const field of booleanFields) {
                if (field in normalizedRow) {
                    const value = normalizedRow[field];

                    // 字串 "TRUE" → true
                    if (value === "TRUE" || value === "true") {
                        normalizedRow[field] = true;
                    }
                    // 字串 "FALSE" → false
                    else if (value === "FALSE" || value === "false") {
                        normalizedRow[field] = false;
                    }
                    // 已經是布林值則保持不變
                    // 其他值保持原樣
                }
            }

            return normalizedRow;
        });
    }

    /**
     * 🎯 更新快取資料（配置驅動版本）
     * ✅ 自動讀取 SHEET_CONFIGS 中定義的所有表單
     * ✅ 支援必需/可選表單
     * ✅ 支援自訂資料轉換
     * ✅ 統一處理 enabled 等布林欄位
     * 
     * @throws {Error} 當必需表單缺少時拋出錯誤
     */
    public async updateCache(): Promise<void> {
        try {
            const sheetUrl = process.env.GOOGLE_SHEET_URL;
            if (!sheetUrl) {
                throw new Error('GOOGLE_SHEET_URL environment variable is not set');
            }

            console.log('📥 開始下載 Google Sheets...');
            const response = await axios.get(sheetUrl, {
                responseType: 'arraybuffer'
            });

            const workbook = XLSX.read(response.data, { type: 'buffer' });
            console.log(`📊 成功載入 Workbook，共 ${Object.keys(workbook.Sheets).length} 個表單`);

            // 🎯 初始化快取資料物件
            const cacheData: any = {
                lastUpdated: new Date().toISOString()
            };

            // 🎯 動態讀取所有配置的表單
            const missingRequired: string[] = [];
            const successCount = { required: 0, optional: 0 };

            for (const config of SHEET_CONFIGS) {
                const sheet = workbook.Sheets[config.sheetName];

                // 檢查表單是否存在
                if (!sheet) {
                    if (config.required) {
                        missingRequired.push(config.sheetName);
                        console.error(`❌ 必需表單缺少: ${config.sheetName}`);
                    } else {
                        console.warn(`⚠️ 可選表單缺少: ${config.sheetName}，將使用空陣列`);
                        cacheData[config.sheetName] = [];
                    }
                    continue;
                }

                // 轉換為 JSON
                let data = XLSX.utils.sheet_to_json(sheet);

                // 🎯 統一標準化布林值欄位 (將 "TRUE"/"FALSE" 轉為 true/false)
                data = this.normalizeBooleanFields(data);

                // 🆕 特殊處理：WeaponMods 表需要將拆分欄位組合回 modifiers 陣列
                if (config.sheetName === 'WeaponMods') {
                    data = this.transformWeaponMods(data);
                }

                // 儲存到快取
                cacheData[config.sheetName] = data;

                // 統計
                if (config.required) {
                    successCount.required++;
                } else {
                    successCount.optional++;
                }

                console.log(`✅ ${config.sheetName} → ${data.length} 筆資料`);
            }

            // 檢查是否有缺少的必需表單
            if (missingRequired.length > 0) {
                throw new Error(`Required sheets not found: ${missingRequired.join(', ')}`);
            }

            // 儲存到記憶體和檔案
            this.cacheData = cacheData as GoogleCacheData;
            fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.cacheData, null, 2));

            console.log(`\n🎉 快取更新完成！`);
            console.log(`   - 必需表單: ${successCount.required}/${SHEET_CONFIGS.filter(c => c.required).length}`);
            console.log(`   - 可選表單: ${successCount.optional}/${SHEET_CONFIGS.filter(c => !c.required).length}`);
            console.log(`   - 快取檔案: ${this.cacheFilePath}\n`);
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

    /**
     * 🆕 轉換 WeaponMods 表：扁平結構處理（每個 id 只有一個條目）
     * 
     * ✅ 新的扁平結構：
     * - affectedStat, value, valueType, modifierType 直接在 WeaponMod 上
     * - 不再需要 modifiers 陣列
     * - 不再使用 minValue/maxValue（改用 value）
     * 
     * 🔧 這個函數現在只做簡單的欄位轉換和清理
     */
    private transformWeaponMods(data: any[]): any[] {
        return data.map(row => {
            // 🔧 確保數值類型正確
            if (row.value !== undefined) {
                row.value = Number(row.value) || 0;
            }

            // 🔧 確保布林類型正確
            if (row.enabled !== undefined) {
                row.enabled = row.enabled === 'TRUE' || row.enabled === true;
            }
            if (row.stackable !== undefined) {
                row.stackable = row.stackable === 'TRUE' || row.stackable === true;
            }

            // 🔧 確保數字類型
            if (row.weight !== undefined) {
                row.weight = Number(row.weight) || 0;
            }
            if (row.requiredLevel !== undefined) {
                row.requiredLevel = Number(row.requiredLevel) || 0;
            }

            return row;
        });
    }

    public clearCache(): void {
        this.cacheData = null;
        if (fs.existsSync(this.cacheFilePath)) {
            fs.unlinkSync(this.cacheFilePath);
        }
    }
}