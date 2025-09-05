---
mode: agent
---

## 開發環境

- Windows 11
- vscode
- powershell

## 程式框架

- NestJS
- colyseus
- typescript
- phaser + vue + vite + pinia

## 注意事項

使用 "npm run dev" 啟用伺服器

1. 使用Schema自動同步,不須額外處理單位身上資料,當單位狀態改變(例如:血量), UI會透過reactive自動更新。
2. 每個單位的狀態會額外製作一份reactive的數據，監聽SchemaCallbackProxy事件處理至reactive結構。
3. 測試程式碼集中於test-scripts資料夾
4. google sheets作為資料來源，透過WeaponSyncTask更新資料至本地快取。
5. 目前在開發前期,如果系統改版直接調整不需保留舊的方法向下兼容,直接取代或刪除
6. 因中文編碼問題,應避免使用powershell做任何字串操作動作

## 武器系統

1. WeaponData做為介面資訊同步給client
2. 武器邏輯與攻擊計算都在伺服器進行

## 武器屬性系統設計 (第一版大綱)

### 核心概念

**資料來源**: `data/google-sheets-cache.json` 的 WeaponProperties 表  
**屬性類型**: 固定屬性 + 隨機屬性  
**品質系統**: 影響隨機詞綴數量

### 武器品質與隨機詞綴槽

```typescript
export enum WeaponQuality {
  NORMAL = 'normal', // 普通 - 0個隨機詞綴
  MAGIC = 'magic', // 魔法 - 1個隨機詞綴
  RARE = 'rare', // 稀有 - 2個隨機詞綴
  EPIC = 'epic', // 史詩 - 3個隨機詞綴
  LEGENDARY = 'legendary', // 傳奇 - 4個隨機詞綴
}

// 品質對應的隨機詞綴槽數量（固定）
export const QUALITY_RANDOM_SLOTS = {
  [WeaponQuality.NORMAL]: 0,
  [WeaponQuality.MAGIC]: 1,
  [WeaponQuality.RARE]: 2,
  [WeaponQuality.EPIC]: 3,
  [WeaponQuality.LEGENDARY]: 4,
};
```

### 屬性範例

#### 球棒 (baseball_bat)

**固定屬性**:

- key: knockback, value: 50 (擊退力度)
- key: attack_range, value: 100 (攻擊距離)
- key: stun, value: [20, 1] (暈眩: 20%機率1秒)

**隨機屬性池** (isFixed = false):

- key: strength, value: [10, 20] (力量加成範圍)
- key: stamina, value: [10, 20] (體力加成範圍)

#### 火球 (fireball)

**固定屬性**:

- key: attack_range, value: 800 (攻擊距離)
- key: knockback, value: 50 (擊退力度)

**隨機屬性池**:

- key: intelligence, value: [10, 20] (智力加成範圍)
- key: stamina, value: [10, 20] (體力加成範圍)

#### 冰球 (iceball)

**固定屬性**:

- key: attack_range, value: 800 (攻擊距離)
- key: freeze, value: 2 (冰凍2秒)

### Google Sheets 數據格式

#### WeaponConfigs

```json
{
  "id": "baseball_bat",
  "name": "球棒",
  "baseDamage": 10,
  "attackSpeed": 2000,
  "attackRange": 600,
  "enabled": true,
  "weaponClass": "BaseballBat",
  "classModule": "MeleeWeapon",
  "fixedProperties": "knockback,stun",
  "randomProperties": "strength,vitality",
  "description": "一把普通的球棒"
}
```

#### WeaponProperties

```json
[
  {
    "propertyType": "knockback",
    "displayName": "擊退",
    "description": "攻擊時將敵人向後推",
    "valueType": "single",
    "valueMin": 50,
    "valueMax": 50,
    "triggerProbability": 100,
    "stacked": false,
    "category": "combat"
  },
  {
    "propertyType": "stun",
    "displayName": "暈眩",
    "description": "攻擊時有機率造成敵人暈眩",
    "valueType": "composite",
    "valueMin": "10|1",
    "valueMax": "30|3",
    "triggerProbability": 100,
    "stacked": false,
    "category": "status",
    "compositeFormat": "probability|duration"
  },
  {
    "propertyType": "strength",
    "displayName": "力量",
    "description": "增加角色的力量屬性",
    "valueType": "range",
    "valueMin": 5,
    "valueMax": 25,
    "triggerProbability": 100,
    "stacked": true,
    "category": "attribute"
  }
]
```

