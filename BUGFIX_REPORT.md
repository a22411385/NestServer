# 🎮 Colyseus 錯誤修復報告

## ✅ 已修復的問題

### 1. Schema 命名衝突
**問題**：`TypeError: Cannot read properties of undefined (reading 'Symbol(Symbol.metadata)')`
**原因**：`LobbyRoom` Schema 類別與 Colyseus Room 類別命名衝突
**解決方案**：
- 將 Schema 類別重命名為 `LobbyRoomInfo`
- 更新所有相關引用和類型定義

### 2. 環境變數配置
**問題**：硬編碼的 API URL (http://localhost:8000)
**解決方案**：
- 在 `.env` 添加 `VITE_API_BASE_URL` 和 `VITE_COLYSEUS_WS_URL`
- 更新 `http.ts` 和 `ColyseusService.ts` 使用環境變數

### 3. 選擇角色流程優化
**問題**：`autoSelect()` 自動進入遊戲，跳過用戶確認
**解決方案**：
- 移除自動進入遊戲邏輯
- 改為手動點擊進入按鈕
- 添加角色驗證和錯誤處理

### 4. Store 架構整合
**問題**：前端 Colyseus 服務管理混亂
**解決方案**：
- 通過 `gameStore` 統一管理 Colyseus 連接
- 簡化 Lobby.vue 的事件處理
- 添加連接狀態管理

## 🔧 環境變數設定

```bash
# .env 檔案
VITE_CDN_PATH="https://pub-4d1ca15d7d8c4cb5b9f8bf0beac47264.r2.dev"
VITE_API_BASE_URL="http://localhost:3000"  # NestJS API
VITE_COLYSEUS_WS_URL="ws://localhost:3001" # Colyseus WebSocket
```

## 🚀 啟動指令

```bash
# 1. 後端服務 (NestJS + Colyseus)
cd f:\RPGWork\NestServer
npm run start:dev

# 2. 前端服務 (Vue + Vite)
cd f:\RPGWork\ViteRPG  
npm run dev
```

## 🧪 測試流程

1. 啟動後端服務 (port 3000 + 3001)
2. 啟動前端服務 (port 5173)
3. 訪問 http://localhost:5173
4. 登入 → 選擇角色 → 進入大廳
5. 測試創建/加入房間功能

## 🔍 除錯端點

- **NestJS API 狀態**：http://localhost:3000/api/game/status
- **Colyseus 監控面板**：http://localhost:3001/colyseus
- **房間列表 API**：http://localhost:3000/api/game/rooms

## 📝 主要程式碼變更

### Schema 重命名
```typescript
// 原本 (衝突)
export class LobbyRoom extends Schema { ... }

// 修正後
export class LobbyRoomInfo extends Schema { ... }
```

### 環境變數使用
```typescript
// 原本 (硬編碼)
u = "http://localhost:8000" + url;

// 修正後
u = import.meta.env.VITE_API_BASE_URL + url;
```

### 選擇角色流程
```typescript
// 原本 (自動進入)
function autoSelect() {
  let id = chars.value[0].id
  roleId.value = id
  enterGame() // ❌ 自動進入
}

// 修正後 (手動確認)
function autoSelect() {
  if (chars.value.length > 0) {
    let id = chars.value[0].id
    roleId.value = id
    // ✅ 讓用戶手動點擊進入按鈕
  }
}
```

## ⚠️ 注意事項

- 確保所有 Schema 類別都有正確的 `@type` 裝飾器
- 玩家必須先選擇角色才能進入大廳
- 大廳會每10秒自動刷新房間列表
- 如果遇到連接問題，檢查防火牆和端口設定
