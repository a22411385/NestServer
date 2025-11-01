# 🏷️ 標籤系統整理 - Google Sheets 填寫指南

> 本文檔整理了現存系統中已使用的所有標籤，供 Google Sheets 武器屬性表填寫參考。

## 📋 目錄

- [標籤系統概述](#標籤系統概述)
- [核心標籤分類](#核心標籤分類)
- [武器屬性標籤清單](#武器屬性標籤清單)
- [Google Sheets 填寫範例](#google-sheets-填寫範例)
- [標籤命名規範](#標籤命名規範)

---

## 標籤系統概述

### 什麼是標籤系統？

標籤系統用於**分類和匹配**武器屬性，取代舊有的 `PropertyType` 枚舉。每個屬性可以擁有多個標籤，使用**逗號分隔**。

### 標籤用途

1. **天賦系統匹配**: 天賦可以影響特定標籤的屬性
2. **傷害計算**: 根據標籤計算元素傷害加成
3. **篩選和查詢**: 快速找到特定類型的屬性
4. **動態配置**: 無需修改程式碼即可新增屬性類型

### 標籤格式

```typescript
// Google Sheets 中的格式
tags: "fire,ailment,elemental"

// 解析後的格式
tags: ["fire", "ailment", "elemental"]
```

---

## 核心標籤分類

### 1️⃣ 元素類型標籤 (Element Tags)

這些標籤表示屬性的**元素屬性**，用於計算元素傷害加成。

| 標籤 | 中文名稱 | 說明 | 對應 Debuff |
|------|---------|------|-------------|
| `physical` | 物理 | 物理傷害相關 | `bleed` (流血) |
| `fire` | 火 | 火元素傷害 | `burn` (燃燒) |
| `cold` | 冰 | 冰元素傷害 | `freeze` (冰凍), `chill` (冰緩) |
| `ice` | 冰 | 冰元素傷害 (同 `cold`) | 同上 |
| `lightning` | 雷電 | 雷電元素傷害 | `shock` (電擊), `stun` (暈眩) |
| `poison` | 毒 | 毒素傷害 | `poison` (中毒) |
| `chaos` | 混沌 | 混沌傷害 | - |
| `holy` | 神聖 | 神聖傷害 | - |
| `shadow` | 暗影 | 暗影傷害 | `slow` (減速), `curse` (詛咒) |
| `arcane` | 秘法 | 秘法傷害 | - |

### 2️⃣ 異常狀態標籤 (Ailment Tags)

這些標籤表示屬性會造成**異常狀態** (Debuff)。

| 標籤 | 中文名稱 | 說明 | 元素關聯 |
|------|---------|------|---------|
| `ailment` | 異常狀態 | 通用異常狀態標籤 | - |
| `burn` | 燃燒 | 持續火焰傷害 | `fire` |
| `freeze` | 冰凍 | 完全凍結無法行動 | `cold`, `ice` |
| `chill` | 冰緩 | 降低移動速度 | `cold`, `ice` |
| `shock` | 電擊 | 增加受到的傷害 | `lightning` |
| `poison` | 中毒 | 持續毒素傷害 | `poison` |
| `bleed` | 流血 | 持續物理傷害 | `physical` |
| `stun` | 暈眩 | 短時間無法行動 | `lightning`, `physical` |
| `slow` | 減速 | 降低移動速度 | `shadow`, `ice` |
| `knockback` | 擊退 | 推開敵人 | `physical` |

### 3️⃣ 攻擊類型標籤 (Attack Type Tags)

這些標籤表示屬性如何**作用於攻擊**。

| 標籤 | 中文名稱 | 說明 |
|------|---------|------|
| `attack` | 攻擊 | 與攻擊相關 |
| `spell` | 法術 | 與法術施放相關 |
| `projectile` | 投射物 | 與投射物相關 |
| `melee` | 近戰 | 近距離攻擊 |
| `ranged` | 遠程 | 遠距離攻擊 |
| `area` | 範圍 | 範圍效果 |
| `aoe` | AOE | 範圍效果 (同 `area`) |
| `chain` | 連鎖 | 跳躍攻擊 |
| `pierce` | 穿透 | 穿透敵人 |
| `splash` | 濺射 | 範圍濺射 |

### 4️⃣ 武器類型標籤 (Weapon Type Tags)

這些標籤表示武器的**物理分類**。

| 標籤 | 中文名稱 | 說明 |
|------|---------|------|
| `weapon` | 武器 | 通用武器標籤 |
| `sword` | 劍 | 劍類武器 |
| `axe` | 斧 | 斧頭類武器 |
| `mace` | 錘 | 錘子類武器 |
| `dagger` | 匕首 | 匕首類武器 |
| `bow` | 弓 | 弓箭類武器 |
| `staff` | 法杖 | 法杖類武器 |
| `wand` | 魔杖 | 魔杖類武器 |
| `spellbook` | 法術書 | 法術書類 |

### 5️⃣ 功能類型標籤 (Function Tags)

這些標籤表示屬性的**功能分類**。

| 標籤 | 中文名稱 | 說明 |
|------|---------|------|
| `damage` | 傷害 | 增加傷害 |
| `combat` | 戰鬥 | 戰鬥相關 |
| `defense` | 防禦 | 防禦相關 |
| `support` | 輔助 | 輔助效果 |
| `buff` | 增益 | 正面效果 |
| `debuff` | 減益 | 負面效果 |
| `attribute` | 屬性 | 基礎屬性加成 |
| `critical` | 暴擊 | 暴擊相關 |
| `speed` | 速度 | 速度相關 |
| `healing` | 治療 | 治療效果 |
| `lifesteal` | 吸血 | 生命偷取 |

### 6️⃣ 分類標籤 (Category Tags)

這些標籤對應 `category` 欄位的值。

| 標籤 | 中文名稱 | 說明 |
|------|---------|------|
| `combat` | 戰鬥 | 戰鬥增強 |
| `debuff` | 減益 | 負面狀態 |
| `buff` | 增益 | 正面狀態 |
| `attribute` | 屬性 | 基礎屬性 |
| `elemental` | 元素 | 元素效果 |

---

## 武器屬性標籤清單

### 🔥 燃燒 (Burn)

```csv
id: burn
displayName: 燃燒
tags: fire,ailment,elemental,debuff,damage
category: debuff
defaultModifierType: flat
```

**說明**: 造成持續火焰傷害  
**建議標籤**: `fire,ailment,elemental,debuff,damage`

---

### ❄️ 冰凍 (Freeze)

```csv
id: freeze
displayName: 冰凍
tags: cold,ice,ailment,elemental,debuff,control
category: debuff
defaultModifierType: flat
```

**說明**: 使敵人完全無法移動  
**建議標籤**: `cold,ice,ailment,elemental,debuff,control`

---

### ⚡ 電擊/暈眩 (Shock/Stun)

```csv
id: stun
displayName: 暈眩
tags: lightning,physical,ailment,debuff,control
category: debuff
defaultModifierType: flat
```

**說明**: 使敵人短時間無法行動  
**建議標籤**: `lightning,physical,ailment,debuff,control`

---

### ☠️ 中毒 (Poison)

```csv
id: poison
displayName: 中毒
tags: poison,ailment,elemental,debuff,damage
category: debuff
defaultModifierType: flat
```

**說明**: 造成持續毒素傷害  
**建議標籤**: `poison,ailment,elemental,debuff,damage`

---

### 🩸 流血 (Bleed)

```csv
id: bleed
displayName: 流血
tags: physical,ailment,debuff,damage
category: debuff
defaultModifierType: flat
```

**說明**: 造成持續物理傷害  
**建議標籤**: `physical,ailment,debuff,damage`

---

### 🐌 減速 (Slow)

```csv
id: slow
displayName: 減速
tags: cold,ice,shadow,debuff,control,speed
category: debuff
defaultModifierType: flat
```

**說明**: 降低移動速度  
**建議標籤**: `cold,ice,shadow,debuff,control,speed`

---

### 💥 擊退 (Knockback)

```csv
id: knockback
displayName: 擊退
tags: physical,combat,control
category: combat
defaultModifierType: flat
```

**說明**: 將敵人向後推  
**建議標籤**: `physical,combat,control`

---

### ⚔️ 攻擊力 (Attack Damage)

```csv
id: attack_damage
displayName: 攻擊力
tags: weapon,damage,attribute,combat
category: attribute
defaultModifierType: flat
```

**說明**: 增加武器基礎攻擊力  
**建議標籤**: `weapon,damage,attribute,combat`

---

### ⏱️ 攻擊速度 (Attack Speed)

```csv
id: attack_speed
displayName: 攻擊速度
tags: weapon,speed,attribute,combat
category: attribute
defaultModifierType: increased
```

**說明**: 減少攻擊間隔時間  
**建議標籤**: `weapon,speed,attribute,combat`  
**修改器類型**: `increased` (百分比加成)

---

### 📏 攻擊距離 (Attack Range)

```csv
id: attack_range
displayName: 攻擊距離
tags: weapon,attribute,combat,ranged
category: attribute
defaultModifierType: increased
```

**說明**: 增加武器攻擊範圍  
**建議標籤**: `weapon,attribute,combat,ranged`

---

### 💪 力量 (Strength)

```csv
id: strength
displayName: 力量
tags: attribute,physical,combat
category: attribute
defaultModifierType: flat
```

**說明**: 增加角色力量屬性  
**建議標籤**: `attribute,physical,combat`

---

### 🛡️ 體力 (Vitality)

```csv
id: vitality
displayName: 體力
tags: attribute,defense,health
category: attribute
defaultModifierType: flat
```

**說明**: 增加角色體力屬性  
**建議標籤**: `attribute,defense,health`

---

### 🧠 智力 (Intelligence)

```csv
id: intelligence
displayName: 智力
tags: attribute,spell,elemental
category: attribute
defaultModifierType: flat
```

**說明**: 增加角色智力屬性  
**建議標籤**: `attribute,spell,elemental`

---

### 🏃 敏捷 (Agility)

```csv
id: agility
displayName: 敏捷
tags: attribute,speed,ranged
category: attribute
defaultModifierType: flat
```

**說明**: 增加角色敏捷屬性  
**建議標籤**: `attribute,speed,ranged`

---

### 💥 暴擊機率 (Critical Chance)

```csv
id: critical_chance
displayName: 暴擊機率
tags: combat,critical,damage
category: combat
defaultModifierType: increased
```

**說明**: 增加造成暴擊的機率  
**建議標籤**: `combat,critical,damage`  
**修改器類型**: `increased`

---

### 💥💥 暴擊傷害 (Critical Damage)

```csv
id: critical_damage
displayName: 暴擊傷害
tags: combat,critical,damage
category: combat
defaultModifierType: more
```

**說明**: 增加暴擊傷害倍數  
**建議標籤**: `combat,critical,damage`  
**修改器類型**: `more` (乘法加成)

---

### 🩸 生命偷取 (Life Steal)

```csv
id: life_steal
displayName: 生命偷取
tags: combat,healing,lifesteal
category: combat
defaultModifierType: increased
```

**說明**: 攻擊時回復等同傷害百分比的生命  
**建議標籤**: `combat,healing,lifesteal`

---

### 🎯 穿透 (Piercing)

```csv
id: piercing
displayName: 穿透
tags: projectile,ranged,pierce,combat
category: combat
defaultModifierType: flat
```

**說明**: 攻擊可穿透多個敵人  
**建議標籤**: `projectile,ranged,pierce,combat`

---

### ⛓️ 連鎖攻擊 (Chain Attack)

```csv
id: chain_attack
displayName: 連鎖攻擊
tags: projectile,ranged,chain,combat,lightning
category: combat
defaultModifierType: flat
```

**說明**: 攻擊跳躍到附近敵人  
**建議標籤**: `projectile,ranged,chain,combat,lightning`

---

### 💦 濺射傷害 (Splash Damage)

```csv
id: splash_damage
displayName: 濺射傷害
tags: area,aoe,splash,combat,damage
category: combat
defaultModifierType: increased
```

**說明**: 對範圍內敵人造成額外傷害  
**建議標籤**: `area,aoe,splash,combat,damage`

---

### 🚀 投射物速度 (Projectile Speed)

```csv
id: projectile_speed
displayName: 投射物速度
tags: projectile,ranged,speed,attribute
category: attribute
defaultModifierType: increased
```

**說明**: 增加投射物飛行速度  
**建議標籤**: `projectile,ranged,speed,attribute`

---

### 🌀 範圍效果 (Area of Effect)

```csv
id: area_of_effect
displayName: 範圍效果
tags: area,aoe,combat,attribute
category: attribute
defaultModifierType: increased
```

**說明**: 增加技能或攻擊的影響範圍  
**建議標籤**: `area,aoe,combat,attribute`

---

### 🔫 穿透次數 (Pierce Count)

```csv
id: pierce_count
displayName: 穿透次數
tags: projectile,ranged,pierce,attribute
category: attribute
defaultModifierType: flat
```

**說明**: 投射物可穿透的敵人數量  
**建議標籤**: `projectile,ranged,pierce,attribute`

---

### ⚔️ 掃擊角度 (Sweep Angle)

```csv
id: sweep_angle
displayName: 掃擊角度
tags: melee,weapon,area,combat
category: attribute
defaultModifierType: flat
```

**說明**: 近戰武器攻擊扇形角度  
**建議標籤**: `melee,weapon,area,combat`

---

### 💚 治療量 (Heal Amount)

```csv
id: heal_amount
displayName: 治療量
tags: support,healing,buff,holy
category: attribute
defaultModifierType: flat
```

**說明**: 增加治療技能恢復量  
**建議標籤**: `support,healing,buff,holy`

---

### ⏳ 增益持續 (Buff Duration)

```csv
id: buff_duration
displayName: 增益持續
tags: support,buff,attribute
category: attribute
defaultModifierType: increased
```

**說明**: 增加增益效果持續時間  
**建議標籤**: `support,buff,attribute`

---

### 🔵 支援範圍 (Support Radius)

```csv
id: support_radius
displayName: 支援範圍
tags: support,area,buff,attribute
category: attribute
defaultModifierType: increased
```

**說明**: 增加支援技能影響範圍  
**建議標籤**: `support,area,buff,attribute`

---

## Google Sheets 填寫範例

### 📊 完整屬性表格式

在 Google Sheets 中，你需要的欄位結構：

| id | displayName | description | **tags** | baseProbability | duration | baseDamage | damageScaling | defaultModifierType | category | stackable |
|----|-------------|-------------|---------|----------------|----------|------------|---------------|---------------------|----------|-----------|

### ✅ 範例 1: 燃燒屬性

| 欄位 | 值 |
|-----|-----|
| id | `burn` |
| displayName | `燃燒` |
| description | `攻擊時有機率造成持續燃燒傷害` |
| **tags** | **`fire,ailment,elemental,debuff,damage`** |
| baseProbability | `30` |
| duration | `4` |
| baseDamage | `10` |
| damageScaling | `0.15` |
| defaultModifierType | `flat` |
| category | `debuff` |
| stackable | `FALSE` |

### ✅ 範例 2: 攻擊速度

| 欄位 | 值 |
|-----|-----|
| id | `attack_speed` |
| displayName | `攻擊速度` |
| description | `減少攻擊間隔時間` |
| **tags** | **`weapon,speed,attribute,combat`** |
| baseProbability | `0` |
| duration | `0` |
| baseDamage | `0` |
| damageScaling | `0` |
| defaultModifierType | `increased` |
| category | `attribute` |
| stackable | `TRUE` |

### ✅ 範例 3: 暴擊傷害

| 欄位 | 值 |
|-----|-----|
| id | `critical_damage` |
| displayName | `暴擊傷害` |
| description | `增加暴擊時的傷害倍數` |
| **tags** | **`combat,critical,damage`** |
| baseProbability | `0` |
| duration | `0` |
| baseDamage | `0` |
| damageScaling | `0` |
| defaultModifierType | `more` |
| category | `combat` |
| stackable | `TRUE` |

### ✅ 範例 4: 冰凍

| 欄位 | 值 |
|-----|-----|
| id | `freeze` |
| displayName | `冰凍` |
| description | `攻擊時造成敵人冰凍無法移動` |
| **tags** | **`cold,ice,ailment,elemental,debuff,control`** |
| baseProbability | `25` |
| duration | `2` |
| baseDamage | `0` |
| damageScaling | `0` |
| defaultModifierType | `flat` |
| category | `debuff` |
| stackable | `FALSE` |

---

## 標籤命名規範

### ✅ 推薦規則

1. **小寫英文**: 所有標籤使用小寫英文字母
   ```
   ✅ fire, ailment, elemental
   ❌ Fire, AILMENT, Elemental
   ```

2. **底線分隔**: 多個單字使用底線 `_` 連接
   ```
   ✅ attack_speed, life_steal, critical_chance
   ❌ attackSpeed, lifeSteal, criticalChance
   ```

3. **逗號分隔**: 多個標籤使用逗號 `,` 分隔，**不加空格**
   ```
   ✅ fire,ailment,elemental
   ❌ fire, ailment, elemental (有空格)
   ❌ fire;ailment;elemental (錯誤分隔符)
   ```

4. **語意清晰**: 標籤名稱要明確表達意義
   ```
   ✅ fire (火), physical (物理), melee (近戰)
   ❌ f, phy, mel
   ```

5. **避免重複**: 不要在同一屬性中重複相同標籤
   ```
   ✅ fire,ailment,elemental
   ❌ fire,fire,ailment
   ```

### 📋 標籤優先順序建議

為每個屬性添加標籤時，建議按以下順序：

```
1. 元素標籤 (fire, cold, physical)
2. 功能標籤 (ailment, damage, control)
3. 類別標籤 (debuff, buff, attribute)
4. 攻擊類型 (melee, ranged, projectile)
5. 特殊標籤 (critical, speed, healing)
```

**範例**:
```
burn → fire,ailment,elemental,debuff,damage
attack_speed → weapon,speed,attribute,combat
critical_damage → combat,critical,damage,more
freeze → cold,ice,ailment,elemental,debuff,control
```

---

## 快速參考表

### 🔥 元素屬性快速對照

| 屬性 | 推薦標籤 | ModifierType |
|------|---------|--------------|
| burn | `fire,ailment,elemental,debuff,damage` | `flat` |
| freeze | `cold,ice,ailment,elemental,debuff,control` | `flat` |
| poison | `poison,ailment,elemental,debuff,damage` | `flat` |
| shock/stun | `lightning,ailment,debuff,control` | `flat` |
| bleed | `physical,ailment,debuff,damage` | `flat` |

### ⚔️ 戰鬥屬性快速對照

| 屬性 | 推薦標籤 | ModifierType |
|------|---------|--------------|
| attack_damage | `weapon,damage,attribute,combat` | `flat` |
| attack_speed | `weapon,speed,attribute,combat` | `increased` |
| critical_chance | `combat,critical,damage` | `increased` |
| critical_damage | `combat,critical,damage` | `more` |
| life_steal | `combat,healing,lifesteal` | `increased` |

### 🏹 投射物屬性快速對照

| 屬性 | 推薦標籤 | ModifierType |
|------|---------|--------------|
| projectile_speed | `projectile,ranged,speed,attribute` | `increased` |
| pierce_count | `projectile,ranged,pierce,attribute` | `flat` |
| chain_attack | `projectile,ranged,chain,combat,lightning` | `flat` |

### 🎯 範圍效果快速對照

| 屬性 | 推薦標籤 | ModifierType |
|------|---------|--------------|
| area_of_effect | `area,aoe,combat,attribute` | `increased` |
| splash_damage | `area,aoe,splash,combat,damage` | `increased` |
| sweep_angle | `melee,weapon,area,combat` | `flat` |

---

## 注意事項

### ⚠️ 常見錯誤

1. **標籤中有空格**
   ```
   ❌ "fire, ailment, elemental"
   ✅ "fire,ailment,elemental"
   ```

2. **使用大寫**
   ```
   ❌ "Fire,Ailment,Elemental"
   ✅ "fire,ailment,elemental"
   ```

3. **拼寫錯誤**
   ```
   ❌ "fier,aliment,elemental"
   ✅ "fire,ailment,elemental"
   ```

4. **忘記分類標籤**
   ```
   ❌ "fire,damage" (缺少 ailment, elemental, debuff)
   ✅ "fire,ailment,elemental,debuff,damage"
   ```

### ✅ 最佳實踐

1. **保持一致性**: 相同類型的屬性使用相同的標籤結構
2. **完整描述**: 盡可能添加所有相關標籤
3. **避免冗餘**: 不要添加語意重複的標籤
4. **定期審查**: 定期檢查標籤是否符合系統需求

---

## 總結

### 📝 標籤系統核心要點

1. **標籤格式**: 小寫英文，逗號分隔，無空格
2. **標籤用途**: 匹配、計算、篩選、配置
3. **分類清晰**: 元素、異常、攻擊、武器、功能
4. **擴展性強**: 可隨時新增標籤無需改程式碼

### 🎯 下一步行動

1. ✅ 參考本文檔的標籤清單
2. ✅ 在 Google Sheets 中新增 `tags` 欄位
3. ✅ 為每個屬性填寫適當的標籤
4. ✅ 測試標籤系統是否正確運作
5. ✅ 根據需要新增自訂標籤

---

**文檔版本**: 1.0  
**最後更新**: 2025-10-31  
**作者**: GitHub Copilot  
**相關文檔**: `poe-refactor-final-report.md`, `WeaponPropertyTypes.ts`
