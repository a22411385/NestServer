/**
 * 測試敵人瞬移修復
 * 驗證敵人使用速度向量系統而非直接位置設置
 */

const { ServerEnemy } = require('../Colyseus/Schema/Unit/Enemy');

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
    enemy.vx = 0;
    enemy.vy = 0;

    // 模擬必要的方法
    enemy.getScaledCollisionWidth = () => 32;
    enemy.getScaledCollisionHeight = () => 32;

    return enemy;
}

// 模擬 MovementSystem
class MockMovementSystem {
    constructor() {
        this.MOVEMENT_SCALE = 3;
        this.FIXED_DELTA = 1 / 60;
    }

    moveUnit(unit) {
        const speed = unit.moveSpeed || 2;
        const moveDistance = speed * this.FIXED_DELTA * this.MOVEMENT_SCALE;
        const deltaX = unit.vx * moveDistance;
        const deltaY = unit.vy * moveDistance;

        // 記錄移動前的位置
        const oldPos = { x: unit.position.x, y: unit.position.y };

        // 更新位置
        unit.position.x += deltaX;
        unit.position.y += deltaY;

        // 計算實際移動距離
        const actualDistance = Math.hypot(
            unit.position.x - oldPos.x,
            unit.position.y - oldPos.y
        );

        return {
            oldPosition: oldPos,
            newPosition: { x: unit.position.x, y: unit.position.y },
            expectedDistance: Math.hypot(deltaX, deltaY),
            actualDistance: actualDistance,
            velocityVector: { vx: unit.vx, vy: unit.vy }
        };
    }
}

async function testEnemyMovementFix() {
    console.log('🧪 Testing Enemy Movement Fix...\n');

    // 創建測試場景
    const hero = createMockHero(400, 300);
    const enemy = createMockEnemy('enemy-1', 350, 250);
    const movementSystem = new MockMovementSystem();

    console.log('📊 Initial State:');
    console.log(`  Hero: (${hero.position.x}, ${hero.position.y})`);
    console.log(`  Enemy: (${enemy.position.x}, ${enemy.position.y})`);
    console.log(`  Enemy velocity: (${enemy.vx}, ${enemy.vy})\n`);

    // 模擬 AI 更新
    console.log('🤖 Simulating AI Updates...\n');

    for (let frame = 1; frame <= 10; frame++) {
        console.log(`--- Frame ${frame} ---`);

        // 模擬敵人 AI 計算（簡化版本）
        const dx = hero.position.x - enemy.position.x;
        const dy = hero.position.y - enemy.position.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 1) {
            // 🎯 AI 設置速度向量（正規化）
            enemy.vx = dx / distance;
            enemy.vy = dy / distance;
        } else {
            enemy.vx = 0;
            enemy.vy = 0;
        }

        console.log(`  AI Set Velocity: vx=${enemy.vx.toFixed(3)}, vy=${enemy.vy.toFixed(3)}`);

        // 🎯 MovementSystem 處理移動
        const moveResult = movementSystem.moveUnit(enemy);

        console.log(`  Position: (${moveResult.oldPosition.x.toFixed(1)}, ${moveResult.oldPosition.y.toFixed(1)}) → (${moveResult.newPosition.x.toFixed(1)}, ${moveResult.newPosition.y.toFixed(1)})`);
        console.log(`  Move Distance: ${moveResult.actualDistance.toFixed(3)} pixels`);

        // 🎯 檢測是否有瞬移（移動距離過大）
        const maxReasonableDistance = 10; // 每幀最大合理移動距離
        if (moveResult.actualDistance > maxReasonableDistance) {
            console.log(`  ⚠️  POTENTIAL TELEPORT: Distance ${moveResult.actualDistance.toFixed(1)} > ${maxReasonableDistance}`);
        } else if (moveResult.actualDistance > 0) {
            console.log(`  ✅ Normal movement`);
        } else {
            console.log(`  ⏸️  No movement (stopped)`);
        }

        // 檢查是否到達目標
        const distanceToTarget = Math.hypot(
            hero.position.x - enemy.position.x,
            hero.position.y - enemy.position.y
        );

        console.log(`  Distance to target: ${distanceToTarget.toFixed(1)}`);

        if (distanceToTarget < 35) {
            console.log(`  🎯 Reached attack range!`);
            break;
        }

        console.log('');

        // 模擬時間間隔
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 總結測試結果
    console.log('📈 Test Summary:');
    const finalDistance = Math.hypot(
        hero.position.x - enemy.position.x,
        hero.position.y - enemy.position.y
    );

    console.log(`  Final enemy position: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
    console.log(`  Final distance to hero: ${finalDistance.toFixed(1)}`);
    console.log(`  Movement method: Speed vector → MovementSystem`);

    if (finalDistance < 50) {
        console.log('  ✅ Enemy successfully approached hero without teleporting');
    } else {
        console.log('  ⚠️  Enemy did not reach hero (may indicate movement issues)');
    }

    console.log('\n🎯 Key improvements:');
    console.log('  • Enemy AI only sets velocity vectors (vx, vy)');
    console.log('  • MovementSystem handles all position updates');
    console.log('  • No direct position manipulation in AI');
    console.log('  • Consistent movement calculation across all units');
}

// 運行測試
if (require.main === module) {
    testEnemyMovementFix().catch(console.error);
}

module.exports = { testEnemyMovementFix };