### 武器屬性系統架構

#### 屬性資料結構

```typescript
/**
 * 武器屬性資料庫條目
 */
export interface WeaponPropertyData {
  // 基礎識別
  propertyType: string; // 屬性類型 ID
  displayName: string; // 顯示名稱
  description: string; // 描述

  // 數值定義
  valueType: 'single' | 'range' | 'composite'; // 值類型
  valueMin: string | number; // 最小值（支援複合值字串）
  valueMax: string | number; // 最大值

  // 觸發設定
  triggerProbability: number; // 觸發機率 (0-100)
  stacked: boolean; // 是否可疊加

  // 分類
  category: 'basic' | 'combat' | 'status' | 'attribute'; // 屬性分類

  // 複合值設定（當 valueType = 'composite' 時）
  compositeFormat?: string; // 複合格式定義
}
```

#### 常用複合格式定義

```typescript
/**
 * 複合屬性格式標準
 * 固定使用管道符號 "|" 作為分隔符
 */
export const COMPOSITE_FORMATS = {
  // 機率 + 持續時間 (暈眩、冰凍、減速等)
  PROBABILITY_DURATION: 'probability|duration',

  // 持續時間 + 每秒傷害 (燃燒、中毒等)
  DURATION_DAMAGE: 'duration|damage',

  // 機率 + 效果強度 (暴擊機率+傷害倍數等)
  PROBABILITY_INTENSITY: 'probability|intensity',

  // 範圍 + 效果值 (範圍攻擊等)
  RANGE_EFFECT: 'range|effect',

  // 機率 + 持續時間 + 效果強度 (複雜狀態效果)
  PROBABILITY_DURATION_INTENSITY: 'probability|duration|intensity',
} as const;

/**
 * 複合格式使用範例:
 *
 * 暈眩效果: "20|2" → 20%機率暈眩2秒
 * 燃燒效果: "3|10" → 燃燒3秒每秒10點傷害
 * 暴擊效果: "15|200" → 15%機率造成200%傷害
 * 範圍攻擊: "150|80" → 150像素範圍造成80%傷害
 * 複雜中毒: "25|5|8" → 25%機率中毒5秒每秒8點傷害
 */
```

#### 屬性分類說明

```typescript
export const PROPERTY_CATEGORIES = {
  basic: '基礎屬性', // 攻擊力、攻擊速度、射程
  combat: '戰鬥效果', // 擊退、穿透、暴擊、連鎖
  status: '狀態效果', // 暈眩、冰凍、燃燒、中毒、減速
  attribute: '角色屬性', // 力量、智力、體力、敏捷
} as const;
```

### 屬性生成流程

1. **從 Google Sheets 載入配置**
   - WeaponProperties: 屬性資料庫（全域共用）
   - WeaponConfigs: 武器配置（引用屬性名稱）

2. **武器實例化時生成屬性**
   - 解析 `fixedProperties` 字串，應用所有固定屬性
   - 根據武器品質確定隨機詞綴槽數量（0-4個）
   - 解析 `randomProperties` 字串，從池中隨機抽取屬性
   - 為每個隨機屬性生成範圍內的隨機值

3. **屬性值處理**
   - 單一值: 直接使用 valueMin 或 valueMax
   - 範圍值: 在 valueMin-valueMax 間隨機
   - 複合值: 解析管道符號分隔的字串，按 compositeFormat 定義處理

### 設計優勢

- ✅ **資料驅動**: 完全基於 Google Sheets 配置，無需程式碼修改
- ✅ **屬性共用**: WeaponProperties 資料庫化，避免重複定義
- ✅ **靈活引用**: WeaponConfigs 透過字串引用屬性，易於配置
- ✅ **複合值標準**: 統一的複合值格式，支援複雜效果
- ✅ **品質固定**: 簡化品質系統，隨機詞綴槽數量固定
- ✅ **分類清晰**: 屬性按功能分類，便於管理和擴展
