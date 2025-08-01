# Colyseus 整合測試指引

## 啟動順序

### 1. 啟動後端服務
```bash
cd f:\RPGWork\NestServer
npm run start:dev
```
這將同時啟動：
- NestJS HTTP API (port 3000)
- Colyseus WebSocket 伺服器 (port 3001)

### 2. 啟動前端
```bash
cd f:\RPGWork\ViteRPG
npm run dev
```

## 測試流程

### 基礎測試
```bash
# 在 NestServer 資料夾中執行
npm run test:colyseus  # 測試 Colyseus 整合
npm run test:flow      # 測試完整流程
```

### 手動測試步驟

1. **檢查伺服器狀態**
   - 訪問：http://localhost:3000/api/game/status
   - 應該返回伺服器統計資料

2. **檢查房間列表**
   - 訪問：http://localhost:3000/api/game/rooms
   - 應該返回目前房間列表

3. **Colyseus Monitor**
   - 訪問：http://localhost:3001/colyseus
   - 查看即時房間狀態

4. **前端測試**
   - 訪問：http://localhost:5173
   - 登入系統
   - 測試創建/加入房間功能

## API 端點

### NestJS HTTP API (port 3000)
- `GET /api/game/status` - 取得伺服器狀態
- `GET /api/game/rooms` - 取得房間列表
- `POST /api/game/rooms` - 創建新房間
- `POST /api/game/rooms/:roomId/join` - 加入房間
- `POST /api/game/rooms/quick-join` - 快速加入

### Colyseus WebSocket (port 3001)
- `lobby` - 大廳房間
- `game_room` - 遊戲房間

## 架構說明

### HTTP API 職責 (NestJS)
- 房間列表查詢
- 房間元數據管理
- 伺服器狀態監控
- 用戶認證相關

### WebSocket 職責 (Colyseus)
- 即時遊戲狀態同步
- 玩家移動/行動
- 房間內即時通信
- 遊戲邏輯處理

## 故障排除

### 常見問題
1. **Port 衝突**：確保 3000, 3001, 5173 port 未被占用
2. **CORS 錯誤**：檢查 Colyseus CORS 設定
3. **連接失敗**：確認防火牆設定

### 日誌位置
- NestJS 日誌：控制台輸出
- Colyseus 日誌：控制台輸出
- 前端日誌：瀏覽器開發者工具

## 下一步擴展

1. **資料庫整合**：玩家房間記錄
2. **認證系統**：JWT token 驗證
3. **遊戲邏輯**：戰鬥系統實作
4. **部署準備**：環境變數配置
