/**
 * GameCore 與 WaveManager 狀態同步檢查工具
 */

export class GameStateSync {

    /**
     * 檢查 GameCore 與 WaveManager 狀態是否同步
     */
    public static checkSync(gameCore: any, waveManager: any): void {
        console.log("🔄 === GameCore 與 WaveManager 狀態同步檢查 ===");

        // GameCore 狀態
        console.log("📊 GameCore 狀態:");
        console.log(`  波次編號: ${gameCore.waveNumber}`);
        console.log(`  遊戲階段: ${gameCore.status}`); // prepare, battle, rest
        console.log(`  倒數時間: ${gameCore.roundTime}秒`);
        console.log(`  存活英雄: ${gameCore.aliveHeroes}`);

        // WaveManager 狀態
        const waveStats = waveManager.getWaveStats();
        console.log("🌊 WaveManager 狀態:");
        console.log(`  當前波次: ${waveStats.currentWave}`);
        console.log(`  波次狀態: ${waveStats.state}`); // preparing, spawning, active, completed, failed
        console.log(`  已生成敵人: ${waveStats.enemiesSpawned}`);
        console.log(`  存活敵人: ${waveStats.enemiesAlive}`);
        console.log(`  持續時間: ${(waveStats.duration / 1000).toFixed(1)}秒`);

        // 同步性檢查
        console.log("🔍 同步性分析:");

        // 波次編號一致性
        if (gameCore.waveNumber === waveStats.currentWave) {
            console.log("  ✅ 波次編號同步");
        } else {
            console.log(`  ❌ 波次編號不同步: GameCore(${gameCore.waveNumber}) vs WaveManager(${waveStats.currentWave})`);
        }

        // 階段狀態映射檢查
        const stageMapping = this.getStageMapping(gameCore.status, waveStats.state);
        if (stageMapping.synced) {
            console.log("  ✅ 階段狀態同步");
        } else {
            console.log(`  ⚠️ 階段狀態: GameCore(${gameCore.status}) vs WaveManager(${waveStats.state}) - ${stageMapping.reason}`);
        }

        // 時間同步檢查
        this.checkTimeSync(gameCore, waveStats);

        console.log("=== 檢查完成 ===");
    }

    /**
     * 獲取階段映射關係
     */
    private static getStageMapping(gameStage: string, waveState: string): { synced: boolean; reason: string } {
        const mappings: Record<string, string[]> = {
            'prepare': ['preparing', 'completed'], // 準備階段對應波次準備或已完成
            'battle': ['spawning', 'active'],      // 戰鬥階段對應敵人生成或激活
            'rest': ['completed', 'preparing']     // 休息階段對應波次完成或準備中
        };

        const expectedStates = mappings[gameStage] || [];
        const synced = expectedStates.includes(waveState);

        return {
            synced,
            reason: synced ? '狀態匹配' : `預期 ${expectedStates.join('/')}，實際 ${waveState}`
        };
    }

    /**
     * 檢查時間同步
     */
    private static checkTimeSync(gameCore: any, waveStats: any): void {
        if (gameCore.status === 'battle' && (waveStats.state === 'spawning' || waveStats.state === 'active')) {
            console.log("  ✅ 戰鬥階段時間同步");
            console.log(`    剩餘時間: ${gameCore.roundTime}秒`);
            console.log(`    波次持續: ${(waveStats.duration / 1000).toFixed(1)}秒`);
        }
    }

    /**
     * 生成狀態報告
     */
    public static generateReport(gameCore: any, waveManager: any): any {
        const waveStats = waveManager.getWaveStats();

        return {
            timestamp: new Date().toISOString(),
            gameCore: {
                wave: gameCore.waveNumber,
                stage: gameCore.status,
                timeRemaining: gameCore.roundTime,
                aliveHeroes: gameCore.aliveHeroes
            },
            waveManager: {
                wave: waveStats.currentWave,
                state: waveStats.state,
                enemiesSpawned: waveStats.enemiesSpawned,
                enemiesAlive: waveStats.enemiesAlive,
                duration: waveStats.duration
            },
            sync: {
                waveNumberMatch: gameCore.waveNumber === waveStats.currentWave,
                stageStateMatch: this.getStageMapping(gameCore.status, waveStats.state).synced
            }
        };
    }
}

/**
 * RoundTimeSetting 配置說明和最佳實踐
 */
export const GameFlowGuide = {
    /**
     * 當前時間設置
     */
    currentSettings: {
        prepare: 3,  // 準備時間 3秒
        battle: 30,  // 戰鬥時間 30秒
        rest: 10     // 休息時間 10秒
    },

    /**
     * 建議的 WaveManager 配置
     */
    waveManagerConfig: {
        // 敵人生成間隔 = 戰鬥時間 / (敵人數量 + 2)
        // 例如：30秒 / (5個敵人 + 2) = 約4.3秒間隔
        spawnIntervalFormula: "battleTime / (enemyCount + 2)",

        // Boss 波次立即生成所有敵人
        bossWaveSpawnInterval: 0,

        // 超時時間 = 戰鬥時間 + 5秒緩衝
        timeoutBuffer: 5
    },

    /**
     * 最佳實踐
     */
    bestPractices: [
        "1. GameManager 控制整體時序，WaveManager 負責敵人邏輯",
        "2. 準備階段：WaveManager 進入 PREPARING 狀態",
        "3. 戰鬥階段：WaveManager 立即開始生成敵人 (startWaveImmediate)",
        "4. 休息階段：WaveManager 強制結束當前波次",
        "5. 使用事件系統同步狀態變化",
        "6. 定期檢查狀態同步性"
    ]
};

console.log("📋 GameCore-WaveManager 同步工具已載入");
console.log("💡 使用方法: GameStateSync.checkSync(gameCore, waveManager)");
