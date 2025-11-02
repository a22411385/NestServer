# 🏷️ POE 標籤系統 - 表關係完整分析

> **文檔目的**: 深入分析仿 POE (Path of Exile) 標籤系統的各表關係、數據流向和設計理念

## 📋 目錄

- [系統概述](#系統概述)
- [核心數據表](#核心數據表)
- [表關係圖](#表關係圖)
- [POE 風格設計理念](#poe-風格設計理念)
- [數據流向分析](#數據流向分析)
- [標籤匹配機制](#標籤匹配機制)
- [實際應用場景](#實際應用場景)

---

## 系統概述

### 🎯 核心理念

本系統仿照 **Path of Exile (POE)** 的標籤和修改器系統，實現了一套完全**配置驅動**的武器屬性系統。

**關鍵特點**：
- ✅ **標籤系統**: 使用字符串標籤而非枚舉，支持動態擴展
- ✅ **修改器類型**: POE 風格的 flat/increased/more 計算方式
- ✅ **層級關係**: 標籤支持父子層級（parent）
- ✅ **完全配置驅動**: 無需修改代碼即可新增屬性
- ✅ **標籤匹配**: 天賦和效果通過標籤進行動態匹配

### 📦 數據存儲

所有配置數據存儲在 `GoogleCacheData` 中，從 Google Sheets 同步：

```typescript
interface GoogleCacheData {
    TagDefinitions: TagDefinition[];              // 標籤定義（元數據）
    StatusEffectDefinitions: StatusEffectDefinition[];  // 狀態效果定義
    WeaponModifiers: WeaponModifier[];            // 武器詞綴定義
    AttributeBonus: AttributeBonus[];             // 屬性加成定義
    WeaponConfigs: WeaponConfigDefinition[];      // 武器配置
    MaterialConfigs: MaterialConfigDefinition[];  // 素材配置
    EnemyConfigs: EnemyConfigDefinition[];        // 敵人配置
    TalentConfigs: TalentConfig[];                // 天賦配置
    TalentEffects: TalentEffect[];                // 天賦效果
    lastUpdated: string;
}
```

---

## 核心數據表

### 1️⃣ TagDefinitions（標籤定義表）

**角色**: 元數據表，定義所有可用標籤

**用途**:
- 提供標籤的元數據（顯示名稱、描述、顏色、圖示）
- 建立標籤的層級關係（parent）
- 驗證其他表使用的標籤是否合法

**數據結構**:

```typescript
interface TagDefinition {
    id: string;              // 標籤ID (fire, ailment, melee)
    displayName: string;     // 顯示名稱（中文）
    description: string;     // 標籤說明
    category: TagCategory;   // 標籤類別 (element, ailment, attack_type, etc.)
    color?: string;          // UI 顯示顏色 (#FF0000)
    icon?: string;           // 圖示名稱或路徑
    parent?: string;         // 父級標籤ID（支援層級關係）
    enabled: boolean;        // 是否啟用
}

type TagCategory = 'element' | 'ailment' | 'attack_type' | 'weapon_type' | 'function' | 'category';
```

**範例數據**:

```csv
id,displayName,description,category,color,parent,enabled
elemental,元素,通用元素標籤,category,#FFFFFF,,TRUE
fire,火元素,火元素相關效果和傷害,element,#FF4500,elemental,TRUE
burn,燃燒,持續火焰傷害,ailment,#FF4500,fire,TRUE
ailment,異常狀態,造成異常狀態效果,category,#DC143C,,TRUE
```

**層級關係範例**:

```
elemental (元素通用)
├── fire (火元素)
│   └── burn (燃燒)
├── cold (冰元素)
│   ├── freeze (冰凍)
│   └── chill (冰緩)
└── lightning (雷電元素)
    ├── shock (電擊)
    └── stun (暈眩)
```

---

### 2️⃣ StatusEffectDefinitions（狀態效果定義表）

**角色**: 定義可以作用在目標身上的**臨時效果**（異常狀態、控制效果等）

**特性**:
- 有持續時間（duration）
- 可堆疊（stackable）
- 作用在目標身上（debuff 或 buff）
- 可以造成持續傷害（DOT）

**數據結構**:

```typescript
interface StatusEffectDefinition {
    id: string;                      // 效果ID (burn, stun, slow, freeze)
    displayName: string;             // 顯示名稱
    description: string;             // 描述
    tags: string;                    // 標籤 (逗號分隔："fire,ailment,elemental")

    // 基礎數值（POE 風格：固定值，不再有 min/max）
    baseProbability: number;         // 基礎觸發機率 (0-100)
    duration: number;                // 持續時間 (秒)
    baseDamage: number;              // 基礎傷害
    damageScaling: number;           // 傷害縮放 (武器攻擊力的百分比)

    // 修改器類型
    defaultModifierType: ModifierType; // flat, increased, more

    category: CategoryKey;           // 屬性類別 (combat, debuff, buff, attribute)
    stackable: boolean;              // 是否可堆疊
}
```

**範例數據**:

```csv
id,displayName,description,tags,baseProbability,duration,baseDamage,damageScaling,defaultModifierType,category,stackable
burn,燃燒,持續造成火焰傷害,"fire,ailment,elemental,debuff",30,5,10,0.5,flat,debuff,TRUE
freeze,冰凍,完全凍結目標,"cold,ailment,elemental,debuff,control",20,2,0,0,flat,debuff,FALSE
slow,減速,降低移動速度,"cold,debuff,control",40,3,0,0,flat,debuff,TRUE
```

**應用場景**:
- 武器攻擊時施加 Debuff
- 技能造成異常狀態
- 持續傷害效果（燃燒、中毒、流血）

---

### 3️⃣ WeaponModifiers（武器詞綴定義表）

**角色**: 定義武器的**固定特性和攻擊機制**

**特性**:
- 永久性（無持續時間）
- 改變攻擊方式（穿透、連鎖、濺射）
- 影響戰鬥數值（暴擊率、攻速）
- 作用在攻擊者身上

**數據結構**:

```typescript
interface WeaponModifier {
    id: string;                      // 詞綴ID (piercing, chain_attack, critical_chance)
    displayName: string;             // 顯示名稱
    description: string;             // 描述
    tags: string;                    // 標籤 (逗號分隔："attack,mechanic,pierce")

    // 詞綴數值
    baseValue: number;               // 基礎數值
    valueType: 'count' | 'percentage' | 'distance' | 'degree'; // 數值類型

    // 修改器配置
    modifierType: ModifierType;      // 修改器類型
    affectedStat: string;            // 影響的屬性 (如 'damage', 'speed', 'pierce_count')

    category: 'attack_mechanic' | 'combat_stat' | 'support'; // 類別
    stackable: boolean;              // 是否可堆疊
    enabled: boolean;                // 是否啟用
}
```

**範例數據**:

```csv
id,displayName,description,tags,baseValue,valueType,modifierType,affectedStat,category,stackable,enabled
piercing,穿透,攻擊可穿透敵人,"attack,mechanic,pierce",2,count,flat,pierce_count,attack_mechanic,TRUE,TRUE
chain_attack,連鎖攻擊,攻擊會跳躍到附近敵人,"attack,mechanic,chain",3,count,flat,chain_count,attack_mechanic,FALSE,TRUE
critical_chance,暴擊率,增加暴擊機率,"combat,critical",15,percentage,increased,critical_chance,combat_stat,TRUE,TRUE
knockback,擊退,攻擊擊退敵人,"physical,attack,mechanic",50,distance,flat,knockback_force,attack_mechanic,TRUE,TRUE
```

**應用場景**:
- 定義武器的攻擊機制（連鎖、穿透、範圍）
- 物理效果（擊退、擊飛）
- 暴擊、攻速等戰鬥數值

---

### 4️⃣ AttributeBonus（屬性加成定義表）

**角色**: 定義角色/武器的**永久性屬性加成**

**特性**:
- 永久性（無持續時間）
- 影響基礎屬性（力量、敏捷、智力）
- 影響戰鬥數值（攻擊力、生命、防禦）
- 作用在持有者身上

**數據結構**:

```typescript
interface AttributeBonus {
    id: string;                      // 屬性ID (strength, vitality, attack_damage)
    displayName: string;             // 顯示名稱
    description: string;             // 描述
    tags: string;                    // 標籤 (逗號分隔："attribute,character,physical")

    // 加成數值
    baseValue: number;               // 基礎加成值

    // 修改器配置
    modifierType: ModifierType;      // 修改器類型 (flat, increased, more)
    affectedStat: string;            // 影響的屬性 (如 'strength', 'max_health', 'attack_damage')

    category: 'character_stat' | 'weapon_stat'; // 類別
    stackable: boolean;              // 是否可堆疊
    enabled: boolean;                // 是否啟用
}
```

**範例數據**:

```csv
id,displayName,description,tags,baseValue,modifierType,affectedStat,category,stackable,enabled
strength,力量,增加力量屬性,"attribute,character,physical",5,flat,strength,character_stat,TRUE,TRUE
attack_damage,攻擊傷害,增加攻擊傷害,"combat,damage,physical",10,flat,attack_damage,weapon_stat,TRUE,TRUE
attack_speed,攻擊速度,增加攻擊速度,"combat,speed",0.1,increased,attack_speed,weapon_stat,TRUE,TRUE
max_health,最大生命,增加最大生命值,"character,defense",20,flat,max_health,character_stat,TRUE,TRUE
```

**應用場景**:
- 武器提供的屬性加成
- 角色基礎屬性提升
- 裝備詞綴

---

### 5️⃣ WeaponConfigs（武器配置表）

**角色**: 定義具體的武器實例，**組合**上述三種屬性

**特性**:
- 引用 StatusEffectDefinitions（effectProperties）
- 引用 WeaponModifiers（modifiers）
- 引用 AttributeBonus（bonuses）
- 定義武器的基礎屬性和實例化信息

**數據結構**:

```typescript
interface WeaponConfigDefinition {
    id: string;
    name: string;
    description: string;

    // 標籤系統（取代 elementType）
    tags: string;                    // 標籤列表 (逗號分隔："weapon,melee,sword,fire")

    // 基礎屬性
    baseDamage: number;
    attackSpeed: number;
    attackRange: number;

    // 武器類別（用於實例化）
    weaponClass: string;             // BaseSword, Fireball, etc.
    classModule: string;             // MeleeWeapon, ProjectileWeapon, etc.
    projectileClass?: string;        // 投射物類別（遠程武器）

    // 🔗 引用其他三張表（逗號分隔）
    effectProperties: string;        // 狀態效果列表 (burn,stun,freeze)
    modifiers: string;               // 武器詞綴列表 (piercing,chain_attack)
    bonuses: string;                 // 屬性加成列表 (strength,attack_damage)
    
    enabled: boolean;
}
```

**範例數據**:

```csv
id,name,description,tags,baseDamage,attackSpeed,attackRange,weaponClass,classModule,effectProperties,modifiers,bonuses,enabled
fire_sword,烈焰之劍,燃燒敵人的火焰劍,"weapon,melee,sword,fire",50,1.2,150,BaseSword,MeleeWeapon,"burn,knockback","critical_chance,lifesteal","strength,attack_damage",TRUE
ice_bow,寒冰之弓,緩速並凍結敵人,"weapon,ranged,bow,cold",35,2.0,600,BaseProjectile,ProjectileWeapon,"freeze,slow","piercing,chain_attack","attack_speed,critical_chance",TRUE
```

**解析過程**:

```typescript
// 1. 從 WeaponConfigs 讀取武器配置
const weaponConfig = ConfigManager.getById<WeaponConfigDefinition>('WeaponConfigs', 'fire_sword');

// 2. 解析三種屬性
const statusEffects = parseEffectProperties(weaponConfig.effectProperties); 
// -> ["burn", "knockback"]

const modifiers = parseModifiers(weaponConfig.modifiers); 
// -> ["critical_chance", "lifesteal"]

const bonuses = parseBonuses(weaponConfig.bonuses); 
// -> ["strength", "attack_damage"]

// 3. 從對應的定義表查詢詳細數據
const burnDef = ConfigManager.getById<StatusEffectDefinition>('StatusEffectDefinitions', 'burn');
const criticalDef = ConfigManager.getById<WeaponModifier>('WeaponModifiers', 'critical_chance');
const strengthDef = ConfigManager.getById<AttributeBonus>('AttributeBonus', 'strength');
```

---

### 6️⃣ TalentConfigs + TalentEffects（天賦系統）

**角色**: 定義角色的天賦樹和天賦效果

**特性**:
- TalentConfigs: 天賦節點定義（名稱、位置、前置需求）
- TalentEffects: 天賦效果定義（通過標籤匹配影響屬性）

**數據結構**:

```typescript
interface TalentConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: TalentCategory;
    position_x: number;
    position_y: number;
    max_points: number;
    prerequisites: string;          // 逗號分隔的前置天賦ID
    is_active: boolean;
}

interface TalentEffect {
    talent_id: string;

    // POE 風格
    stat: string;                   // 影響的屬性 (damage, attack_speed, burn_chance)
    value: number;                  // 數值
    modifier_type: ModifierType;    // 修改器類型 (flat, increased, more)

    // 🔗 標籤匹配系統
    affect_tags?: string;           // 影響的標籤 (逗號分隔："sword,melee")
    conditions?: string;            // 條件字符串 (wielding:sword)
}
```

**範例數據**:

```csv
# TalentConfigs
id,name,description,category,max_points,prerequisites
fire_mastery,火焰精通,增加火焰傷害,COMBAT,5,

# TalentEffects
talent_id,stat,value,modifier_type,affect_tags
fire_mastery,damage,15,increased,"fire,elemental"
```

**標籤匹配機制**:

```typescript
// 天賦效果只影響擁有特定標籤的屬性
const talentEffect = {
    talent_id: 'fire_mastery',
    stat: 'damage',
    value: 15,
    modifier_type: 'increased',
    affect_tags: 'fire,elemental'
};

// 檢查屬性是否受影響
const burnProperty = { id: 'burn', tags: ['fire', 'ailment', 'elemental'] };
const freezeProperty = { id: 'freeze', tags: ['cold', 'ailment', 'elemental'] };

// ✅ burn 有 fire 標籤 -> 受影響
// ❌ freeze 沒有 fire 標籤 -> 不受影響
```

---

## 表關係圖

### 🔗 整體關係圖

```
┌─────────────────────────────────────────────────────────────────┐
│                      TagDefinitions                             │
│                    (標籤定義 - 元數據)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ id, displayName, description, category, parent, ...      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           ▲  ▲  ▲
                           │  │  │
            ┌──────────────┘  │  └──────────────┐
            │                 │                 │
         tags              tags              tags
            │                 │                 │
            ▼                 ▼                 ▼
┌─────────────────┐ ┌──────────────────┐ ┌────────────────┐
│ StatusEffect    │ │ WeaponModifiers  │ │ AttributeBonus │
│ Definitions     │ │  (武器詞綴)       │ │  (屬性加成)     │
│ (狀態效果)       │ │                  │ │                │
│                 │ │                  │ │                │
│ • burn          │ │ • piercing       │ │ • strength     │
│ • freeze        │ │ • chain_attack   │ │ • attack_damage│
│ • slow          │ │ • critical_chance│ │ • attack_speed │
└─────────────────┘ └──────────────────┘ └────────────────┘
            ▲                 ▲                 ▲
            │                 │                 │
            │    effectProperties, modifiers, bonuses
            │                 │                 │
            └─────────────────┴─────────────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │    WeaponConfigs         │
                │    (武器配置)             │
                │                          │
                │ effectProperties:        │
                │   "burn,knockback"       │
                │ modifiers:               │
                │   "critical,piercing"    │
                │ bonuses:                 │
                │   "strength,attack_dmg"  │
                └──────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Weapon Instance  │
                    │  (實例化武器)     │
                    └──────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    TalentEffects (天賦效果)                      │
│                                                                 │
│  affect_tags: "fire,elemental"                                 │
│  stat: "damage"                                                │
│  modifier_type: "increased"                                    │
│  value: 15                                                     │
└─────────────────────────────────────────────────────────────────┘
                           │
                    標籤匹配 (tags matching)
                           │
                           ▼
            ┌──────────────────────────────┐
            │    PropertyValue (屬性實例)   │
            │                              │
            │  id: "burn"                  │
            │  tags: ["fire", "ailment"]   │
            │  value: 10 + 15% = 11.5     │◄─ 天賦影響
            └──────────────────────────────┘
```

### 🔄 數據流向

```
1. Google Sheets (配置源頭)
          ↓
2. GoogleSheetCache (快取層)
          ↓
3. ConfigManager (查詢接口)
          ↓
4. WeaponPropertyService (屬性生成)
          ↓
5. WeaponInstance (武器實例)
          ↓
6. CombatSystem (戰鬥應用)
```

---

## POE 風格設計理念

### 1️⃣ 修改器類型（ModifierType）

仿照 POE 的三種修改器：

```typescript
enum ModifierType {
    FLAT = 'flat',              // 固定值加成 (+15)
    INCREASED = 'increased',    // 百分比加成，加法疊加 (+15%)
    MORE = 'more'               // 百分比乘法，乘法疊加 (更多 15%)
}
```

**計算公式**（POE 風格）：

```typescript
最終數值 = (基礎值 + 所有FLAT加成) 
         × (1 + 所有INCREASED加成) 
         × 所有MORE乘法器的乘積

// 範例
基礎傷害 = 100
FLAT: +20, +30 (合計 +50)
INCREASED: +15%, +20%, +10% (合計 +45%)
MORE: ×1.2, ×1.15

最終傷害 = (100 + 50) × (1 + 0.45) × 1.2 × 1.15
        = 150 × 1.45 × 1.2 × 1.15
        = 302.85
```

### 2️⃣ 標籤匹配系統

使用字符串標籤而非枚舉：

```typescript
// ❌ 舊系統：枚舉
enum PropertyType {
    BURN,
    FREEZE,
    FIRE_BURN,
    ICE_FREEZE,
    // 需要不斷新增...
}

// ✅ 新系統：標籤
const burn = { id: 'burn', tags: 'fire,ailment,elemental' };
const freeze = { id: 'freeze', tags: 'cold,ailment,elemental' };
```

**優勢**：
- 無需修改代碼即可新增屬性
- 支持多標籤分類
- 天賦效果可通過標籤動態匹配

### 3️⃣ 層級標籤系統

支持標籤的父子關係：

```
elemental (元素)
├── fire (火)
│   └── burn (燃燒)
└── cold (冰)
    └── freeze (冰凍)
```

**查詢優勢**：

```typescript
// 查詢所有火元素屬性
findByTag('fire', { includeChildren: true });
// -> 返回 fire + burn

// 查詢所有元素屬性
findByTag('elemental', { includeChildren: true });
// -> 返回 elemental + fire + cold + burn + freeze
```

---

## 數據流向分析

### 📥 配置載入流程

```typescript
// 1. 初始化快取
await GoogleSheetCache.getInstance().init();

// 2. 載入到 ConfigManager
ConfigManager.loadCache();

// 3. 初始化屬性系統
await WeaponPropertyService.getInstance().initialize();

// 4. 初始化天賦系統
await TalentManager.getInstance().initialize();
```

### 🔨 武器生成流程

```typescript
// 1. 讀取武器配置
const weaponConfig = ConfigManager.getById<WeaponConfigDefinition>(
    'WeaponConfigs', 
    'fire_sword'
);

// 2. 生成武器屬性
const properties = WeaponPropertyService.getInstance().generateWeaponProperties(
    'fire_sword', 
    'legendary'
);

// 返回：
{
    statusEffects: [
        { id: 'burn', value: 10, probability: 30, ... }
    ],
    modifiers: [
        { id: 'critical_chance', baseValue: 15, ... }
    ],
    bonuses: [
        { id: 'strength', baseValue: 5, ... }
    ]
}

// 3. 實例化武器
const weapon = new FireSword(weaponConfig, properties);
```

### ⚔️ 戰鬥應用流程

```typescript
// 1. 攻擊計算
const damageInfo: DamageInfo = {
    attacker: hero,
    target: enemy,
    baseDamage: weapon.baseDamage,
    elementTags: ['fire', 'elemental'],  // 🔗 從武器標籤讀取
    weaponModifiers: weapon.modifiers     // 🔗 武器詞綴
};

// 2. 傷害系統計算
const result = DamageSystem.calculateFinalDamage(damageInfo);

// 內部計算：
// - 基礎傷害 + Hero 的 attackDamage (FLAT)
// - 元素傷害加成（通過標籤匹配）
// - 天賦效果（通過標籤匹配）
// - 目標防禦減免

// 3. 應用效果
CombatSystem.applyStatusEffects(
    target, 
    weapon.statusEffects // 🔗 狀態效果定義
);
```

### 🌟 天賦影響流程

```typescript
// 1. 計算角色天賦效果
const talentEffects = TalentManager.getInstance().calculateTalentEffects(characterId);

// 返回：
[
    {
        talentId: 'fire_mastery',
        stat: 'damage',
        modifierType: 'increased',
        value: 15,
        tags: ['fire', 'elemental']  // 🔗 標籤匹配
    }
]

// 2. 應用到武器屬性
const modifiedProperties = TalentManager.getInstance().applyTalentEffectsToProperties(
    characterId,
    weapon.properties
);

// 內部邏輯：
for (const effect of talentEffects) {
    // 🔗 標籤匹配：只影響擁有對應標籤的屬性
    if (hasMatchingTags(property.tags, effect.tags)) {
        property.value = applyModifier(
            property.value, 
            effect.value, 
            effect.modifierType
        );
    }
}
```

---

## 標籤匹配機制

### 🎯 匹配算法

```typescript
/**
 * 檢查屬性是否匹配標籤條件
 * @param propertyTags 屬性的標籤列表 ["fire", "ailment"]
 * @param matchTags 匹配條件標籤 ["fire", "elemental"]
 * @param matchMode 匹配模式 ('any' | 'all')
 */
function hasMatchingTags(
    propertyTags: string[], 
    matchTags: string[], 
    matchMode: 'any' | 'all' = 'any'
): boolean {
    if (matchMode === 'any') {
        // 任意匹配：至少有一個標籤相同
        return propertyTags.some(tag => matchTags.includes(tag));
    } else {
        // 全部匹配：所有標籤都必須存在
        return matchTags.every(tag => propertyTags.includes(tag));
    }
}
```

**範例**：

```typescript
const burnProperty = { id: 'burn', tags: ['fire', 'ailment', 'elemental'] };
const freezeProperty = { id: 'freeze', tags: ['cold', 'ailment', 'elemental'] };

// 天賦：火焰精通 +15% 傷害
const fireTalent = { affect_tags: ['fire', 'elemental'] };

hasMatchingTags(burnProperty.tags, fireTalent.affect_tags, 'any');
// -> true (有 fire)

hasMatchingTags(freezeProperty.tags, fireTalent.affect_tags, 'any');
// -> true (有 elemental)

hasMatchingTags(freezeProperty.tags, fireTalent.affect_tags, 'all');
// -> false (缺少 fire)
```

### 🔍 標籤層級查詢

```typescript
/**
 * 獲取標籤的完整路徑（包含父級）
 */
function getTagPath(tagId: string): string[] {
    const tag = TagDefinitions.find(t => t.id === tagId);
    if (!tag) return [];
    
    if (!tag.parent) return [tagId];
    
    // 遞迴獲取父級路徑
    return [...getTagPath(tag.parent), tagId];
}

// 範例
getTagPath('burn');
// -> ['elemental', 'fire', 'burn']

getTagPath('freeze');
// -> ['elemental', 'cold', 'freeze']
```

---

## 實際應用場景

### 場景 1: 火焰劍攻擊（標籤匹配）

```typescript
// 1. 武器定義
const fireSwordConfig = {
    id: 'fire_sword',
    tags: 'weapon,melee,sword,fire',
    effectProperties: 'burn',  // 🔗 引用 StatusEffectDefinitions
    modifiers: 'critical_chance',  // 🔗 引用 WeaponModifiers
    bonuses: 'strength,attack_damage'  // 🔗 引用 AttributeBonus
};

// 2. 生成武器實例
const weapon = WeaponPropertyService.getInstance().generateWeaponProperties(
    'fire_sword', 
    'legendary'
);

// weapon.statusEffects[0]:
{
    id: 'burn',
    tags: ['fire', 'ailment', 'elemental'],
    probability: 30,
    baseDamage: 10,
    duration: 5
}

// 3. 英雄有天賦：火焰精通
const heroTalents = [
    {
        stat: 'damage',
        value: 15,
        modifier_type: 'increased',
        affect_tags: ['fire', 'elemental']  // 🔗 標籤匹配
    }
];

// 4. 攻擊計算
const damageInfo = {
    attacker: hero,
    target: enemy,
    baseDamage: weapon.baseDamage,  // 50
    elementTags: ['fire', 'elemental']  // 🔗 從武器標籤提取
};

// 5. 傷害計算（自動套用天賦加成）
最終傷害 = 50 × (1 + 0.15) = 57.5
// 因為 elementTags 有 'fire'，匹配到天賦效果

// 6. 施加狀態效果
CombatSystem.applyStatusEffects(enemy, weapon.statusEffects);
// -> 敵人獲得 burn 效果，每秒受到 10 火焰傷害
```

### 場景 2: 寒冰弓攻擊（多標籤匹配）

```typescript
// 1. 武器定義
const iceBowConfig = {
    id: 'ice_bow',
    tags: 'weapon,ranged,bow,cold',
    effectProperties: 'freeze,slow',  // 🔗 兩種狀態效果
    modifiers: 'piercing,chain_attack',  // 🔗 兩種攻擊機制
    bonuses: 'attack_speed,critical_chance'  // 🔗 兩種屬性加成
};

// 2. 英雄有多個天賦
const heroTalents = [
    { affect_tags: ['cold', 'elemental'], value: 20 },  // 冰元素精通
    { affect_tags: ['ranged', 'projectile'], value: 10 },  // 遠程武器精通
    { affect_tags: ['bow'], value: 15 }  // 弓箭精通
];

// 3. 標籤匹配結果
武器標籤: ['weapon', 'ranged', 'bow', 'cold']
freeze 標籤: ['cold', 'ailment', 'elemental']

// ✅ 冰元素精通 -> 匹配（cold）
// ✅ 遠程武器精通 -> 匹配（ranged）
// ✅ 弓箭精通 -> 匹配（bow）

總加成 = 20% + 10% + 15% = 45% (INCREASED)
```

### 場景 3: 持續傷害效果（標籤繼承）

```typescript
// 1. 燃燒效果的持續傷害計算
const burnEffect = {
    id: 'burn',
    tags: ['fire', 'ailment', 'elemental'],
    baseDamage: 10,  // 每秒 10 點傷害
    damageScaling: 0.5  // 武器攻擊力的 50%
};

// 2. 通過 DamageSystem 計算
const damageInfo = {
    attacker: hero,
    target: enemy,
    baseDamage: burnEffect.baseDamage + weapon.baseDamage * burnEffect.damageScaling,
    elementTags: burnEffect.tags,  // 🔗 ['fire', 'ailment', 'elemental']
    debuffType: 'burn'
};

// 3. 自動套用加成
// - Hero 的 attackDamage (力量加成)
// - 火焰傷害加成 (通過 'fire' 標籤匹配)
// - 元素傷害加成 (通過 'elemental' 標籤匹配)
// - 天賦效果 (通過標籤匹配)

// 4. StatusEffectSystem 每秒執行
StatusEffectSystem.applyDamageOverTime(enemy, burnEffect);
```

### 場景 4: 天賦樹設計（標籤組合）

```csv
# 通用傷害天賦
talent_id,stat,value,modifier_type,affect_tags,conditions
all_damage,damage,10,increased,,
weapon_damage,damage,15,increased,"weapon",

# 元素專精天賦
fire_mastery,damage,20,increased,"fire,elemental",
cold_mastery,damage,20,increased,"cold,elemental",

# 武器類型專精
sword_mastery,damage,15,increased,"sword,melee",
bow_mastery,damage,15,increased,"bow,ranged",

# 異常狀態專精
ailment_mastery,probability,25,increased,"ailment",
burn_mastery,damage,30,more,"burn",wielding:fire
```

**效果堆疊範例**：

```typescript
// 使用火焰劍的英雄點滿以下天賦
const heroTalents = [
    { stat: 'damage', value: 10, affect_tags: [] },  // 全域傷害
    { stat: 'damage', value: 15, affect_tags: ['weapon'] },  // 武器傷害
    { stat: 'damage', value: 20, affect_tags: ['fire', 'elemental'] },  // 火焰精通
    { stat: 'damage', value: 15, affect_tags: ['sword', 'melee'] },  // 劍類精通
    { stat: 'probability', value: 25, affect_tags: ['ailment'] },  // 異常機率
    { stat: 'damage', value: 30, modifier_type: 'more', affect_tags: ['burn'] }  // 燃燒強化
];

// 燃燒效果的最終計算
基礎傷害 = 10
INCREASED = 10% + 15% + 20% + 15% = 60%
MORE = 30%

最終傷害 = 10 × (1 + 0.6) × 1.3 = 20.8
```

---

## 總結

### ✅ 系統優勢

1. **完全配置驅動**: 無需修改代碼即可新增武器/屬性
2. **標籤靈活性**: 支持多標籤分類和層級關係
3. **POE 風格計算**: 清晰的 flat/increased/more 修改器
4. **動態匹配**: 天賦和效果通過標籤自動匹配
5. **可擴展性**: 三種屬性（StatusEffect, Modifier, Bonus）分離，職責清晰

### 📊 表關係總覽

```
TagDefinitions (元數據)
    ↓ 被引用
StatusEffectDefinitions (臨時效果)
WeaponModifiers (攻擊機制)
AttributeBonus (永久加成)
    ↓ 被組合
WeaponConfigs (武器實例)
    ↓ 應用到
Combat/Damage/StatusEffect Systems
    ↑ 影響
TalentEffects (通過標籤匹配)
```

### 🎯 核心概念

- **標籤系統**: 取代枚舉，使用字符串標籤進行動態分類和匹配
- **修改器類型**: flat/increased/more 決定數值如何計算
- **三種屬性**: StatusEffect（臨時）、Modifier（機制）、Bonus（永久）
- **標籤匹配**: 天賦效果通過標籤動態影響屬性
- **層級關係**: 標籤支持父子關係，便於查詢和繼承

---

**文檔版本**: 1.0  
**最後更新**: 2025-01-02  
**維護者**: System Architect
