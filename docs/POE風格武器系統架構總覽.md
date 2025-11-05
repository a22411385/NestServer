# POE 風格武器系統架構總覽

## 📌 核心設計哲學

遵循 **Path of Exile (POE)** 的設計理念：
- **標籤 (Tags)** = 特徵標記，用於分類和匹配
- **詞綴 (Modifiers)** = 行為模組，類似輔助寶石
- **屬性 (Properties)** = 數值加成，支援 FLAT/INCREASED/MORE 三種類型
- **配置驅動** = 所有數據從 Google Sheets 載入，無需修改代碼

---

## 🏗️ 系統架構圖

```
Google Sheets (配置源)
├── TagDefinitions (標籤定義)
├── WeaponModifiers (武器詞綴)
├── WeaponConfigs (武器配置)
├── StatusEffectDefinitions (狀態效果)
└── AttributeBonus (屬性加成)
        ↓
    緩存層 (google-sheets-cache.json)
        ↓
    ┌─────────────────────────────────────┐
    │    武器系統核心組件                    │
    └─────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────┐
│ 1. WeaponSchema (數據層)                   │
│    - getModifiers()                       │
│    - getProperties()                      │
│    - getBonuses()                         │
│    - getTags() (透過 WeaponBasic)         │
└───────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────┐
│ 2. BonusCalculator (計算層)                │
│    - getPropertyBonus(propertyId, unit)   │
│      → 遍歷武器的 properties              │
│      → 根據 modifierType 分類             │
│      → 返回 { flat, increased, more }     │
│                                           │
│    - applyBonus(base, bonus)              │
│      → POE 公式：                          │
│        (base + flat) × (1+inc) × more     │
│                                           │
│    - getElementDamageBonus(unit, tags)    │
│      → 使用 TagService 追溯標籤族系       │
│      → 自動推斷元素類型                   │
└───────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────┐
│ 3. BehaviorResolver (行為層)               │
│    - getBehaviorsFromModifiers()          │
│      → 檢查詞綴標籤與武器標籤匹配         │
│      → 轉換為 Behavior 對象               │
│      → 返回給 HitHandler 執行             │
└───────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────┐
│ 4. HitHandler (執行層)                     │
│    - handle(context)                      │
│      → 執行主要目標傷害                   │
│      → 執行額外行為 (AOE/Chain/Split)     │
│      → 使用 BonusCalculator 計算加成      │
└───────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────┐
│ 5. DamageSystem (傷害層)                   │
│    - calculateFinalDamage()               │
│      → 使用 BonusCalculator 計算暴擊      │
│      → 使用 BonusCalculator 計算元素傷害  │
│      → 應用生命偷取                       │
└───────────────────────────────────────────┘
```

---

## 🔄 數據流示例

### 範例 1：計算範圍效果半徑

```typescript
// 1. 武器配置 (Google Sheets)
WeaponConfigs: {
    id: "fire_bow",
    tags: "weapon,projectile,bow,fire",
    modifiers: "area_of_effect,splash_damage" // ← 詞綴列表
}

WeaponModifiers: {
    id: "area_of_effect",
    baseValue: 20,              // ← 基礎值 20
    modifierType: "increased",  // ← 類型：百分比
    affectedStat: "area_radius"
}

// 2. 武器實例創建時
WeaponSchema.applyAllProperties({
    modifiers: [
        { id: "area_of_effect", baseValue: 20, modifierType: "increased", ... }
    ]
});

// 3. 執行 AOE 爆炸時 (HitHandler)
const baseRadius = 100; // 基礎半徑

// ✅ 使用 BonusCalculator 獲取所有來源的加成
const bonus = BonusCalculator.getPropertyBonus('area_of_effect', attacker);
// → { flat: 0, increased: 0.2, more: 1 }

// ✅ 應用 POE 公式
const finalRadius = BonusCalculator.applyBonus(baseRadius, bonus);
// → (100 + 0) × (1 + 0.2) × 1 = 120

console.log(`🎯 最終範圍：${finalRadius}`);
// → 🎯 最終範圍：120
```

### 範例 2：元素傷害加成（標籤驅動）

