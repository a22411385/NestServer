# 🏷️ POE 標籤系統運作完整分析

> **分析目的**: 深入分析你的遊戲中 POE 風格標籤系統在武器、武器特殊效果、天賦間的運作機制和數據流向

## 📋 目錄

- [系統架構概覽](#系統架構概覽)
- [核心配置表分析](#核心配置表分析)
- [數據流向詳解](#數據流向詳解)
- [標籤匹配機制](#標籤匹配機制)
- [POE 計算公式實現](#poe-計算公式實現)
- [實戰案例分析](#實戰案例分析)
- [潛在問題與建議](#潛在問題與建議)

---

## 系統架構概覽

### 🎯 核心理念

你的系統完美模仿了 **Path of Exile** 的標籤驅動設計：

```
📊 配置驅動 (Google Sheets)
    ↓
🏷️ 標籤系統 (Tag-Based)
    ↓
🔧 修改器系統 (flat/increased/more)
    ↓
⚔️ 動態匹配 (天賦透過標籤影響武器)
```

### 📦 數據存儲層級

```typescript
GoogleCacheData (頂層快取)
├── TagDefinitions          // 🏷️ 標籤元數據
├── StatusEffectDefinitions // 🔥 狀態效果 (Debuff/Buff)
├── WeaponModifiers         // ⚔️ 武器詞綴 (攻擊機制)
├── AttributeBonus          // 💪 屬性加成 (永久性)
├── WeaponConfigs           // 🗡️ 武器配置 (組合上述三者)
├── TalentConfigs           // 🌟 天賦節點
└── TalentEffects           // ✨ 天賦效果 (透過標籤匹配)
```

---

## 核心配置表分析

### 1️⃣ TagDefinitions - 標籤元數據表

**角色**: 整個系統的基石，定義所有可用標籤

**關鍵特性**:
- 支持**父子層級關係** (`parent` 欄位)
- 提供 UI 元數據 (顏色、圖示)
- 驗證其他表的標籤合法性

**層級結構範例**:

```
elemental (元素)
├── fire (火)
│   └── burn (燃燒)
├── cold (冰)
│   ├── freeze (冰凍)
│   └── chill (冰緩)
└── lightning (雷)
    └── shock (電擊)
```

**實際應用**:

```typescript
// 查詢所有火元素相關標籤
TagUtils.getTagPath('burn')  
// -> ['elemental', 'fire', 'burn']

// 查詢是否屬於元素類別
TagMatcher.hasAnyTag(['fire', 'ailment'], ['elemental'])  
// -> true (透過父級層級)
```

---

### 2️⃣ StatusEffectDefinitions - 狀態效果表

**角色**: 定義**臨時**作用在目標身上的效果 (Debuff/Buff)

**關鍵特性**:
- 有持續時間 (`duration`)
- 可堆疊 (`stackable`)
- 作用在**目標**身上
- 可造成 DOT (持續傷害)

**數據範例**:

| id | displayName | tags | baseProbability | duration | baseDamage | damageScaling |
|----|-------------|------|-----------------|----------|------------|---------------|
| burn | 燃燒 | fire,ailment,elemental | 30 | 5 | 10 | 0.5 |
| freeze | 冰凍 | cold,ailment,elemental | 20 | 2 | 0 | 0 |
| slow | 減速 | cold,debuff,control | 40 | 3 | 0 | 0 |

**標籤作用**:
```typescript
// 天賦: 火焰精通 +15% 傷害 (affect_tags: "fire,elemental")
// 燃燒效果: tags = ["fire", "ailment", "elemental"]

// ✅ 匹配成功! 燃燒傷害會被天賦加成
TagMatcher.hasAnyTag(['fire', 'ailment', 'elemental'], ['fire', 'elemental'])
// -> true
```

---

### 3️⃣ WeaponModifiers - 武器詞綴表

**角色**: 定義武器的**永久**攻擊機制和特性

**關鍵特性**:
- 無持續時間 (永久性)
- 改變攻擊方式 (穿透、連鎖、範圍)
- 作用在**攻擊者**身上
- 直接修改武器屬性

**數據範例**:

| id | displayName | tags | baseValue | affectedStat | modifierType |
|----|-------------|------|-----------|--------------|--------------|
| piercing | 穿透 | attack,mechanic,pierce | 2 | pierce_count | flat |
| chain_attack | 連鎖攻擊 | attack,mechanic,chain | 3 | chain_count | flat |
| critical_chance | 暴擊率 | combat,critical | 15 | critical_chance | increased |
| knockback | 擊退 | physical,attack | 50 | knockback_force | flat |

**與 StatusEffect 的區別**:

```typescript
// ❌ StatusEffect - 作用在目標身上
{
    id: 'burn',
    duration: 5,  // 5秒後消失
    作用對象: enemy
}

// ✅ WeaponModifier - 作用在武器本身
{
    id: 'piercing',
    affectedStat: 'pierce_count',  // 穿透次數 +2
    作用對象: weapon (持有者攻擊時生效)
}
```

**計算應用**:

```typescript
// WeaponDataService.applyWeaponModifiers()
// 武器詞綴直接修改武器屬性
{
    weaponDamage: 50,  // 基礎傷害
    pierceCount: 0 + 2,  // ✅ 穿透詞綴 (flat +2)
    critRate: 5 * (1 + 0.15),  // ✅ 暴擊詞綴 (increased 15%)
}
```

---

### 4️⃣ AttributeBonus - 屬性加成表

**角色**: 定義角色/武器的**永久屬性**加成

**關鍵特性**:
- 永久性 (無持續時間)
- 影響基礎屬性 (力量、敏捷、智力)
- 影響戰鬥數值 (攻擊力、生命、防禦)

**數據範例**:

| id | displayName | tags | baseValue | affectedStat | modifierType | category |
|----|-------------|------|-----------|--------------|--------------|----------|
| strength | 力量 | attribute,character,physical | 5 | strength | flat | character_stat |
| attack_damage | 攻擊傷害 | combat,damage,physical | 10 | attack_damage | flat | weapon_stat |
| attack_speed | 攻擊速度 | combat,speed | 10 | attack_speed | increased | weapon_stat |

**與前兩者的區別**:

```typescript
// StatusEffect: 臨時效果，作用在目標
// WeaponModifier: 武器機制，改變攻擊方式
// AttributeBonus: 永久加成，提升基礎屬性 ✅
```

---

### 5️⃣ WeaponConfigs - 武器配置表

**角色**: **組合者**，將上述三種屬性組合成完整武器

**關鍵欄位**:

```typescript
interface WeaponConfigDefinition {
    id: string;
    tags: string;  // 🏷️ 武器本身的標籤 "weapon,melee,sword,fire"
    
    // 🔗 引用三個定義表 (逗號分隔的 ID 列表)
    effectProperties: string;  // "burn,knockback"
    modifiers: string;         // "critical_chance,lifesteal"
    bonuses: string;           // "strength,attack_damage"
}
```

**實際範例**:

```csv
id,name,tags,effectProperties,modifiers,bonuses
fire_sword,烈焰之劍,"weapon,melee,sword,fire","burn,knockback","critical_chance","strength,attack_damage"
ice_bow,寒冰之弓,"weapon,ranged,bow,cold","freeze,slow","piercing,chain_attack","attack_speed"
```

**解析流程**:

```typescript
// 1️⃣ 讀取武器配置
const config = ConfigManager.getById('WeaponConfigs', 'fire_sword');

// 2️⃣ 解析三種屬性
const statusEffects = parseEffectProperties('burn,knockback');
// -> 從 StatusEffectDefinitions 查詢 burn 和 knockback 的完整數據

const modifiers = parseModifiers('critical_chance');
// -> 從 WeaponModifiers 查詢完整數據

const bonuses = parseBonuses('strength,attack_damage');
// -> 從 AttributeBonus 查詢完整數據

// 3️⃣ 組合成完整武器
const weapon = {
    baseDamage: 50,
    tags: ['weapon', 'melee', 'sword', 'fire'],
    statusEffects: [...],
    modifiers: [...],
    bonuses: [...]
};
```

---

### 6️⃣ TalentEffects - 天賦效果表

**角色**: 透過**標籤匹配**動態影響武器屬性

**關鍵欄位**:

```typescript
interface TalentEffect {
    talent_id: string;
    stat: string;              // 影響的屬性 (damage, attack_speed)
    value: number;             // 數值
    modifier_type: ModifierType;  // flat/increased/more
    affect_tags?: string;      // 🔗 標籤匹配! "fire,elemental"
    conditions?: string;       // 條件判斷 "wielding:sword"
}
```

**標籤匹配核心邏輯**:

```typescript
// TalentManager.applyTalentEffectsToProperties()

for (const effect of talentEffects) {
    // 🔍 檢查屬性是否有匹配的標籤
    if (TagMatcher.hasAnyTag(property.tags, effect.tags)) {
        // ✅ 匹配成功，應用天賦效果
        property.value = applyModifier(
            property.value, 
            effect.value, 
            effect.modifierType
        );
    }
}
```

**實際範例**:

```csv
talent_id,stat,value,modifier_type,affect_tags
fire_mastery,damage,15,increased,"fire,elemental"
sword_mastery,damage,20,increased,"sword,melee"
critical_mastery,critical_chance,10,increased,"combat,critical"
```

```typescript
// 武器: 烈焰之劍
weapon.tags = ['weapon', 'melee', 'sword', 'fire']

// 燃燒效果
burn.tags = ['fire', 'ailment', 'elemental']

// 天賦: 火焰精通 (affect_tags: "fire,elemental")
// ✅ burn 有 'fire' 標籤 -> 傷害 +15%

// 天賦: 劍類精通 (affect_tags: "sword,melee")
// ✅ weapon 有 'sword' 標籤 -> 傷害 +20%

// 總加成: 15% + 20% = 35% (INCREASED 加法疊加)
```

---

## 數據流向詳解

### 📥 完整數據流

```
┌─────────────────────────────────────┐
│ 1. Google Sheets (配置源頭)         │
│    - TagDefinitions                │
│    - StatusEffectDefinitions       │
│    - WeaponModifiers               │
│    - AttributeBonus                │
│    - WeaponConfigs                 │
│    - TalentConfigs / Effects       │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 2. GoogleSheetCache                │
│    - 下載 XLSX                      │
│    - 轉換為 JSON                    │
│    - 儲存到本地快取                 │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 3. ConfigManager                   │
│    - 提供查詢接口                   │
│    - getById() / getAll()          │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 4. WeaponPropertyService           │
│    - 解析 effectProperties          │
│    - 解析 modifiers                 │
│    - 解析 bonuses                   │
│    - 生成完整武器屬性                │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 5. WeaponFactory                   │
│    - 實例化具體武器類別              │
│    - BaseSword, Fireball 等         │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 6. WeaponSchema (武器實例)         │
│    - 儲存 JSON 格式屬性             │
│    - modifiersJson                 │
│    - bonusesJson                   │
│    - fixedProperties               │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 7. TalentManager                   │
│    - 計算角色天賦效果                │
│    - 🔗 透過標籤匹配武器屬性        │
│    - 應用 flat/increased/more       │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 8. WeaponDataService               │
│    - 計算最終屬性 (POE 公式)        │
│    - 應用武器詞綴                   │
│    - 生成顯示數據                   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 9. CombatSystem / DamageSystem     │
│    - 攻擊計算                       │
│    - 傷害計算                       │
│    - 狀態效果應用                   │
└─────────────────────────────────────┘
```

### 🔄 武器生成完整流程

```typescript
// ===== 步驟 1: 讀取配置 =====
const weaponConfig = ConfigManager.getById('WeaponConfigs', 'fire_sword');
// {
//   id: 'fire_sword',
//   tags: 'weapon,melee,sword,fire',
//   effectProperties: 'burn,knockback',
//   modifiers: 'critical_chance',
//   bonuses: 'strength,attack_damage'
// }

// ===== 步驟 2: 解析三種屬性 =====
const propertyData = WeaponPropertyService.getInstance().generateWeaponProperties(
    'fire_sword',
    'legendary'
);
// {
//   statusEffects: [
//     { id: 'burn', tags: ['fire', 'ailment', 'elemental'], ... },
//     { id: 'knockback', tags: ['physical', 'attack'], ... }
//   ],
//   modifiers: [
//     { id: 'critical_chance', affectedStat: 'critical_chance', baseValue: 15, ... }
//   ],
//   bonuses: [
//     { id: 'strength', affectedStat: 'strength', baseValue: 5, ... },
//     { id: 'attack_damage', affectedStat: 'attack_damage', baseValue: 10, ... }
//   ]
// }

// ===== 步驟 3: 實例化武器 =====
const weaponInstance = WeaponFactory.createWeapon('fire_sword');
// -> 創建 BaseSword 實例

// ===== 步驟 4: 創建 Schema =====
const weaponSchema = new WeaponSchema();
weaponSchema.weaponId = 'fire_sword';
weaponSchema.level = 1;
weaponSchema.rarity = 'legendary';

// 🔑 儲存為 JSON (重要!)
weaponSchema.modifiersJson = JSON.stringify(propertyData.modifiers);
weaponSchema.bonusesJson = JSON.stringify(propertyData.bonuses);

// ===== 步驟 5: 計算最終屬性 =====
const finalStats = WeaponDataService.calculateFinalStats(weaponSchema);
// {
//   weaponDamage: 50 + 10 (attack_damage bonus),  // 基礎 + 加成
//   attackRange: 150,
//   attackSpeed: 1200,
//   critRate: 5 * (1 + 0.15),  // 基礎 * (1 + 詞綴)
//   displayName: '烈焰之劍 (Lv.1)'
// }

// ===== 步驟 6: 應用天賦效果 (動態) =====
const modifiedStats = TalentManager.getInstance().applyTalentEffectsToProperties(
    characterId,
    weaponSchema.fixedProperties
);
// 🔗 標籤匹配: 
// - 天賦 "火焰精通" (affect_tags: "fire,elemental")
// - 燃燒效果 (tags: ['fire', 'ailment', 'elemental'])
// - ✅ 匹配成功! 傷害 +15%
```

---

## 標籤匹配機制

### 🎯 核心算法

你的系統使用 `TagMatcher` 類別進行標籤匹配：

```typescript
class TagMatcher {
    /**
     * 檢查是否有任一標籤匹配 (OR 邏輯)
     */
    static hasAnyTag(entityTags: string[], requiredTags: string[]): boolean {
        return requiredTags.some(tag => entityTags.includes(tag));
    }

    /**
     * 檢查是否所有標籤都匹配 (AND 邏輯)
     */
    static hasAllTags(entityTags: string[], requiredTags: string[]): boolean {
        return requiredTags.every(tag => entityTags.includes(tag));
    }

    /**
     * 解析逗號分隔的標籤字串
     */
    static parseTags(tagsString: string): string[] {
        return tagsString.split(',').map(t => t.trim().toLowerCase());
    }
}
```

### 📋 匹配場景分析

#### 場景 1: 天賦效果匹配武器屬性

```typescript
// 天賦: 火焰精通 +15% 傷害
const talentEffect = {
    stat: 'damage',
    value: 15,
    modifier_type: 'increased',
    affect_tags: 'fire,elemental'  // 🔗 匹配條件
};

// 燃燒效果
const burnProperty = {
    id: 'burn',
    tags: ['fire', 'ailment', 'elemental']
};

// 冰凍效果
const freezeProperty = {
    id: 'freeze',
    tags: ['cold', 'ailment', 'elemental']
};

// 匹配結果:
TagMatcher.hasAnyTag(burnProperty.tags, ['fire', 'elemental']);
// -> true ✅ (有 'fire' 標籤)

TagMatcher.hasAnyTag(freezeProperty.tags, ['fire', 'elemental']);
// -> true ✅ (有 'elemental' 標籤)

// ⚠️ 問題: freeze 也會被 fire_mastery 影響!
```

**潛在問題**: 使用 `hasAnyTag` 會導致 `火焰精通` 也影響 `冰凍`，因為兩者都有 `elemental` 標籤。

**建議改進**:

```typescript
// 方案 1: 使用 hasAllTags (更嚴格)
affect_tags: 'fire,elemental'  // 必須同時有 fire 和 elemental

// 方案 2: 排除標籤
affect_tags: 'fire,elemental'
exclude_tags: 'cold'  // 排除有 cold 的

// 方案 3: 標籤優先級
// fire > elemental (更具體的標籤優先匹配)
```

#### 場景 2: 武器詞綴匹配

```typescript
// WeaponDataService.applyWeaponModifiers()

const modifiers = [
    {
        id: 'critical_chance',
        affectedStat: 'critRate',  // 🔑 直接指定屬性
        baseValue: 15,
        modifierType: 'increased'
    }
];

// ✅ 不需要標籤匹配，直接修改 critRate 屬性
finalStats.critRate = baseValue * (1 + 0.15);
```

**優點**: 武器詞綴不需要標籤匹配，直接作用，效率高。

---

## POE 計算公式實現

### 🔢 三種修改器類型

你的系統完美實現了 POE 的三種修改器：

```typescript
enum ModifierType {
    FLAT = 'flat',              // 固定值 (+15)
    INCREASED = 'increased',    // 百分比加成 (+15%)
    MORE = 'more'               // 乘法加成 (更多 15%)
}
```

### 📐 計算順序 (POE 標準)

```typescript
最終數值 = (基礎值 + Σ所有FLAT) 
         × (1 + Σ所有INCREASED / 100) 
         × Π所有MORE的乘積
```

### 💡 實際實現

#### 武器詞綴計算 (`WeaponDataService`)

```typescript
// WeaponDataService.applyModifiersToStat()

private static applyModifiersToStat(
    affectedStat: string,
    modifiers: WeaponModifier[],
    finalStats: any
): void {
    const baseValue = finalStats[affectedStat] || 0;

    // 步驟 1: 分類修改器
    let flatSum = 0;           // FLAT 總和
    let increasedSum = 0;      // INCREASED 總和
    let moreProduct = 1;       // MORE 乘積

    for (const modifier of modifiers) {
        switch (modifier.modifierType) {
            case 'flat':
                flatSum += modifier.baseValue;
                break;
            case 'increased':
                increasedSum += modifier.baseValue;
                break;
            case 'more':
                moreProduct *= (1 + modifier.baseValue / 100);
                break;
        }
    }

    // 步驟 2: POE 公式計算
    let finalValue = baseValue;
    finalValue += flatSum;                          // 加上 FLAT
    finalValue *= (1 + increasedSum / 100);         // 乘以 INCREASED
    finalValue *= moreProduct;                      // 乘以 MORE

    // 步驟 3: 特殊處理
    if (affectedStat.includes('damage')) {
        finalValue = Math.floor(finalValue);  // 傷害取整
    }

    finalStats[affectedStat] = finalValue;
}
```

#### 天賦效果計算 (`TalentManager`)

```typescript
// TalentManager.modifyPropertyValue()

private modifyPropertyValue(
    property: PropertyValue,
    modifierValue: number,
    modifierType: ModifierType
): void {
    let currentValue = property.value;

    switch (modifierType) {
        case ModifierType.FLAT:
            currentValue += modifierValue;  // ✅ 固定值相加
            break;
        case ModifierType.INCREASED:
            currentValue *= (1 + modifierValue / 100);  // ✅ 百分比相乘
            break;
        case ModifierType.MORE:
            currentValue *= (1 + modifierValue / 100);  // ✅ 百分比相乘
            break;
    }

    property.value = currentValue;
}
```

**⚠️ 潛在問題**: `TalentManager` 的實現有誤！

```typescript
// ❌ 錯誤實現: INCREASED 和 MORE 應該分開計算
switch (modifierType) {
    case ModifierType.INCREASED:
        currentValue *= (1 + modifierValue / 100);  // 錯誤: 單獨相乘
        break;
    case ModifierType.MORE:
        currentValue *= (1 + modifierValue / 100);  // 錯誤: 單獨相乘
        break;
}

// ✅ 正確實現: 應該收集所有修改器後統一計算
// 參考 WeaponDataService.applyModifiersToStat() 的做法
```

### 📊 完整計算範例

```typescript
// 武器: 烈焰之劍
baseDamage = 50

// 武器詞綴:
modifiers = [
    { id: 'fire_damage_flat', value: 10, type: 'flat' },
    { id: 'critical_chance', value: 15, type: 'increased' }
]

// 角色屬性加成:
bonuses = [
    { id: 'attack_damage', value: 20, type: 'flat' },
    { id: 'strength', value: 5, type: 'flat' }  // 假設每點力量 = +2 攻擊力
]

// 天賦效果:
talents = [
    { stat: 'damage', value: 15, type: 'increased', tags: ['fire'] },
    { stat: 'damage', value: 20, type: 'increased', tags: ['sword'] },
    { stat: 'damage', value: 10, type: 'more', tags: ['melee'] }
]

// 計算步驟:
// 1. FLAT: 50 + 10 + 20 + (5*2) = 90
// 2. INCREASED: 90 * (1 + (15% + 20%)/100) = 90 * 1.35 = 121.5
// 3. MORE: 121.5 * (1 + 10%/100) = 121.5 * 1.1 = 133.65
// 4. 取整: 133

最終傷害 = 133
```

---

## 實戰案例分析

### 案例 1: 火焰劍 + 火焰精通天賦

```typescript
// ===== 配置 =====
const fireSword = {
    id: 'fire_sword',
    baseDamage: 50,
    tags: ['weapon', 'melee', 'sword', 'fire'],
    statusEffects: [
        {
            id: 'burn',
            tags: ['fire', 'ailment', 'elemental'],
            baseDamage: 10,
            damageScaling: 0.5  // 武器傷害的 50%
        }
    ],
    modifiers: [
        { id: 'critical_chance', affectedStat: 'critRate', value: 15, type: 'increased' }
    ]
};

const herTalents = [
    { stat: 'damage', value: 15, type: 'increased', affect_tags: 'fire,elemental' },
    { stat: 'damage', value: 20, type: 'increased', affect_tags: 'sword,melee' }
];

// ===== 計算流程 =====
// 1. 基礎武器傷害
weaponDamage = 50

// 2. 應用武器詞綴 (暴擊率)
critRate = 5 * (1 + 0.15) = 5.75%

// 3. 應用天賦效果到燃燒傷害
burnBaseDamage = 10
burnScaledDamage = 50 * 0.5 = 25
burnTotalDamage = 10 + 25 = 35

// 🔗 標籤匹配:
// - burn.tags = ['fire', 'ailment', 'elemental']
// - 天賦 1: affect_tags = ['fire', 'elemental'] -> ✅ 匹配 (有 fire)
// - 天賦 2: affect_tags = ['sword', 'melee'] -> ❌ 不匹配

burnFinalDamage = 35 * (1 + 0.15) = 40.25

// 4. 主手傷害
// 🔗 標籤匹配:
// - weapon.tags = ['weapon', 'melee', 'sword', 'fire']
// - 天賦 1: affect_tags = ['fire', 'elemental'] -> ✅ 匹配 (有 fire)
// - 天賦 2: affect_tags = ['sword', 'melee'] -> ✅ 匹配 (有 sword)

weaponFinalDamage = 50 * (1 + 0.15 + 0.20) = 67.5

// ===== 最終結果 =====
攻擊傷害: 67
燃燒傷害: 40 (每秒)
暴擊率: 5.75%
```

### 案例 2: 寒冰弓 + 元素精通 + 遠程精通

```typescript
// ===== 配置 =====
const iceBow = {
    id: 'ice_bow',
    baseDamage: 35,
    tags: ['weapon', 'ranged', 'bow', 'cold'],
    statusEffects: [
        { id: 'freeze', tags: ['cold', 'ailment', 'elemental'], duration: 2 },
        { id: 'slow', tags: ['cold', 'debuff', 'control'], duration: 3 }
    ],
    modifiers: [
        { id: 'piercing', affectedStat: 'pierceCount', value: 2, type: 'flat' },
        { id: 'chain_attack', affectedStat: 'chainCount', value: 3, type: 'flat' }
    ]
};

const heroTalents = [
    { stat: 'damage', value: 20, type: 'increased', affect_tags: 'cold,elemental' },
    { stat: 'damage', value: 10, type: 'increased', affect_tags: 'ranged,projectile' },
    { stat: 'damage', value: 15, type: 'increased', affect_tags: 'bow' },
    { stat: 'pierce_count', value: 1, type: 'flat', affect_tags: 'projectile' }
];

// ===== 計算流程 =====
// 1. 武器詞綴
pierceCount = 0 + 2 = 2  // 詞綴
chainCount = 0 + 3 = 3   // 詞綴

// 2. 天賦效果 (標籤匹配)
// weapon.tags = ['weapon', 'ranged', 'bow', 'cold']
// ✅ 天賦 1: 'cold' 匹配 -> +20%
// ✅ 天賦 2: 'ranged' 匹配 -> +10%
// ✅ 天賦 3: 'bow' 匹配 -> +15%
// ✅ 天賦 4: pierceCount (flat) -> +1

weaponDamage = 35 * (1 + 0.20 + 0.10 + 0.15) = 50.75
pierceCount = 2 + 1 = 3

// ===== 最終結果 =====
攻擊傷害: 50
穿透次數: 3
連鎖次數: 3
```

### 案例 3: 多層標籤匹配 (層級繼承)

```typescript
// 標籤層級:
// elemental
//   ├── fire
//   │   └── burn
//   └── cold
//       └── freeze

// 天賦: 元素精通
const elementalMastery = {
    stat: 'damage',
    value: 25,
    type: 'increased',
    affect_tags: 'elemental'  // 🔗 父級標籤
};

// 燃燒效果
burn.tags = ['fire', 'ailment', 'elemental']  // ✅ 有 elemental

// 冰凍效果
freeze.tags = ['cold', 'ailment', 'elemental']  // ✅ 有 elemental

// 物理傷害
physical.tags = ['physical', 'attack']  // ❌ 沒有 elemental

// 匹配結果:
// ✅ burn 受影響 (+25% 傷害)
// ✅ freeze 受影響 (+25% 傷害)
// ❌ physical 不受影響
```

---

## 潛在問題與建議

### ⚠️ 問題 1: 天賦效果計算邏輯錯誤

**位置**: `TalentManager.modifyPropertyValue()`

**問題**:

```typescript
// ❌ 錯誤實現
switch (modifierType) {
    case ModifierType.INCREASED:
        currentValue *= (1 + modifierValue / 100);  // 單獨相乘
        break;
    case ModifierType.MORE:
        currentValue *= (1 + modifierValue / 100);  // 單獨相乘
        break;
}
```

**為什麼錯誤**:

```typescript
// 假設有兩個 INCREASED 天賦
talent1 = { value: 15, type: 'increased' }
talent2 = { value: 20, type: 'increased' }

// ❌ 當前實現:
damage = 100
damage *= (1 + 0.15) = 115  // 第一個天賦
damage *= (1 + 0.20) = 138  // 第二個天賦

// ✅ POE 正確實現:
damage = 100 * (1 + (0.15 + 0.20)) = 135
```

**建議修正**:

```typescript
// 方案 1: 收集所有修改器後統一計算
public applyTalentEffectsToProperties(
    characterId: string,
    baseProperties: PropertyValue[]
): PropertyValue[] {
    const talentEffects = this.calculateTalentEffects(characterId);
    
    // 按屬性分組
    const effectsByProp = new Map<string, AppliedTalentEffect[]>();
    for (const effect of talentEffects) {
        if (!effectsByProp.has(effect.stat)) {
            effectsByProp.set(effect.stat, []);
        }
        effectsByProp.get(effect.stat)!.push(effect);
    }

    // 對每個屬性統一計算
    for (const [stat, effects] of effectsByProp) {
        const property = baseProperties.find(p => p.id === stat);
        if (!property) continue;

        // 收集所有修改器
        let flatSum = 0;
        let increasedSum = 0;
        let moreProduct = 1;

        for (const effect of effects) {
            switch (effect.modifierType) {
                case ModifierType.FLAT:
                    flatSum += effect.value;
                    break;
                case ModifierType.INCREASED:
                    increasedSum += effect.value;
                    break;
                case ModifierType.MORE:
                    moreProduct *= (1 + effect.value / 100);
                    break;
            }
        }

        // POE 公式計算
        let baseValue = property.value;
        let finalValue = baseValue;
        finalValue += flatSum;
        finalValue *= (1 + increasedSum / 100);
        finalValue *= moreProduct;

        property.value = finalValue;
    }

    return baseProperties;
}
```

---

### ⚠️ 問題 2: 標籤匹配過於寬鬆

**問題**: 使用 `hasAnyTag` 導致不應該匹配的屬性也被影響。

**範例**:

```typescript
// 天賦: 火焰精通
affect_tags: 'fire,elemental'

// 冰凍效果
freeze.tags = ['cold', 'ailment', 'elemental']

// ❌ 冰凍被火焰精通影響! (因為有共同的 'elemental' 標籤)
```

**建議方案**:

#### 方案 A: 標籤優先級

```typescript
class TagMatcher {
    /**
     * 帶優先級的標籤匹配
     * 優先匹配更具體的標籤 (子標籤 > 父標籤)
     */
    static hasMatchingTagsWithPriority(
        entityTags: string[],
        requiredTags: string[],
        excludeTags: string[] = []
    ): boolean {
        // 1. 檢查排除標籤
        if (excludeTags.some(tag => entityTags.includes(tag))) {
            return false;
        }

        // 2. 計算匹配權重
        const weights = requiredTags.map(tag => {
            if (!entityTags.includes(tag)) return 0;
            return this.getTagWeight(tag);  // 子標籤權重高
        });

        // 3. 只有高優先級標籤匹配才算成功
        return weights.some(w => w > TAG_WEIGHT_THRESHOLD);
    }
}
```

#### 方案 B: 排除標籤

```typescript
interface TalentEffect {
    affect_tags?: string;   // 影響的標籤
    exclude_tags?: string;  // 🆕 排除的標籤
}

// 範例:
{
    stat: 'damage',
    value: 20,
    modifier_type: 'increased',
    affect_tags: 'elemental',
    exclude_tags: 'cold'  // 排除冰元素
}
```

#### 方案 C: 全匹配模式

```typescript
interface TalentEffect {
    affect_tags?: string;
    match_mode?: 'any' | 'all';  // 🆕 匹配模式
}

// 範例:
{
    affect_tags: 'fire,elemental',
    match_mode: 'all'  // 必須同時有 fire 和 elemental
}
```

---

### ⚠️ 問題 3: 屬性名稱不統一

**問題**: 配置表和代碼中的屬性名稱格式不一致。

**範例**:

```typescript
// ❌ 配置表使用 snake_case
affectedStat: 'pierce_count'
affectedStat: 'chain_count'
affectedStat: 'critical_chance'

// ❌ 代碼使用 camelCase
finalStats.pierceCount
finalStats.chainCount
finalStats.criticalChance

// ✅ WeaponDataService 有轉換
private static convertToCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
```

**建議**: 

1. **統一使用一種格式** (建議 camelCase)
2. **在配置驗證層自動轉換**
3. **添加屬性名稱映射表**

```typescript
// WeaponStatConfigs 表
{
    statName: 'pierceCount',  // ✅ 使用 camelCase
    displayName: '穿透次數',
    type: 'number',
    configName: 'pierce_count'  // 🆕 配置表中的名稱
}
```

---

### ⚠️ 問題 4: 缺少標籤驗證

**問題**: 配置表中的標籤字串沒有驗證，容易出現拼寫錯誤。

**建議**:

```typescript
class TagValidator {
    /**
     * 驗證標籤是否存在於 TagDefinitions
     */
    static validateTags(tagsString: string): { valid: boolean, errors: string[] } {
        const tags = TagMatcher.parseTags(tagsString);
        const validTags = TagDefinitions.map(t => t.id);
        const errors: string[] = [];

        for (const tag of tags) {
            if (!validTags.includes(tag)) {
                errors.push(`未知標籤: ${tag}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// 在載入配置時驗證
const statusEffects = ConfigManager.getAll('StatusEffectDefinitions');
for (const effect of statusEffects) {
    const result = TagValidator.validateTags(effect.tags);
    if (!result.valid) {
        console.error(`❌ ${effect.id} 標籤錯誤:`, result.errors);
    }
}
```

---

### ⚠️ 問題 5: WeaponStatConfigs 利用不足

**現狀**: `WeaponStatConfigs` 表只用於驗證屬性名稱。

**潛力**: 可以作為所有屬性的中央配置。

**建議擴展**:

```typescript
interface WeaponStatConfig {
    statName: string;        // pierceCount
    type: 'number' | 'string' | 'boolean';
    description: string;
    
    // 🆕 擴展欄位
    displayName: string;     // '穿透次數'
    category: string;        // 'combat', 'mechanic', 'attribute'
    defaultValue: number;    // 預設值
    minValue?: number;       // 最小值
    maxValue?: number;       // 最大值
    formatType?: string;     // 'percentage', 'count', 'distance'
    icon?: string;           // 圖示
    tags?: string;           // 標籤
}
```

**使用方式**:

```typescript
// 1. 自動生成顯示文字
const statConfig = WeaponDataService.getStatConfig('pierceCount');
const displayText = `${statConfig.displayName}: ${value} ${statConfig.formatType}`;
// -> "穿透次數: 2 次"

// 2. 數值驗證
if (value < statConfig.minValue || value > statConfig.maxValue) {
    console.warn(`${statName} 超出範圍`);
}

// 3. UI 渲染
<StatDisplay 
    icon={statConfig.icon} 
    value={value} 
    format={statConfig.formatType} 
/>
```

---

## 總結與建議

### ✅ 系統優勢

1. **完全配置驅動**: 無需修改代碼即可擴展
2. **POE 風格計算**: flat/increased/more 清晰明確
3. **標籤靈活性**: 支持多標籤分類和層級關係
4. **職責分離**: StatusEffect / Modifier / Bonus 分離清晰
5. **動態匹配**: 天賦透過標籤自動影響武器屬性

### 🎯 核心數據流

```
Google Sheets (配置源頭)
    ↓
GoogleSheetCache (本地快取)
    ↓
ConfigManager (查詢接口)
    ↓
WeaponPropertyService (屬性生成)
    ↓
WeaponFactory (實例化)
    ↓
WeaponSchema (數據儲存)
    ↓
TalentManager (標籤匹配) ←─┐
    ↓                        │
WeaponDataService (計算)    │
    ↓                        │
CombatSystem (應用) ─────────┘
```

### 🔧 優先修復建議

1. **修正天賦計算邏輯** (最高優先級)
   - 改為收集所有修改器後統一計算
   - 參考 `WeaponDataService.applyModifiersToStat()`

2. **改進標籤匹配機制**
   - 添加排除標籤 (`exclude_tags`)
   - 支持匹配模式 (`match_mode: 'any' | 'all'`)
   - 添加標籤優先級

3. **統一屬性命名**
   - 配置表和代碼統一使用 camelCase
   - 或在 `WeaponStatConfigs` 添加映射表

4. **添加配置驗證**
   - 驗證標籤拼寫
   - 驗證屬性名稱
   - 驗證引用完整性

5. **擴展 WeaponStatConfigs**
   - 添加顯示名稱、格式化類型
   - 作為所有屬性的中央配置

### 📚 文檔建議

建議添加以下文檔:
1. **標籤命名規範** (如何設計新標籤)
2. **屬性擴展指南** (如何添加新屬性)
3. **天賦設計指南** (如何設計天賦效果)
4. **配置驗證清單** (上線前檢查項目)

### 🎮 後續擴展方向

1. **條件系統**
   - 支持複雜條件 (`wielding:sword AND level:>10`)
   - 動態條件評估

2. **疊加系統**
   - 詞綴疊加次數 (`count` 欄位)
   - 重複詞綴效果

3. **衝突解決**
   - 互斥詞綴 (穿透 vs 連鎖)
   - 優先級系統

4. **效果組合**
   - 特殊組合效果 (火+冰 = 蒸汽)
   - Combo 機制

---

**分析完成日期**: 2025-01-02  
**分析者**: AI Assistant  
**文檔版本**: 1.0

---

## 附錄: 快速查詢表

### A. 三種屬性類型對比

| 類型 | StatusEffect | WeaponModifier | AttributeBonus |
|------|--------------|----------------|----------------|
| 作用對象 | 目標 | 武器/攻擊者 | 持有者 |
| 持續時間 | 有 | 無 | 無 |
| 可堆疊 | 是 | 是 | 是 |
| 主要用途 | 異常狀態、DOT | 攻擊機制、暴擊 | 屬性加成 |
| 範例 | burn, freeze | piercing, chain | strength, attack_damage |

### B. 修改器類型計算

| 類型 | 公式 | 範例 | 疊加方式 |
|------|------|------|----------|
| FLAT | base + value | 100 + 15 = 115 | 相加 |
| INCREASED | base × (1 + value/100) | 100 × 1.15 = 115 | 百分比相加後相乘 |
| MORE | base × (1 + value/100) | 100 × 1.15 = 115 | 百分比相乘 |

### C. 標籤匹配模式

| 模式 | 邏輯 | 使用場景 |
|------|------|----------|
| hasAnyTag | OR | 寬鬆匹配，適合通用效果 |
| hasAllTags | AND | 嚴格匹配，適合專精效果 |
| 優先級 | 權重 | 避免父標籤過度匹配 |
| 排除 | NOT | 排除特定標籤 |

### D. 配置表依賴關係

```
TagDefinitions (基礎層)
    ↓ 被引用
StatusEffectDefinitions
WeaponModifiers
AttributeBonus
    ↓ 被組合
WeaponConfigs
    ↓ 被匹配
TalentEffects
```
