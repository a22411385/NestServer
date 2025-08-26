/**
 * 測試 WaveManager gameFlow 功能
 * 驗證新的遊戲流程架構
 */

const { WaveManager } = require('../Game/Managers/WaveManager');
const { EnemyFactory } = require('../Game/Factories/EnemyFactory');
const { SpawnManager } = require('../Game/Managers/SpawnManager');

// 模擬依賴
const mockGetCurrentUnits = () => [];
const mockCreateEnemyUnit = (config) => {
    console.log(`📦 Created mock enemy: ${config.name} at (${config.x}, ${config.y})`);
    return { id: Math.random().toString(36).substr(2, 9) };
};

async function testWaveManagerFlow() {
    console.log('🧪 Testing WaveManager gameFlow functionality...\n');

    // 創建組件
    const enemyFactory = new EnemyFactory();
    const spawnManager = new SpawnManager();
    const waveManager = new WaveManager(enemyFactory, spawnManager);

    // 設置依賴
    waveManager.setGetCurrentUnitsCallback(mockGetCurrentUnits);
    waveManager.setCreateEnemyUnitCallback(mockCreateEnemyUnit);

    // 配置遊戲流程
    waveManager.setFlowConfig({
        prepareTime: 2,  // 2秒準備時間
        battleTime: 5,   // 5秒戰鬥時間
        restTime: 3,     // 3秒休息時間
        maxWaves: 3      // 測試3波
    });

    // 設置回調
    let gameState = {
        status: '',
        roundTime: 0,
        waveNumber: 0
    };

    waveManager.setCallbacks({
        updateGameCore: (status, roundTime, waveNumber) => {
            gameState.status = status;
            gameState.roundTime = roundTime;
            gameState.waveNumber = waveNumber;
            console.log(`🎮 GameCore Updated: Wave ${waveNumber}, Status: ${status}, Time: ${roundTime}s`);
        },
        broadcastLog: (message, category) => {
            console.log(`📢 [${category || 'INFO'}] ${message}`);
        },
        endGame: (reason) => {
            console.log(`🏁 Game Ended: ${reason}`);
        },
        removeAllEnemies: () => {
            console.log(`🧹 Removing all enemies`);
        }
    });

    // 測試狀態檢查
    console.log('📊 Initial State:');
    console.log(`  Flow State: ${waveManager.getGameFlowState()}`);
    console.log(`  Is Running: ${waveManager.isFlowRunning()}`);
    console.log(`  Current Wave: ${waveManager.getCurrentWaveNumber()}`);
    console.log('');

    // 開始遊戲流程
    console.log('🚀 Starting game flow...\n');

    const flowPromise = waveManager.gameFlow();

    // 監控狀態變化
    const monitor = setInterval(() => {
        const stats = waveManager.getWaveStats();
        console.log(`📈 Stats - Wave: ${stats.currentWave}, State: ${stats.state}, Enemies: ${stats.enemiesAlive}/${stats.enemiesSpawned}`);
    }, 1000);

    try {
        await flowPromise;
        console.log('\n✅ Game flow completed successfully!');
    } catch (error) {
        console.error('\n❌ Game flow failed:', error.message);
    } finally {
        clearInterval(monitor);
    }

    // 最終狀態
    console.log('\n📊 Final State:');
    console.log(`  Flow State: ${waveManager.getGameFlowState()}`);
    console.log(`  Is Running: ${waveManager.isFlowRunning()}`);
    console.log(`  Game State: Wave ${gameState.waveNumber}, Status: ${gameState.status}`);
}

// 運行測試
if (require.main === module) {
    testWaveManagerFlow().catch(console.error);
}

module.exports = { testWaveManagerFlow };