```typescript
// 1. 標籤定義 (Google Sheets)
TagDefinitions: [
    { id: "fire", category: "element" },       // 根元素
    { id: "burn", parent: "fire", category: "ailment" } // 衍生標籤
]

// 2. 武器配置
WeaponConfigs: {
    id: "fire_sword",
    tags: "weapon,melee,sword,fire",
    effectProperties: "burn"  // ← 燃燒效果
}

// 3. 計算傷害時
const elementTags = ['burn']; // 技能標籤

// ✅ 自動追溯標籤族系
const bonus = BonusCalculator.getElementDamageBonus(hero, elementTags);
// 內部流程：
// 1. TagService.getTagPath('burn') → ['burn', 'fire']
// 2. 找到 category='element' → 'fire'
// 3. 構造屬性 ID → 'fire_damage'
// 4. BonusCalculator.getPropertyBonus('fire_damage', hero)
// 5. 返回加成百分比 → 0.3 (30%)

const finalDamage = baseDamage * (1 + bonus);
// → 100 × 1.3 = 130
```

### 範例 3：Behavior 解析（POE 輔助寶石）

```typescript
// 1. 武器配置
WeaponConfigs: {
    id: "chain_bow",
    tags: "weapon,projectile,bow",
    modifiers: "chain_attack,splash_damage"
}

WeaponModifiers: [
    {
        id: "chain_attack",
        tags: "attack,mechanic,chain",
        baseValue: 3,  // 連鎖 3 次
        affectedStat: "chain_count"
    }
]

// 2. 執行攻擊時 (CombatSystem)
const weaponTags = weapon.getTags(); // ['weapon','projectile','bow']
const behaviors = BehaviorResolver.getBehaviorsFromModifiers(
    weapon.getModifiers(),
    weaponTags
);

// 返回：
[
    {
        trigger: 'onHit',
        action: 'chain',
        config: {
            chainCount: 3,  // ← 從 modifier.baseValue 讀取
            chainRange: 200
        }
    }
]

// 3. HitHandler 執行
hitHandler.handle({
    ...
    behaviors: behaviors  // ← 傳入解析好的行為
});
```

---

## 📊 POE 風格加成計算公式

### 基礎公式
```
最終值 = (基礎值 + FLAT) × (1 + INCREASED) × MORE
```

### 三種加成類型

| 類型 | 符號 | 疊加方式 | 範例 | 計算 |
|------|------|----------|------|------|
| **FLAT** | `+15` | 加法 | 基礎 100 + FLAT 15 | = 115 |
| **INCREASED** | `+15%` | 百分比加法 | 115 × (1 + 0.15) | = 132.25 |
| **MORE** | `更多 15%` | 百分比乘法 | 132.25 × 1.15 | = 152.09 |

### 特殊公式

#### 冷卻時間（INCREASED 是減法）
```typescript
最終冷卻 = (基礎冷卻 + FLAT) × (1 - INCREASED) × MORE
```

#### 數量屬性（不使用 MORE）
```typescript
最終數量 = floor((基礎數量 + FLAT) × (1 + INCREASED))
```

---

## 🎯 核心組件職責

### 1. **WeaponSchema** - 數據容器
**職責**：儲存武器的所有數據，提供訪問接口

**方法**：
- `getModifiers()` - 獲取武器詞綴列表
- `getProperties()` - 獲取所有屬性（固定 + 隨機）
- `getBonuses()` - 獲取屬性加成列表
- `getProperty(propertyId)` - 獲取單個屬性（支援疊加）

**數據來源**：
```typescript
WeaponPropertyService.generateWeaponProperties(weaponId, quality)
→ {
    statusEffects: PropertyValue[],  // 狀態效果（燃燒、冰凍等）
    modifiers: WeaponModifier[],     // 武器詞綴
    bonuses: AttributeBonus[]        // 屬性加成
}
```

---

### 2. **BonusCalculator** - 計算引擎
**職責**：統一計算所有屬性加成，避免重複代碼

**核心方法**：
```typescript
// 獲取分類加成
getPropertyBonus(propertyId: string, unit: ServerGameUnit): BonusBreakdown
→ { flat: 0, increased: 0, more: 1 }

// 應用 POE 公式
applyBonus(baseValue: number, bonus: BonusBreakdown): number
→ (base + flat) × (1 + increased) × more

// 元素傷害加成（標籤驅動）
getElementDamageBonus(unit: ServerGameUnit, elementTags: string[]): number
→ 自動追溯標籤族系，累加元素傷害
```

