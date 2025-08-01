# RPG Multiplayer Game - Survivors

這是一個使用 Vue + NestJS 建構的多人連線 RPG 遊戲。前端透過 Vite 建構，後端使用 WebSocket 處理即時戰鬥同步。
前端與server共用部分類型與常數 , 減少重複的程式碼結構宣告。

## 遊戲簡介

這是一個最 1 - 6 人同場的2D RPG遊戲，遊戲機制類似《Vampire Survivors》。
玩家只需要移動一隻角色,角色會間隔做出攻擊,
敵人會不斷生成並且從四面八方接近。

## 架構

- 後端 (NestJS + Colyseus)
    NestJS 遊戲外業務API,例如:登入、創建角色等
    Colyseus 處理房間與遊戲邏輯
- 前端
    Vite + Vue3 + Pinia + Phaser

- 資料庫: MYSQL/TypeORM
- 通訊：WebSocket + REST API
- 語言: typescript

## 遊戲網路同步策略

- 採用 Colyseus 作為房間同步框架，使用狀態同步 (State Sync)
- 會有大量敵方單位移動, 效能考量小兵單位只同步單位開始移動事件, 由前端自行推演單位移動, 每隔時間5秒再做一次伺服器同步
- 玩家位置、攻擊事件、召喚物由 Server 驅動與同步
- 支援斷線重連，遊戲結束前玩家都能回到遊戲

## 專案目錄說明

- `ViteRPG/` 前端程式碼
- `NestServer/` NestJS 後端程式碼
- `ViteRPG/shared` 軟連結至 `NestServer/shared/` 此資料夾與client共用

## 遊戲系統

- 帳號登入 (JWT)
- 創建角色
- 創建/加入房間
- 重連 (到遊戲結束都能重新連線,由Colyseus處理)
- 角色升級系統
- 裝備/裝備強化系統
- 基礎的2D碰撞
- 玩家可能會持有召喚物
- NPC基礎AI

## 遊戲核心玩法

怪物擊殺獲得金幣/經驗,可能掉落寶箱,
玩家本身沒有任何技能升級,透過掉落的裝備獲得不同類型的被動技能,
透過升級裝備來提升被動技能

## 安裝與運行

### 環境需求

- Node.js 18.x 或更高版本
- MySQL 8.0 或更高版本
- npm 或 yarn
