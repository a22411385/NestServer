# 🏗️ Colyseus Schema 同步架構重構報告

## 📋 重構目標

將 Colyseus 客戶端與伺服器的資料更新改為完全使用 Schema 同步模式，並重新整理 Lobby UI 的資料來源架構。

## 🔧 架構變更

### 1. 後端 (NestServer)

#### Schema 純化
- **LobbyState.ts**: 僅包含純淨的 Schema 類別，移除所有業務邏輯方法
- **LobbyRoomInfo.ts**: 純 Schema 資料結構
- **LobbyPlayer.ts**: 純 Schema 資料結構

#### 業務邏輯集中化
- **LobbyRoom.ts**: 所有大廳業務邏輯集中在此處理
  - 玩家加入/離開邏輯
  - 房間創建/加入/快速加入
  - 房間監控和狀態更新
  - 資料驗證和錯誤處理

### 2. 前端 (ViteRPG)

#### Store 架構 (useLobbyStore)
```typescript
state: {
  // === Colyseus Schema 同步資料 ===
  lobbyState: LobbyState | null,
  
  // === UI 狀態 ===
  playerName: string,
  isConnecting: boolean,
  isCreatingRoom: boolean,
  // ... 其他 UI 狀態
}

getters: {
  // 從 Schema 中自動計算
  totalPlayers: () => lobbyState.players.size,
  totalRooms: () => lobbyState.totalRooms,
  availableRooms: () => // 從 lobbyState.rooms 過濾
}
```

#### Service 層 (ColyseusLobbyService)
```typescript
// 主要同步機制
this.lobbyRoom.onStateChange((state) => {
  lobbyStore.setLobbyState(state);  // 直接更新整個狀態
});

// 輔助訊息處理
this.lobbyRoom.onMessage("roomCreated", ...);
this.lobbyRoom.onMessage("error", ...);
```

## 🎯 資料流向

### 狀態同步流程
1. **伺服器端**: LobbyRoom 更新 LobbyState Schema
2. **網路傳輸**: Colyseus 自動同步 Schema 變更
3. **客戶端**: onStateChange 觸發
4. **Store 更新**: lobbyStore.setLobbyState(state)
5. **UI 響應**: Vue 組件自動更新 (透過 getter)

### 指令處理流程
1. **UI 觸發**: 用戶點擊按鈕
2. **Store Action**: 呼叫 lobbyStore 方法
3. **Service 調用**: 呼叫 ColyseusLobbyService
4. **伺服器訊息**: 發送到 LobbyRoom
5. **業務處理**: LobbyRoom 處理邏輯
6. **狀態更新**: 更新 Schema → 自動同步回客戶端

## 📊 架構優勢

### 1. 資料一致性

- ✅ 單一真實資料源 (LobbyState Schema)
- ✅ 自動同步，無需手動管理狀態
- ✅ 避免客戶端與伺服器資料不一致

### 2. 程式碼組織

- ✅ Schema 與業務邏輯分離
- ✅ 前端 Store 邏輯清晰
- ✅ 後端業務邏輯集中在 LobbyRoom

### 3. 性能優化

- ✅ Colyseus 智能差異同步
- ✅ 前端計算屬性自動緩存
- ✅ 減少不必要的網路請求

### 4. 可維護性

- ✅ 清晰的資料流向
- ✅ 類型安全的 TypeScript
- ✅ 統一的錯誤處理

## 🔄 使用方式

### 前端組件中使用

```vue
<script setup>
import { useLobbyStore } from '@/stores/lobby'

const lobbyStore = useLobbyStore()

// 自動響應的數據
const rooms = computed(() => lobbyStore.availableRooms)
const stats = computed(() => lobbyStore.lobbyStats)
</script>

<template>
  <div>
    <p>總房間數: {{ stats.totalRooms }}</p>
    <p>線上人數: {{ stats.totalPlayers }}</p>
    
    <div v-for="room in rooms" :key="room.roomId">
      {{ room.roomName }} ({{ room.currentPlayers }}/{{ room.maxPlayers }})
    </div>
  </div>
</template>
```

### 操作流程

```typescript
// 初始化連接
await lobbyStore.initializeLobby()

// 創建房間 (會自動同步到所有客戶端)
await gameRoomStore.createRoom({
  roomName: "我的房間",
  maxPlayers: 4
})

// 加入房間
await gameRoomStore.joinRoom(roomId)
```

## ⚡ 關鍵特性

- **即時同步**: 所有客戶端自動同步最新狀態
- **類型安全**: 完整的 TypeScript 支援
- **自動計算**: Vue computed 屬性自動更新 UI
- **錯誤處理**: 統一的錯誤訊息機制
- **狀態管理**: 清晰的 UI 狀態與業務狀態分離

## 🧪 測試驗證

### 1. 基本功能測試

```bash
# 啟動服務
cd f:\RPGWork\NestServer
npm run start:dev

cd f:\RPGWork\ViteRPG  
npm run dev
```

### 2. Schema 同步測試

1. **多客戶端測試**: 開啟多個瀏覽器分頁
2. **房間操作**: A 創建房間，B 立即看到
3. **玩家計數**: 玩家進出即時更新
4. **狀態變化**: 房間狀態即時同步

### 3. 監控工具

- **Colyseus Monitor**: http://localhost:3001/colyseus
- **瀏覽器 DevTools**: 查看 WebSocket 訊息
- **Console 日誌**: Schema 同步日誌

---

*這個架構確保了 Colyseus Schema 的優勢得到充分發揮，同時保持程式碼的清晰性和可維護性。*

---

**重構完成**: LobbyUI 現在完全使用 Colyseus Schema 同步模式，提供即時、一致的用戶體驗！ 🎉