**數據來源**：
1. ✅ 武器 properties（已實現）
2. ⏳ 天賦系統（預留接口）
3. ⏳ 狀態效果（預留接口）
4. ⏳ 裝備（預留接口）

**支援的屬性 ID**：
```typescript
// 範圍與速度
'area_of_effect', 'projectile_speed'

// 時間
'duration', 'cooldown_reduction'

// 戰鬥
'critical_chance', 'critical_damage', 'life_steal', 'armor_penetration'

// 元素傷害（自動從標籤推斷）
'fire_damage', 'ice_damage', 'lightning_damage', 'poison_damage', ...

// 數量
'chain_count', 'pierce_count', 'additional_projectiles'
```

---

### 3. **BehaviorResolver** - 行為轉換器
**職責**：將 WeaponModifiers 轉換為 HitHandler 可執行的 Behaviors

**核心方法**：
```typescript
getBehaviorsFromModifiers(
    modifiers: WeaponModifier[], 
    weaponTags: string[]
): Behavior[]
```

**轉換規則**：
| 詞綴 ID | 檢查標籤 | 行為 | 配置 |
|---------|----------|------|------|
| `chain_attack` | `projectile` | `chain` | chainCount, chainRange |
| `splash_damage` | - | `aoeExplode` | radius, damageMultiplier |
| `fork` / `split` | `projectile` | `split` | count, spreadAngle |
| `piercing` | `projectile` | ❌ 內建行為 | - |
| `knockback` | - | ❌ StatusEffect | - |

**設計原則**：
- ✅ 檢查詞綴標籤與武器標籤是否匹配
- ✅ 只提供基礎配置值（radius, damageMultiplier）
- ✅ **實際數值由 HitHandler 使用 BonusCalculator 動態計算**
- ✅ 不重複計算，避免與 BonusCalculator 衝突

---

### 4. **HitHandler** - 行為執行器
**職責**：執行命中時的所有行為（傷害、AOE、連鎖等）

**核心流程**：
```typescript
handle(context: HitContext): AttackResult {
    // 1. 對主要目標造成傷害
    handlePrimaryTarget(context);
    
    // 2. 執行額外行為
    executeBehaviors(context, result);
    
    return result;
}
```

**行為類型**：
| Action | 說明 | 使用 BonusCalculator |
|--------|------|---------------------|
| `aoeExplode` | AOE 爆炸 | ✅ `area_of_effect` |
| `chain` | 連鎖攻擊 | ✅ `chain_count` |
| `split` | 投射物分裂 | ✅ `additional_projectiles` |
| `damageTarget` | 直接傷害 | ✅ 所有傷害相關 |

**數值計算**：
```typescript
// ❌ 錯誤做法：在 BehaviorResolver 中計算
radius: this.getRadiusFromModifier(modifier) // 重複計算！

// ✅ 正確做法：在 HitHandler 中使用 BonusCalculator
const bonus = BonusCalculator.getPropertyBonus('area_of_effect', attacker);
const finalRadius = BonusCalculator.applyBonus(baseRadius, bonus);
```

---

### 5. **TagService** - 標籤管理器
**職責**：管理標籤定義，提供標籤查詢和族系追溯

**核心方法**：
```typescript
// 獲取標籤的完整路徑（包含父級）
getTagPath(tagId: string): string[]
// 範例：getTagPath('burn') → ['burn', 'fire']

// 檢查標籤是否屬於某族系
isTagInFamily(tagId: string, familyId: string): boolean
// 範例：isTagInFamily('burn', 'fire') → true

// 獲取標籤定義
getTagDefinition(tagId: string): TagDefinition | undefined
```

**使用場景**：
```typescript
// BonusCalculator 中使用
const tagPath = tagService.getTagPath('burn');
// → ['burn', 'fire']

const rootElement = tagPath.find(t => 
    tagService.getTagDefinition(t)?.category === 'element'
);
// → 'fire'

const propertyId = `${rootElement}_damage`;
// → 'fire_damage'
```

---

## 🔧 使用指南

### 添加新的詞綴效果

