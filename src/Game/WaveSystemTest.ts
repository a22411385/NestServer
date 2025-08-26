/**
 * 敵人生成系統測試腳本
 * 使用方法：在遊戲中發送消息來測試波次系統
 */

// 測試命令範例：

/*
1. 開始第一波：
   client.send("start_wave", { waveNumber: 1 })

2. 查看波次狀態：
   client.send("wave_status")

3. 開始指定波次（Boss 波次）：
   client.send("start_wave", { waveNumber: 5 })

4. 自動開始下一波：
   client.send("start_wave")
*/

export const WaveSystemTestCommands = {
    // 測試普通波次
    testNormalWave: {
        type: "start_wave",
        data: { waveNumber: 1 }
    },

    // 測試Boss波次
    testBossWave: {
        type: "start_wave",
        data: { waveNumber: 5 }
    },

    // 查看波次狀態
    getWaveStatus: {
        type: "wave_status",
        data: {}
    },

    // 測試高等級波次
    testHighLevelWave: {
        type: "start_wave",
        data: { waveNumber: 15 }
    }
};

/**
 * 波次系統功能說明：
 * 
 * 🏭 敵人工廠 (EnemyFactory)：
 * - 創建4種類型的敵人：普通、快速、強壯、Boss殭屍
 * - 根據波次自動調整敵人屬性（血量、攻擊力、大小）
 * - 每波敵人都會比前一波更強（15%血量增長，10%攻擊力增長）
 * 
 * 🎯 生成位置管理 (SpawnManager)：
 * - 智能生成位置選擇，避免與玩家和其他敵人重疊
 * - 支援多種生成模式：隨機邊緣、圓形陣型、角落、Boss中心
 * - 自動驗證生成位置的有效性
 * 
 * 🌊 波次管理 (WaveManager)：
 * - 完整的波次生命週期：準備→生成→戰鬥→完成
 * - 每5波一次Boss戰
 * - 敵人數量隨波次遞增（3-15個）
 * - 自動分發波次獎勵
 * 
 * 🎮 遊戲整合：
 * - 與現有BattleSystem完全整合
 * - 自動處理敵人死亡和波次完成檢測
 * - 實時波次狀態追蹤和事件廣播
 */

console.log("🧟‍♀️ 敵人生成系統已就緒！");
console.log("📝 測試命令：", WaveSystemTestCommands);
console.log("🎯 系統特色：智能生成位置、動態敵人屬性、完整波次管理");
