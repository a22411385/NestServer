# 🔍 StatusEffectDefinitions 設計分析報告

> **重命名完成**: `WeaponProperties` → `StatusEffectDefinitions`  
> **日期**: 2025-11-01  
> **目的**: 分析目前狀態效果定義的合理性，識別設計問題並提供改進建議

---

## 📋 目錄

- [重命名總結](#重命名總結)
- [目前定義清單](#目前定義清單)
- [問題分析](#問題分析)
- [改進建議](#改進建議)
- [行動計劃](#行動計劃)

---

## 重命名總結

### ✅ 已完成的更改

| 項目 | 舊名稱 | 新名稱 |
|------|--------|--------|
| **介面** | `WeaponPropertyDefinition` | `StatusEffectDefinition` |
| **Google Sheets 表** | `WeaponProperties` | `StatusEffectDefinitions` |
| **快取欄位** | `GoogleCacheData.WeaponProperties` | `GoogleCacheData.StatusEffectDefinitions` |
| **CSV 範本** | `weapon-properties-tags-template.csv` | `status-effect-definitions-template.csv` (待建立) |

### 📁 已更新的檔案

- ✅ `src/Types/Equipment/WeaponPropertyTypes.ts` - 介面定義
- ✅ `src/Types/BaseTypes.ts` - GoogleCacheData 類型
- ✅ `src/Tasks/GoogleSheetCache.ts` - 快取載入邏輯
- ✅ `src/Game/Services/WeaponPropertyService.ts` - 服務層
- ✅ `src/Game/Managers/ConfigManager.ts` - 配置管理

### ⚠️ 需要手動更新

1. **Google Sheets**:
   - 將工作表 `WeaponProperties` 重命名為 `StatusEffectDefinitions`
   - 將工作表 `TagsDefinitions` 修正為 `TagDefinitions`

2. **文檔**:
   - `docs/標籤系統關係說明.md` - 更新所有 `WeaponPropertyDefinition` 引用
   - `docs/標籤定義系統說明.md` - 更新相關描述

---

## 目前定義清單

### 📊 完整列表 (27 個)

| ID | 名稱 | 類別 | 數值類型 | 問題狀態 |
|----|------|------|----------|----------|
| `knockback` | 擊退 | combat | single | ⚠️ 有問題 |
| `stun` | 暈眩 | debuff | composite | ✅ 合理 |
| `strength` | 力量 | attribute | range | ❌ 類型錯誤 |
| `vitality` | 體力 | attribute | range | ❌ 類型錯誤 |
| `intelligence` | 智力 | attribute | range | ❌ 類型錯誤 |
| `agility` | 敏捷 | attribute | range | ❌ 類型錯誤 |
| `attack_damage` | 攻擊力 | attribute | range | ❌ 類型錯誤 |
| `attack_speed` | 攻擊速度 | attribute | range | ❌ 類型錯誤 |
| `attack_range` | 攻擊距離 | attribute | range | ❌ 類型錯誤 |
| `freeze` | 冰凍 | debuff | single | ✅ 合理 |
| `burn` | 燃燒 | debuff | composite | ✅ 完美 |
| `poison` | 中毒 | debuff | composite | ✅ 完美 |
| `slow` | 減速 | debuff | composite | ✅ 合理 |
| `critical_chance` | 暴擊機率 | combat | range | ❌ 類型錯誤 |
| `critical_damage` | 暴擊傷害 | combat | range | ❌ 類型錯誤 |
| `life_steal` | 生命偷取 | combat | range | ❌ 類型錯誤 |
| `piercing` | 穿透 | combat | range | ❌ 類型錯誤 |
| `chain_attack` | 連鎖攻擊 | combat | composite | ❌ 類型錯誤 |
| `splash_damage` | 濺射傷害 | combat | single | ❌ 類型錯誤 |
| `projectile_speed` | 投射物速度 | attribute | range | ❌ 類型錯誤 |
| `area_of_effect` | 範圍效果 | attribute | range | ❌ 類型錯誤 |
| `pierce_count` | 穿透次數 | attribute | range | ❌ 類型錯誤 |
| `heal_amount` | 治療量 | attribute | range | ❌ 類型錯誤 |
| `buff_duration` | 增益持續 | attribute | range | ❌ 類型錯誤 |
| `support_radius` | 支援範圍 | attribute | range | ❌ 類型錯誤 |
| `sweep_angle` | 掃擊角度 | attribute | range | ❌ 類型錯誤 |
| `bleed` | 流血 | debuff | composite | ✅ 完美 |

**統計**:
- ✅ 合理/完美: **7 個** (burn, freeze, poison, slow, stun, bleed, knockback*)
- ❌ 有問題: **20 個** (類型混淆)

---

## 問題分析

### 🔴 **核心問題: 類型混淆**

目前的 `StatusEffectDefinitions` 混合了三種完全不同的概念：

```
❌ 錯誤設計：全部放在一起

StatusEffectDefinitions (27 個)
├─ 狀態效果 (7 個) ✅
│  └─ burn, freeze, poison, slow, stun, bleed, knockback
├─ 角色屬性 (6 個) ❌ 不應該在這裡
│  └─ strength, vitality, intelligence, agility, attack_damage, attack_speed
└─ 武器機制 (14 個) ❌ 不應該在這裡
   └─ piercing, chain_attack, splash_damage, sweep_angle, etc.
```

---

### 📊 **詳細問題分類**

#### 1️⃣ **應該保留的狀態效果** ✅

這些是真正的「狀態效果」—— 臨時作用在目標身上的效果：

| ID | 名稱 | 描述 | 數據結構 |
|----|------|------|----------|
| `burn` | 燃燒 | 持續火焰傷害 | ✅ probability, duration, damage |
| `freeze` | 冰凍 | 凍結目標無法移動 | ✅ duration |
| `poison` | 中毒 | 持續毒性傷害 | ✅ probability, duration, damage |
| `slow` | 減速 | 降低移動速度 | ✅ probability, duration, intensity |
| `stun` | 暈眩 | 無法行動 | ✅ probability, duration |
| `bleed` | 流血 | 持續物理傷害 | ✅ probability, duration, damage |

**特徵**：
- ✅ 有持續時間 (duration)
- ✅ 有觸發機率 (probability)
- ✅ 有數值效果 (damage/intensity)
- ✅ 臨時性（會消失）

---

#### 2️⃣ **knockback (擊退)** ⚠️

```json
{
    "propertyType": "knockback",
    "valueType": "single",
    "valueMin": 50,
    "valueMax": 50,
    "stacked": false
}
```

**問題**：
- ⚠️ 數據結構不完整
- ❌ 缺少 `baseProbability`（觸發機率）
- ❌ 缺少 `duration`（瞬間效果應為 0）
- ❌ `valueMin/Max` 不明確（是擊退距離？）

**建議修正**：
```typescript
{
    id: "knockback",
    displayName: "擊退",
    description: "將目標向後推",
    tags: "physical,control,knockback",
    
    baseProbability: 100,      // 100% 觸發
    duration: 0,               // 瞬間效果
    baseDamage: 0,             // 不造成傷害
    damageScaling: 0,
    knockbackDistance: 50,     // 🆕 新增：擊退距離（像素）
    
    defaultModifierType: ModifierType.FLAT,
    category: 'control',
    stackable: false
}
```

---

#### 3️⃣ **角色屬性 (Character Stats)** ❌

這些是角色的**永久性屬性**，不是臨時狀態效果：

| ID | 名稱 | 為什麼不應該在這裡 |
|----|------|--------------------|
| `strength` | 力量 | 角色基礎屬性，永久性 |
| `vitality` | 體力 | 角色基礎屬性，永久性 |
| `intelligence` | 智力 | 角色基礎屬性，永久性 |
| `agility` | 敏捷 | 角色基礎屬性，永久性 |
| `attack_damage` | 攻擊力 | 武器基礎屬性，永久性 |
| `attack_speed` | 攻擊速度 | 武器基礎屬性，永久性 |
| `attack_range` | 攻擊距離 | 武器基礎屬性，永久性 |

**問題**：
- ❌ 沒有 `duration`（永久性）
- ❌ 沒有 `baseProbability`（不需要觸發）
- ❌ 不會消失，不是臨時效果
- ❌ 應該直接定義在角色/武器上

**建議**：
- 移動到獨立的 `AttributeBonus` 表
- 或作為武器詞綴系統的一部分

---

#### 4️⃣ **武器機制 (Weapon Mechanics)** ❌

這些是武器的**攻擊機制**，定義了攻擊如何運作：

| ID | 名稱 | 為什麼不應該在這裡 |
|----|------|--------------------|
| `piercing` | 穿透 | 攻擊機制，不是狀態 |
| `chain_attack` | 連鎖攻擊 | 攻擊機制，不是狀態 |
| `splash_damage` | 濺射傷害 | 攻擊機制，不是狀態 |
| `sweep_angle` | 掃擊角度 | 武器參數，不是狀態 |
| `pierce_count` | 穿透次數 | 武器參數，不是狀態 |
| `projectile_speed` | 投射物速度 | 武器參數，不是狀態 |
| `area_of_effect` | 範圍效果 | 武器參數，不是狀態 |
| `heal_amount` | 治療量 | 武器參數，不是狀態 |
| `buff_duration` | 增益持續 | 武器參數，不是狀態 |
| `support_radius` | 支援範圍 | 武器參數，不是狀態 |

**問題**：
- ❌ 沒有 `duration`（永久性機制）
- ❌ 沒有 `baseDamage`（不直接造成傷害）
- ❌ 定義攻擊行為，不是臨時效果
- ❌ 應該作為武器的固定屬性

**建議**：
- 移動到獨立的 `WeaponModifiers` 表
- 或直接定義在 `WeaponConfigs` 上

---

#### 5️⃣ **戰鬥屬性 (Combat Stats)** ❌

這些影響戰鬥計算的屬性：

| ID | 名稱 | 為什麼不應該在這裡 |
|----|------|--------------------|
| `critical_chance` | 暴擊機率 | 永久性屬性 |
| `critical_damage` | 暴擊傷害 | 永久性屬性 |
| `life_steal` | 生命偷取 | 永久性屬性 |

**問題**：
- ⚠️ 這些可以作為武器詞綴存在
- ❌ 但不應該有 `duration` 和 `baseProbability`
- ❌ 數據結構不匹配

**建議**：
- 移動到 `WeaponModifiers` 或 `AttributeBonus`

---

## 改進建議

### 🎯 **方案 A: 分離三個表** ⭐ 最推薦

#### 1️⃣ **StatusEffectDefinitions** (狀態效果定義)

**用途**: 只包含作用在目標身上的臨時效果

**保留項目** (7 個):
```typescript
burn, freeze, poison, slow, stun, bleed, knockback
```

**數據結構**:
```typescript
export interface StatusEffectDefinition {
    id: string;                      // burn, freeze, slow
    displayName: string;
    description: string;
    tags: string;
    
    // 狀態效果特有欄位
    baseProbability: number;         // 觸發機率 (0-100)
    duration: number;                // 持續時間 (秒)
    baseDamage: number;              // 基礎傷害
    damageScaling: number;           // 傷害縮放
    
    // 特殊效果參數（可選）
    intensity?: number;              // 效果強度 (slow 用)
    knockbackDistance?: number;      // 擊退距離 (knockback 用)
    
    defaultModifierType: ModifierType;
    category: 'ailment' | 'control';
    stackable: boolean;
}
```

---

#### 2️⃣ **WeaponModifiers** (武器詞綴/機制) 🆕

**用途**: 定義武器的固定特性和攻擊機制

**包含項目** (14 個):
```typescript
piercing, chain_attack, splash_damage, sweep_angle, pierce_count,
projectile_speed, area_of_effect, heal_amount, buff_duration,
support_radius, critical_chance, critical_damage, life_steal,
attack_damage (作為詞綴)
```

**數據結構**:
```typescript
export interface WeaponModifier {
    id: string;                      // piercing, chain_attack
    displayName: string;
    description: string;
    tags: string;
    
    // 詞綴數值
    baseValue: number;               // 基礎數值
    valueType: 'count' | 'percentage' | 'distance';
    
    // 修改器配置
    modifierType: ModifierType;
    affectedStat: string;            // 影響的屬性 (如 'damage', 'speed')
    
    category: 'attack_mechanic' | 'combat_stat' | 'support';
    stackable: boolean;
}
```

**範例**:
```typescript
{
    id: "piercing",
    displayName: "穿透",
    description: "攻擊可以穿透多個敵人",
    tags: "attack,mechanic,pierce",
    
    baseValue: 2,                    // 穿透 2 個敵人
    valueType: "count",
    modifierType: ModifierType.FLAT,
    affectedStat: "pierce_count",
    
    category: "attack_mechanic",
    stackable: true
}
```

---

#### 3️⃣ **AttributeBonus** (屬性加成) 🆕

**用途**: 永久性屬性加成（角色/武器屬性）

**包含項目** (6 個):
```typescript
strength, vitality, intelligence, agility, attack_speed, attack_range
```

**數據結構**:
```typescript
export interface AttributeBonus {
    id: string;                      // strength, vitality
    displayName: string;
    description: string;
    tags: string;
    
    // 屬性加成配置
    baseValue: number;               // 基礎加成
    modifierType: ModifierType;      // FLAT, INCREASED, MORE
    affectedStat: string;            // 影響的屬性 (如 'max_health')
    
    category: 'character_stat' | 'weapon_stat';
    stackable: boolean;
}
```

**範例**:
```typescript
{
    id: "strength",
    displayName: "力量",
    description: "增加角色的力量屬性",
    tags: "attribute,character,physical",
    
    baseValue: 10,
    modifierType: ModifierType.FLAT,
    affectedStat: "strength",
    
    category: "character_stat",
    stackable: true
}
```

---

### 🎯 **方案 B: 單表但明確分類** (備選)

如果你不想分成三個表，可以保持單表但用 `category` 明確區分：

```typescript
export type PropertyCategory = 
    | 'ailment'           // 異常狀態 (burn, freeze, poison)
    | 'control'           // 控制效果 (stun, slow, knockback)
    | 'weapon_mechanic'   // 武器機制 (piercing, chain_attack)
    | 'attribute_bonus'   // 屬性加成 (strength, vitality)
    | 'combat_stat';      // 戰鬥屬性 (critical_chance, life_steal)

export interface UnifiedPropertyDefinition {
    id: string;
    displayName: string;
    description: string;
    tags: string;
    category: PropertyCategory;      // 🎯 關鍵：明確分類
    
    // 可選欄位（根據 category 決定是否使用）
    baseProbability?: number;        // ailment, control 用
    duration?: number;               // ailment, control 用
    baseDamage?: number;             // ailment 用
    baseValue?: number;              // 其他類型用
    
    defaultModifierType: ModifierType;
    stackable: boolean;
}
```

**優點**:
- ✅ 維持單一資料來源
- ✅ 減少表的數量

**缺點**:
- ❌ 數據結構複雜（很多可選欄位）
- ❌ 驗證邏輯複雜
- ❌ 容易混淆

---

## 行動計劃

### 🚀 **立即行動** (必要)

#### 1️⃣ **清理 StatusEffectDefinitions**

**目標**: 只保留真正的狀態效果

**步驟**:
```typescript
// ✅ 保留這 7 個
burn, freeze, poison, slow, stun, bleed, knockback

// ❌ 移除這 20 個
strength, vitality, intelligence, agility,
attack_damage, attack_speed, attack_range,
piercing, chain_attack, splash_damage,
critical_chance, critical_damage, life_steal,
projectile_speed, area_of_effect, pierce_count,
heal_amount, buff_duration, support_radius, sweep_angle
```

**Google Sheets 操作**:
1. 打開 Google Sheets
2. 重命名 `WeaponProperties` → `StatusEffectDefinitions`
3. 刪除或移動 20 個不適合的項目
4. 修正 `knockback` 的數據結構

---

#### 2️⃣ **建立新的資料表**

##### **2.1 WeaponModifiers** (武器詞綴)

**Google Sheets 新增工作表**: `WeaponModifiers`

**欄位結構**:
```
id | displayName | description | tags | baseValue | valueType | modifierType | affectedStat | category | stackable | enabled
```

**範例數據**:
```csv
piercing,穿透,攻擊可以穿透多個敵人,attack,2,count,flat,pierce_count,attack_mechanic,TRUE,TRUE
chain_attack,連鎖攻擊,攻擊可以跳躍到附近敵人,attack,3,count,flat,chain_count,attack_mechanic,FALSE,TRUE
splash_damage,濺射傷害,攻擊對範圍內敵人造成額外傷害,attack,50,percentage,increased,damage,attack_mechanic,FALSE,TRUE
sweep_angle,掃擊角度,增加近戰武器的攻擊扇形角度,melee,30,degree,flat,sweep_angle,attack_mechanic,TRUE,TRUE
critical_chance,暴擊機率,增加造成暴擊的機率,combat,5,percentage,increased,critical_chance,combat_stat,TRUE,TRUE
critical_damage,暴擊傷害,增加暴擊時的傷害倍數,combat,50,percentage,increased,critical_damage,combat_stat,TRUE,TRUE
life_steal,生命偷取,攻擊時回復等同於傷害百分比的生命值,combat,5,percentage,flat,life_steal,combat_stat,TRUE,TRUE
```

---

##### **2.2 AttributeBonus** (屬性加成)

**Google Sheets 新增工作表**: `AttributeBonus`

**欄位結構**:
```
id | displayName | description | tags | baseValue | modifierType | affectedStat | category | stackable | enabled
```

**範例數據**:
```csv
strength,力量,增加角色的力量屬性,attribute,10,flat,strength,character_stat,TRUE,TRUE
vitality,體力,增加角色的體力屬性,attribute,10,flat,vitality,character_stat,TRUE,TRUE
intelligence,智力,增加角色的智力屬性,attribute,10,flat,intelligence,character_stat,TRUE,TRUE
agility,敏捷,增加角色的敏捷屬性,attribute,10,flat,agility,character_stat,TRUE,TRUE
attack_damage,攻擊力,增加武器基礎攻擊力,attack,5,flat,attack_damage,weapon_stat,TRUE,TRUE
attack_speed,攻擊速度,減少攻擊間隔時間,attack,10,increased,attack_speed,weapon_stat,TRUE,TRUE
attack_range,攻擊距離,增加武器攻擊範圍,attack,20,flat,attack_range,weapon_stat,TRUE,TRUE
```

---

#### 3️⃣ **更新 GoogleSheetCache.ts**

```typescript
const statusEffectSheet = workbook.Sheets['StatusEffectDefinitions'];
const weaponModifiersSheet = workbook.Sheets['WeaponModifiers'];     // 🆕
const attributeBonusSheet = workbook.Sheets['AttributeBonus'];       // 🆕

// ... 讀取數據

this.cacheData = {
    TagDefinitions: tagDefinitions,
    StatusEffectDefinitions: statusEffects,
    WeaponModifiers: weaponModifiers,              // 🆕
    AttributeBonus: attributeBonus,                // 🆕
    WeaponConfigs: weaponConfigs,
    MaterialConfigs: materialConfigs,
    EnemyConfigs: enemyConfigs,
    TalentConfigs: talentConfigs,
    TalentEffects: talentEffects,
    lastUpdated: new Date().toISOString()
};
```

---

#### 4️⃣ **更新類型定義**

**新增介面** (`src/Types/Equipment/WeaponPropertyTypes.ts`):

```typescript
/**
 * 武器詞綴定義
 */
export interface WeaponModifier {
    id: string;
    displayName: string;
    description: string;
    tags: string;
    baseValue: number;
    valueType: 'count' | 'percentage' | 'distance' | 'degree';
    modifierType: ModifierType;
    affectedStat: string;
    category: 'attack_mechanic' | 'combat_stat' | 'support';
    stackable: boolean;
    enabled: boolean;
}

/**
 * 屬性加成定義
 */
export interface AttributeBonus {
    id: string;
    displayName: string;
    description: string;
    tags: string;
    baseValue: number;
    modifierType: ModifierType;
    affectedStat: string;
    category: 'character_stat' | 'weapon_stat';
    stackable: boolean;
    enabled: boolean;
}
```

---

### 📅 **後續工作** (建議)

1. **建立 CSV 範本檔案**:
   - `status-effect-definitions-template.csv` (只包含 7 個狀態效果)
   - `weapon-modifiers-template.csv`
   - `attribute-bonus-template.csv`

2. **更新文檔**:
   - `docs/標籤系統關係說明.md`
   - `docs/標籤定義系統說明.md`
   - 建立 `docs/武器詞綴系統說明.md`
   - 建立 `docs/屬性加成系統說明.md`

3. **實作相關服務**:
   - `WeaponModifierService.ts`
   - `AttributeBonusService.ts`
   - 更新 `WeaponPropertyService.ts`

4. **測試驗證**:
   - 測試狀態效果作用在敵人身上
   - 測試武器詞綴影響攻擊行為
   - 測試屬性加成計算

---

## 📊 **改進前後對比**

### ❌ **改進前** (混亂)

```
StatusEffectDefinitions (27 個項目混在一起)
├─ 狀態效果 (7 個) ✅
├─ 角色屬性 (6 個) ❌ 不應該在這裡
└─ 武器機制 (14 個) ❌ 不應該在這裡

問題：
- 類型混淆
- 數據結構不一致
- 難以維護和擴展
```

### ✅ **改進後** (清晰)

```
StatusEffectDefinitions (7 個) ✅
└─ burn, freeze, poison, slow, stun, bleed, knockback
   用途: 作用在目標身上的臨時效果
   特徵: 有 probability, duration, damage

WeaponModifiers (14 個) 🆕
└─ piercing, chain_attack, splash_damage, critical_chance, etc.
   用途: 武器的固定特性和攻擊機制
   特徵: 永久性，影響攻擊行為

AttributeBonus (6 個) 🆕
└─ strength, vitality, intelligence, attack_damage, etc.
   用途: 角色/武器的屬性加成
   特徵: 永久性，增加基礎屬性

優點：
✅ 職責清晰
✅ 數據結構一致
✅ 易於維護和擴展
✅ 符合系統設計邏輯
```

---

## 🎯 **總結**

### 核心發現

1. **重命名正確** ✅: `StatusEffectDefinitions` 比 `WeaponProperties` 更準確
2. **類型混淆嚴重** ❌: 目前混合了 3 種完全不同的概念
3. **需要重構** 🔧: 建議分成 3 個獨立的表

### 建議行動

1. **立即**: 清理 `StatusEffectDefinitions`，只保留 7 個真正的狀態效果
2. **短期**: 建立 `WeaponModifiers` 和 `AttributeBonus` 表
3. **長期**: 完善服務層和測試

### 預期效果

- ✅ 系統職責清晰
- ✅ 數據結構一致
- ✅ 易於理解和維護
- ✅ 支援未來擴展

---

**文檔版本**: 1.0  
**最後更新**: 2025-11-01  
**相關檔案**:
- `src/Types/Equipment/WeaponPropertyTypes.ts`
- `src/Tasks/GoogleSheetCache.ts`
- `docs/標籤系統關係說明.md`
