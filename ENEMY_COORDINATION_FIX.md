# 敵人相互干擾修復報告

## 🎯 問題描述
兩個敵人過於接近時，會因為自動巡路與檢測碰撞造成互相影響，導致無止盡的繞路行為，無法朝著目標前進。

## 🔧 解決方案概述

### 1. 群體行為系統 (Group Behavior System)
- **分離力計算**：敵人自動保持適當距離，避免聚集
- **優先級系統**：為每個敵人分配隨機優先級，打破對稱性
- **協調機制**：統一管理相近敵人的行為

### 2. 卡住檢測與處理 (Stuck Detection & Recovery)
- **位置追蹤**：監控敵人移動距離，識別卡住狀態
- **脫困行為**：當檢測到長時間無移動時，執行強制脫困
- **閾值控制**：可調整的卡住檢測靈敏度

### 3. 智能巡路改進 (Improved Pathfinding)
- **多方向嘗試**：當直線路徑被阻擋時，嘗試側向移動
- **死鎖處理**：基於優先級的衝突解決機制
- **動態路徑調整**：結合目標追擊和群體分離的混合移動

## 📁 修改的文件

### Enemy.ts (主要修改)
```typescript
// 新增屬性
- lastMovementAttempt: number
- stuckCounter: number  
- groupPriority: number
- separationRadius: number

// 新增方法
+ calculateSeparationForce()     // 群體分離力計算
+ handleStuckDetection()         // 卡住檢測
+ applyUnstuckBehavior()         // 脫困行為
+ chaseTargetImproved()          // 改進的追蹤邏輯
+ checkCollisionAtPosition()     // 位置碰撞檢測
+ calculateSideMovement()        // 側向移動計算
+ handleDeadlock()               // 死鎖處理
```

### EnemyCoordinationSystem.ts (新增文件)
```typescript
// 群體協調系統
+ coordinateEnemyMovement()      // 敵人群體移動協調
+ groupNearbyEnemies()           // 相近敵人分組
+ coordinateGroup()              // 群體行為協調
+ getCoordinationStats()         // 協調系統統計
```

### BattleSystem.ts (整合修改)
```typescript
// 新增屬性
+ enemyCoordination: EnemyCoordinationSystem

// 修改方法
~ updateEnemyAI()                // 整合群體協調邏輯
+ getEnemyCoordination()         // 獲取協調系統引用
```

### MessageHandler.ts (調試功能)
```typescript
// 新增消息處理
+ "enemy_debug"                  // 敵人行為調試命令
+ enemy_debug_response           // 調試響應數據
```

## 🎮 行為改善

### 原本問題：
- ❌ 敵人聚集在一起
- ❌ 無限循環繞路
- ❌ 互相推擠無法前進
- ❌ 浪費計算資源

### 修復後效果：
- ✅ 敵人保持適當間距
- ✅ 智能側向移動避開阻礙
- ✅ 優先級系統打破死鎖
- ✅ 自動脫困機制
- ✅ 群體協調追擊目標

## 🔧 配置參數

### 可調整參數：
```typescript
separationRadius: 40        // 分離半徑 (像素)
stuckThreshold: 5          // 卡住檢測閾值
coordinationRadius: 60     // 協調範圍
maxCoordinationGroup: 4    // 最大協調群體大小
```

## 🧪 測試驗證

### 測試文件：
1. `test-enemy-coordination.js` - 群體行為測試
2. `test-wave-manager-flow.js` - 波次管理測試

### 測試場景：
- 多敵人圍攻單一目標
- 狹窄通道追擊
- 大規模敵人群體行為
- 長時間卡住情況處理

## 📊 性能影響

### 計算複雜度：
- 分離力計算：O(n²) → 但只在相近敵人間計算
- 協調系統：每幀執行，但有範圍限制
- 卡住檢測：輕量級，僅記錄位置變化

### 優化措施：
- 快取機制減少重複計算
- 範圍限制避免全局計算
- 頻率控制降低更新壓力

## 🎯 使用方式

### 客戶端調試：
```javascript
// 發送調試請求
room.send("enemy_debug");

// 接收調試數據
room.onMessage("enemy_debug_response", (data) => {
    console.log("敵人狀態：", data.enemies);
    console.log("協調統計：", data.coordinationStats);
});
```

### 服務器端配置：
```typescript
// BattleSystem 自動初始化協調系統
const battleSystem = new BattleSystem(room);

// 自動整合到現有 AI 更新循環
battleSystem.updateEnemyAI(deltaTime, currentTime);
```

## 🚀 效果總結

這個解決方案成功解決了敵人相互干擾的問題，讓敵人能夠：

1. **智能協作**：群體保持隊形同時有效追擊目標
2. **避免死鎖**：通過優先級系統和脫困機制解決卡住問題
3. **自然移動**：結合分離力和追擊力的流暢移動
4. **高效性能**：優化的算法確保大量敵人時的良好表現

修復後的敵人AI展現出更自然、更智能的群體行為，大大提升了遊戲體驗！🎮
