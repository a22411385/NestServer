/**
 * 敵人群體行為測試 - 驗證相互干擾修復
 * 模擬多個敵人同時追擊同一目標的情況
 */

const { ServerEnemy } = require('../Colyseus/Schema/Unit/Enemy');
const { EnemyCoordinationSystem } = require('../Colyseus/Systems/EnemyCoordinationSystem');

// 模擬測試環境
function createMockHero(x, y) {
    return {
        id: 'hero-1',
        position: { x, y },
        hp: 100,
        isDead: false,
        type: 'hero',
        collisionWidth: 32,
        collisionHeight: 32
    };
}

function createMockEnemy(id, x, y) {
    const enemy = new ServerEnemy();
    enemy.id = id;
    enemy.position.x = x;
    enemy.position.y = y;
    enemy.isDead = false;

    // 模擬必要的方法
    enemy.getScaledCollisionWidth = () => 32;
    enemy.getScaledCollisionHeight = () => 32;

    return enemy;
}

async function testEnemyCoordination() {
    console.log('🧪 Testing Enemy Coordination System...\n');

    // 創建測試場景：3個敵人圍攻1個英雄
    const hero = createMockHero(400, 300);
    const enemies = [
        createMockEnemy('enemy-1', 350, 250), // 左上
        createMockEnemy('enemy-2', 450, 250), // 右上
        createMockEnemy('enemy-3', 400, 200)  // 正上方 - 最可能發生衝突
    ];

    // 初始化協調系統
    const coordination = EnemyCoordinationSystem.getInstance();

    console.log('📊 Initial Positions:');
    enemies.forEach(enemy => {
        console.log(`  ${enemy.id}: (${enemy.position.x}, ${enemy.position.y})`);
    });
    console.log(`  Hero: (${hero.position.x}, ${hero.position.y})\n`);

    // 測試群體優先級和分離力
    console.log('🎲 Group Priorities:');
    enemies.forEach(enemy => {
        console.log(`  ${enemy.id}: ${enemy.groupPriority.toFixed(3)}`);
    });
    console.log('');

    // 模擬多次AI更新，觀察行為
    console.log('🚶 Simulating AI Updates...\n');

    for (let step = 0; step < 10; step++) {
        console.log(`--- Step ${step + 1} ---`);

        // 執行群體協調
        coordination.coordinateEnemyMovement(enemies);

        // 模擬每個敵人的AI決策
        enemies.forEach(enemy => {
            // 計算分離力
            const separationForce = enemy.calculateSeparationForce ?
                enemy.calculateSeparationForce(enemies) : { x: 0, y: 0 };

            // 計算到英雄的方向
            const dx = hero.position.x - enemy.position.x;
            const dy = hero.position.y - enemy.position.y;
            const distance = Math.hypot(dx, dy);

            const chaseDirection = {
                x: dx / distance,
                y: dy / distance
            };

            // 結合追擊和分離力
            const finalDirection = {
                x: chaseDirection.x + separationForce.x,
                y: chaseDirection.y + separationForce.y
            };

            // 模擬移動（簡化版本）
            const moveSpeed = 20;
            enemy.position.x += finalDirection.x * moveSpeed * 0.1;
            enemy.position.y += finalDirection.y * moveSpeed * 0.1;

            // 檢測是否卡住
            const stuck = enemy.handleStuckDetection ? enemy.handleStuckDetection() : false;

            console.log(`  ${enemy.id}: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)}) ${stuck ? '🚫 STUCK' : ''}`);
        });

        // 檢查敵人間距離
        let minDistance = Infinity;
        for (let i = 0; i < enemies.length; i++) {
            for (let j = i + 1; j < enemies.length; j++) {
                const dist = Math.hypot(
                    enemies[j].position.x - enemies[i].position.x,
                    enemies[j].position.y - enemies[i].position.y
                );
                if (dist < minDistance) {
                    minDistance = dist;
                }
            }
        }

        console.log(`  Min Enemy Distance: ${minDistance.toFixed(1)}`);

        // 如果敵人太接近，顯示警告
        if (minDistance < 30) {
            console.log('  ⚠️  Enemies too close - coordination needed');
        }

        console.log('');

        // 模擬時間間隔
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 獲取最終統計
    const finalStats = coordination.getCoordinationStats(enemies);
    console.log('📈 Final Coordination Stats:');
    console.log(`  Total Enemies: ${finalStats.totalEnemies}`);
    console.log(`  Groups Formed: ${finalStats.groupsCount}`);
    console.log(`  Largest Group: ${finalStats.largestGroup}`);
    console.log(`  Average Group Size: ${finalStats.averageGroupSize.toFixed(2)}`);

    console.log('\n✅ Test completed! Check if enemies maintained proper spacing while pursuing the hero.');
}

// 運行測試
if (require.main === module) {
    testEnemyCoordination().catch(console.error);
}

module.exports = { testEnemyCoordination };