#### 1. 在 Google Sheets 中定義詞綴
```csv
id,displayName,tags,baseValue,modifierType,affectedStat,category,enabled
new_modifier,新效果,"attack,mechanic",10,increased,new_stat,attack_mechanic,true
```

#### 2. （可選）在 BehaviorResolver 中添加解析邏輯
```typescript
// 只在需要特殊行為時添加
if (modifier.id === 'new_modifier') {
    return {
        trigger: 'onHit',
        action: 'customAction',
        config: { ... }
    };
}
```

#### 3. 在 HitHandler 中實現行為（如果是新行為）
```typescript
private executeCustomAction(behavior: Behavior, context: HitContext): void {
    // 使用 BonusCalculator 獲取最終數值
    const bonus = BonusCalculator.getPropertyBonus('new_stat', context.attacker);
    const finalValue = BonusCalculator.applyBonus(baseValue, bonus);
    
    // 執行邏輯
    // ...
}
```

### 添加新的屬性加成

#### 1. 在 Google Sheets 中定義屬性
```csv
id,displayName,tags,baseValue,modifierType,affectedStat,category,enabled
new_bonus,新屬性,"attribute,character",10,flat,new_stat,character_stat,true
```

#### 2. 在需要的地方使用 BonusCalculator
```typescript
const bonus = BonusCalculator.getPropertyBonus('new_stat', unit);
const finalValue = BonusCalculator.applyBonus(baseValue, bonus);
```

**就這麼簡單！** 無需修改代碼，所有配置都在 Google Sheets 中完成。

---

## ✅ 最佳實踐

### 1. **避免重複計算**
❌ **錯誤**：在多個地方計算同一個屬性
```typescript
// BehaviorResolver
radius: this.calculateRadius(modifier) // ❌ 重複計算

// HitHandler
radius: this.calculateRadius(attacker) // ❌ 又算一次
```

✅ **正確**：統一使用 BonusCalculator
```typescript
// BehaviorResolver - 只提供基礎配置
config: {
    radius: 100 // 基礎值
}

// HitHandler - 使用 BonusCalculator 計算最終值
const bonus = BonusCalculator.getPropertyBonus('area_of_effect', attacker);
const finalRadius = BonusCalculator.applyBonus(100, bonus);
```

### 2. **使用現有方法**
✅ **推薦**：
```typescript
// 獲取武器詞綴
weapon.getModifiers() // ← WeaponSchema 已有

// 獲取武器標籤
weapon.getTags() // ← WeaponBasic 已有

// 計算屬性加成
BonusCalculator.getPropertyBonus(propertyId, unit) // ← 已有
```

❌ **避免**：
```typescript
// 自己遍歷 properties
for (const prop of weapon.properties) { ... } // ❌ 不要這樣

// 自己計算加成
const bonus = prop.value / 100; // ❌ 忽略 modifierType
```

### 3. **標籤驅動，不要硬編碼**
✅ **推薦**：
```typescript
// 使用 TagService 自動推斷
const tagPath = tagService.getTagPath(tag);
const rootElement = tagPath.find(t => 
    tagService.getTagDefinition(t)?.category === 'element'
);
```

❌ **避免**：
```typescript
// 硬編碼元素類型
switch (tag) {
    case 'fire': case 'burn': case 'flame': // ❌ 難維護
        return 'fire_damage';
}
```

---

## 🎉 總結

### 系統優點
1. ✅ **配置驅動** - 所有數據從 Google Sheets 載入
2. ✅ **避免重複** - 使用現有方法，不重複計算
3. ✅ **模組化** - 職責清晰，易於維護
4. ✅ **可擴展** - 添加新功能無需改代碼
5. ✅ **POE 風格** - 符合玩家熟悉的加成系統

### 核心原則
- **數據層**：WeaponSchema - 只儲存，不計算
- **計算層**：BonusCalculator - 統一計算，避免重複
- **轉換層**：BehaviorResolver - 配置轉行為
- **執行層**：HitHandler - 執行行為，使用 BonusCalculator

### 擴展方向
- ⏳ 天賦系統整合
- ⏳ 狀態效果加成
- ⏳ 裝備系統整合
- ⏳ 被動技能樹

---

**報告完成時間**: 2024-12-XX  
**系統版本**: v2.0  
**架構模式**: POE 風格
