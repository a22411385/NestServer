import { initializeTalentSystem } from '../../Services/TalentService';
import { initializeTalentManager } from '../../Managers/TalentManager';
import { initializePropertyCalculationService } from '../../Services/PropertyCalculationService';
import { GoogleSheetCache } from '../../../Tasks/GoogleSheetCache';

/**
 * 天賦系統初始化器
 * 在伺服器啟動時初始化天賦相關的所有服務
 */
export class TalentSystemInitializer {
    private static isInitialized = false;

    /**
     * 初始化天賦系統
     */
    public static async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.log('天賦系統已初始化，跳過重複初始化');
            return;
        }

        try {
            console.log('🌟 開始初始化天賦系統...');

            // 1. 確保 Google Sheets 資料已載入
            console.log('📊 初始化 Google Sheets 快取...');
            await GoogleSheetCache.getInstance().init();

            // 2. 初始化天賦服務
            console.log('🎯 初始化天賦服務...');
            await initializeTalentSystem();

            // 3. 初始化天賦管理器
            console.log('👤 初始化天賦管理器...');
            await initializeTalentManager();

            // 4. 初始化屬性計算服務
            console.log('🧮 初始化屬性計算服務...');
            await initializePropertyCalculationService();

            this.isInitialized = true;
            console.log('✅ 天賦系統初始化完成！');

        } catch (error) {
            console.error('❌ 天賦系統初始化失敗:', error);
            throw error;
        }
    }

    /**
     * 檢查天賦系統是否已初始化
     */
    public static isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * 獲取系統狀態
     */
    public static getStatus(): any {
        if (!this.isInitialized) {
            return {
                initialized: false,
                message: '天賦系統尚未初始化'
            };
        }

        try {
            // 可以添加更多狀態檢查
            return {
                initialized: true,
                message: '天賦系統運行正常',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                initialized: false,
                message: '天賦系統異常',
                error: error.message
            };
        }
    }
}
