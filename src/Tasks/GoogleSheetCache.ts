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
    sheetName: string;
    /** 快取資料中的鍵名（通常與 sheetName 相同） */
    cacheKey: keyof GoogleCacheData;
    /** 是否為必需表單（預設 false，缺少時只警告不中斷） */
    required?: boolean;
    /** 自訂資料轉換函數（可選） */
    transform?: (data: any[]) => any[];
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
    { sheetName: 'StatusEffectDefinitions', cacheKey: 'StatusEffectDefinitions', required: true },
    { sheetName: 'WeaponConfigs', cacheKey: 'WeaponConfigs', required: true },
    { sheetName: 'MaterialConfigs', cacheKey: 'MaterialConfigs', required: true },
    { sheetName: 'EnemyConfigs', cacheKey: 'EnemyConfigs', required: true },
    { sheetName: 'Talents', cacheKey: 'TalentConfigs', required: true },
    { sheetName: 'TalentEffects', cacheKey: 'TalentEffects', required: true },

    // 擴展配置表（可選）
    { sheetName: 'WeaponModifiers', cacheKey: 'WeaponModifiers' },
    { sheetName: 'AttributeBonus', cacheKey: 'AttributeBonus' },
    { sheetName: 'TagDefinitions', cacheKey: 'TagDefinitions' },
    { sheetName: 'WeaponStatConfigs', cacheKey: 'WeaponStatConfigs' },

    // � 視覺效果配置表
    { sheetName: 'VisualEffectDefinitions', cacheKey: 'VisualEffectDefinitions' },
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

    /**
     * 🎯 更新快取資料（配置驅動版本）
     * ✅ 自動讀取 SHEET_CONFIGS 中定義的所有表單
     * ✅ 支援必需/可選表單
     * ✅ 支援自訂資料轉換
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
                        cacheData[config.cacheKey] = [];
                    }
                    continue;
                }

                // 轉換為 JSON
                let data = XLSX.utils.sheet_to_json(sheet);

                // 應用自訂轉換函數（如果有）
                if (config.transform) {
                    data = config.transform(data);
                }

                // 儲存到快取
                cacheData[config.cacheKey] = data;

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