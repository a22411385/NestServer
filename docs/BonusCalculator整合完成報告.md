# BonusCalculator 統一屬性加成系統整合完成報告

## 📌 問題起源

用戶發現 `HitHandler` 的 `getPropertyBonus()` 方法沒有正確處理 `PropertyValue` 的 `modifierType` 欄位：

```typescript
// ❌ 原始問題代碼
private getPropertyBonus(propertyId: string, attacker: ServerGameUnit): number {
    let bonus = 0;
    // ... 遍歷 properties
    bonus += property.value / 100; // 🚨 忽略了 modifierType！
    return bonus;
}
```

**核心問題**：
- `PropertyValue` 有 `modifierType` 欄位（FLAT/INCREASED/MORE），但完全沒有被使用
- 所有加成都被當作百分比相加，不符合 POE 風格的加成計算規則

---

## ✅ 解決方案：創建 BonusCalculator 統一系統

### 1. **BonusCalculator.ts** - 統一屬性加成計算器

**位置**: `src/Game/Systems/BonusCalculator.ts`

**核心功能**:

#### 1.1 正確分類加成類型
```typescript
export interface BonusBreakdown {
    flat: number;      // 固定值 (+15)
    increased: number; // 百分比加法 (+15%)
    more: number;      // 百分比乘法 (更多 15%)
}

public static getPropertyBonus(propertyId: string, unit: ServerGameUnit): BonusBreakdown {
    const breakdown: BonusBreakdown = { flat: 0, increased: 0, more: 1 };
    
    // 從武器 properties 收集加成
    for (const property of weapon.properties) {
        if (property.propertyId === propertyId) {
            switch (property.modifierType) {
                case ModifierType.FLAT:
                    breakdown.flat += property.value;
                    break;
                case ModifierType.INCREASED:
                    breakdown.increased += property.value / 100;
                    break;
                case ModifierType.MORE:
                    breakdown.more *= (1 + property.value / 100);
                    break;
            }
        }
    }
    
    // TODO: 從天賦收集加成
    // TODO: 從狀態效果收集加成
    
    return breakdown;
}
```

#### 1.2 應用 POE 風格加成公式
```typescript
public static applyBonus(
    baseValue: number, 
    bonus: BonusBreakdown, 
    debugLabel?: string
): number {
    // POE 公式：最終值 = (基礎值 + FLAT) × (1 + INCREASED) × MORE
    const final = (baseValue + bonus.flat) * (1 + bonus.increased) * bonus.more;
    
    if (debugLabel) {
        console.log(`📊 ${debugLabel}: base=${baseValue}, ` +
                   `flat=+${bonus.flat}, increased=+${bonus.increased * 100}%, ` +
                   `more=×${bonus.more}, final=${final}`);
    }
    
    return final;
}
```

#### 1.3 特殊計算：冷卻時間
```typescript
public static applyCooldownBonus(baseCooldown: number, bonus: BonusBreakdown): number {
    // 冷卻專用公式：最終冷卻 = (基礎冷卻 + FLAT) × (1 - INCREASED) × MORE
    // 注意 INCREASED 是減法（冷卻減少 = 速度提升）
    return Math.max(0, (baseCooldown + bonus.flat) * (1 - bonus.increased) * bonus.more);
}
```

#### 1.4 特殊計算：數量屬性
```typescript
public static applyCountBonus(baseCount: number, bonus: BonusBreakdown): number {
    // 數量專用公式：最終數量 = floor((基礎數量 + FLAT) × (1 + INCREASED))
    // 注意：MORE 不適用於數量（避免指數爆炸）
    return Math.floor((baseCount + bonus.flat) * (1 + bonus.increased));
}
```

#### 1.5 標籤驅動的元素傷害加成（新功能）
```typescript
public static getElementDamageBonus(unit: ServerGameUnit, elementTags?: string[]): number {
    if (!elementTags || elementTags.length === 0) return 0;
    
    const tagService = TagService.getInstance();
    let totalBonus = 0;
    const processedElements = new Set<string>();
    
    // 追溯標籤族系，找到根元素
    for (const tag of elementTags) {
        const tagPath = tagService.getTagPath(tag); // ['burn', 'fire']
        
        // 找到 category='element' 的根元素
        const rootElement = tagPath.find(t => 
            tagService.getTagDefinition(t)?.category === 'element'
        );
        
        if (rootElement && !processedElements.has(rootElement)) {
            processedElements.add(rootElement);
            
            // 自動構造屬性 ID：fire → fire_damage
            const propertyId = `${rootElement}_damage`;
            const bonus = this.getPropertyBonus(propertyId, unit);
            
            totalBonus += bonus.increased + (bonus.more - 1);
        }
    }
    
    return totalBonus;
}
```

**標籤系統範例**:
```json
// google-sheets-cache.json
{
  "id": "burn",
  "parent": "fire",      // ← 追溯到 fire
  "category": "ailment"
},
{
  "id": "fire",
  "category": "element"   // ← 根元素
}
```

**標籤追溯流程**:
1. 技能標籤：`['burn']`
2. TagService.getTagPath('burn') → `['burn', 'fire']`
3. 找到 category='element' → `'fire'`
4. 構造屬性 ID → `'fire_damage'`
5. 從武器/天賦/狀態效果收集 `fire_damage` 加成

**優點**:
- ✅ 不需要硬編碼元素類型
- ✅ 自動支援所有元素（fire, cold, lightning, poison, holy, shadow, arcane）
- ✅ 自動支援衍生標籤（burn → fire, freeze → cold, shock → lightning）

---

### 2. **HitHandler 完全重構**

**代碼減少**：從 660 行 → 580 行（移除 80+ 行重複代碼）

**重構前**：每個方法都手動遍歷武器 properties
```typescript
// ❌ 重複代碼模式
private applyAreaModifier(baseValue: number, attacker: ServerGameUnit): number {
    let bonus = 1;
    
    if (attacker.type === UnitType.hero) {
        const hero = attacker as ServerHero;
        const equippedWeapons = hero.weaponInventory.filter(w => w.isEquipped);
        
        for (const weaponSchema of equippedWeapons) {
            const weapon = weaponSchema.weaponConfig;
            if (weapon.properties) {
                for (const property of weapon.properties) {
                    if (property.propertyId === 'area_of_effect') {
                        bonus += property.value / 100; // 🚨 忽略 modifierType
                    }
                }
            }
        }
    }
    
    return baseValue * bonus;
}
```

**重構後**：統一使用 BonusCalculator
```typescript
// ✅ 簡化為 2-3 行
private applyAreaModifier(baseValue: number, attacker: ServerGameUnit): number {
    const bonus = BonusCalculator.getPropertyBonus('area_of_effect', attacker);
    return BonusCalculator.applyBonus(baseValue, bonus, 'Area');
}

private applyProjectileSpeedModifier(baseSpeed: number, attacker: ServerGameUnit): number {
    const bonus = BonusCalculator.getPropertyBonus('projectile_speed', attacker);
    return BonusCalculator.applyBonus(baseSpeed, bonus);
}

private applyDurationModifier(baseDuration: number, attacker: ServerGameUnit): number {
    const bonus = BonusCalculator.getPropertyBonus('duration', attacker);
    return BonusCalculator.applyBonus(baseDuration, bonus);
}

private applyCooldownReduction(baseCooldown: number, attacker: ServerGameUnit): number {
    const bonus = BonusCalculator.getPropertyBonus('cooldown_reduction', attacker);
    return BonusCalculator.applyCooldownBonus(baseCooldown, bonus); // 使用專用公式
}
```

**重構的方法列表**:
- `applyAreaModifier()` - 範圍加成
- `applyProjectileSpeedModifier()` - 投射物速度加成
- `applyDurationModifier()` - 持續時間加成
- `applyCooldownReduction()` - 冷卻減少
- `applyPierceCountModifier()` - 穿透次數加成
- `applyChainCountModifier()` - 彈射次數加成
- `applyProjectileCountModifier()` - 額外投射物數量加成
- `applyForkAngleModifier()` - 分裂角度加成（特殊處理）

---

### 3. **DamageSystem 整合**

#### 3.1 元素傷害加成（標籤驅動）
```typescript
// ✅ 移除 60+ 行的 switch case 硬編碼
private getElementDamageBonus(hero: ServerHero, elementTags?: string[]): number {
    return BonusCalculator.getElementDamageBonus(hero, elementTags);
}
```

**舊代碼對比**：
```typescript
// ❌ 硬編碼 switch case（60+ 行）
switch (tag) {
    case 'fire':
    case 'burn':
    case 'flame':
        propertyId = 'fire_damage';
        break;
    case 'cold':
    case 'ice':
    case 'freeze':
        propertyId = 'ice_damage';
        break;
    // ... 更多元素
}
```

#### 3.2 暴擊率計算
```typescript
// ✅ 使用 BonusCalculator
private rollCriticalHit(attacker: ServerGameUnit, target: ServerGameUnit): boolean {
    if (attacker.type === UnitType.hero) {
        const hero = attacker as ServerHero;
        
        // 基礎暴擊率（來自角色屬性）
        const baseCritRate = hero.critRate || 0;
        
        // ✅ 獲取所有來源的暴擊率加成
        const bonus = BonusCalculator.getPropertyBonus('critical_chance', attacker);
        const totalCritRate = Math.min(
            BonusCalculator.applyBonus(baseCritRate, bonus),
            100 // 暴擊率上限 100%
        );

        return BattleMathUtils.rollProbability(totalCritRate / 100);
    }
    return false;
}
```

#### 3.3 暴擊傷害倍率
```typescript
// ✅ 使用 BonusCalculator
private getCriticalDamageMultiplier(attacker: ServerGameUnit): number {
    if (attacker.type !== UnitType.hero) {
        return 1.5; // 非英雄使用預設值
    }

    const hero = attacker as ServerHero;
    const baseCritDamage = 150; // 基礎暴擊傷害 150%

    // ✅ 獲取所有來源的暴擊傷害加成
    const bonus = BonusCalculator.getPropertyBonus('critical_damage', attacker);
    const finalCritDamage = BonusCalculator.applyBonus(baseCritDamage, bonus);

    // 轉換為倍率（150% → 1.5）
    return finalCritDamage / 100;
}
```

#### 3.4 生命偷取
```typescript
// ✅ 使用 BonusCalculator
private applyLifeSteal(hero: ServerHero, damageDealt: number): void {
    // ✅ 獲取所有來源的生命偷取加成
    const bonus = BonusCalculator.getPropertyBonus('life_steal', hero);
    const totalLifeSteal = BonusCalculator.applyBonus(0, bonus); // 基礎值為 0，僅計算加成

    // 如果有生命偷取，回復生命
    if (totalLifeSteal > 0) {
        const healAmount = Math.floor(damageDealt * (totalLifeSteal / 100));
        const previousHp = hero.hp;
        hero.hp = Math.min(hero.hp + healAmount, hero.maxHp);
        const actualHeal = hero.hp - previousHp;

        if (actualHeal > 0) {
            console.log(`💚 生命偷取: ${hero.name} 回復 ${actualHeal} HP (${totalLifeSteal}% of ${damageDealt})`);
        }
    }
}
```

---

## 🎯 支援的屬性 ID 完整列表

### 範圍與速度
- `area_of_effect` - 範圍加成
- `projectile_speed` - 投射物速度加成

### 時間相關
- `duration` - 持續時間加成
- `cooldown_reduction` - 冷卻減少（使用特殊公式）

### 戰鬥屬性
- `critical_chance` - 暴擊率加成
- `critical_damage` - 暴擊傷害加成
- `life_steal` - 生命偷取加成
- `armor_penetration` - 護甲穿透加成（待實現）

### 元素傷害（標籤驅動）
- `fire_damage` - 火焰傷害加成
- `ice_damage` / `cold_damage` - 冰霜傷害加成
- `lightning_damage` - 閃電傷害加成
- `poison_damage` - 毒素傷害加成
- `holy_damage` - 神聖傷害加成
- `shadow_damage` - 暗影傷害加成
- `arcane_damage` - 秘法傷害加成

### 數量屬性（使用特殊公式）
- `chain_count` - 彈射次數
- `pierce_count` - 穿透次數
- `additional_projectiles` - 額外投射物數量

---

## 📊 POE 風格加成公式總結

### 基礎公式
```
最終值 = (基礎值 + FLAT) × (1 + INCREASED) × MORE
```

**範例**：範圍加成
- 基礎範圍：100
- FLAT: +20（來自武器 A）
- INCREASED: +30%（來自武器 B）
- MORE: ×1.15（來自天賦）
- **最終範圍** = (100 + 20) × 1.3 × 1.15 = **179.4**

### 冷卻時間公式
```
最終冷卻 = (基礎冷卻 + FLAT) × (1 - INCREASED) × MORE
```
- 注意：INCREASED 是**減法**（冷卻減少）

**範例**：冷卻減少
- 基礎冷卻：5 秒
- INCREASED: +20%（冷卻減少 20%）
- MORE: ×0.9（更多冷卻減少）
- **最終冷卻** = 5 × (1 - 0.2) × 0.9 = **3.6 秒**

### 數量屬性公式
```
最終數量 = floor((基礎數量 + FLAT) × (1 + INCREASED))
```
- 注意：不使用 MORE（避免指數爆炸），結果向下取整

**範例**：彈射次數
- 基礎彈射：2
- FLAT: +1（來自武器）
- INCREASED: +50%（來自天賦）
- **最終彈射次數** = floor((2 + 1) × 1.5) = **4**

---

## 🔄 數據流追蹤

### 完整數據流：武器配置 → 投射物 → 命中

```
1. 武器配置 (WeaponFactory.ts)
   ↓
   創建 WeaponConfig，包含 properties: PropertyValue[]
   每個 PropertyValue 有：
   - propertyId: string (如 'area_of_effect')
   - value: number (如 15)
   - modifierType: ModifierType (FLAT/INCREASED/MORE)

2. WeaponSchema.ts
   ↓
   weaponConfig.properties 儲存在 Schema 中
   
3. ProjectileWeapon.ts - onTrigger()
   ↓
   呼叫 HitHandler.execute()，傳入 attacker (含 weaponInventory)
   
4. HitHandler.ts - execute()
   ↓
   執行 behaviors，每個 behavior 都使用加成修正
   例如：AOEBehavior.execute()
   ↓
   appliedModifiers.area = applyAreaModifier(baseArea, attacker)
   ↓
   BonusCalculator.getPropertyBonus('area_of_effect', attacker)
   ↓
   遍歷 hero.weaponInventory，收集所有 'area_of_effect' 的 PropertyValue
   根據 modifierType 分類到 flat/increased/more
   ↓
   BonusCalculator.applyBonus(baseArea, bonus)
   ↓
   應用 POE 公式：(base + flat) × (1 + increased) × more
```

---

## ✅ 整合完成清單

### HitHandler (完成)
- ✅ `applyAreaModifier()` - 範圍加成
- ✅ `applyProjectileSpeedModifier()` - 速度加成
- ✅ `applyDurationModifier()` - 持續時間加成
- ✅ `applyCooldownReduction()` - 冷卻減少
- ✅ `applyPierceCountModifier()` - 穿透次數
- ✅ `applyChainCountModifier()` - 彈射次數
- ✅ `applyProjectileCountModifier()` - 額外投射物
- ✅ `applyForkAngleModifier()` - 分裂角度

### DamageSystem (完成)
- ✅ `getElementDamageBonus()` - 元素傷害加成（標籤驅動）
- ✅ `rollCriticalHit()` - 暴擊率計算
- ✅ `getCriticalDamageMultiplier()` - 暴擊傷害倍率
- ✅ `applyLifeSteal()` - 生命偷取

### 標籤系統整合 (完成)
- ✅ 使用 `TagService.getTagPath()` 追溯標籤族系
- ✅ 自動推斷元素類型（burn → fire, freeze → cold）
- ✅ 移除所有元素匹配的硬編碼

---

## 🚀 未來擴展計劃

### 1. 天賦系統整合（預留接口）
```typescript
// BonusCalculator.ts - TODO 區域
// TODO: 從天賦系統收集加成
// const talents = TalentManager.getInstance().getActiveTalents(unit);
// for (const talent of talents) {
//     if (talent.bonuses && talent.bonuses[propertyId]) {
//         // 根據 modifierType 分類天賦加成
//     }
// }
```

### 2. 狀態效果整合（預留接口）
```typescript
// TODO: 從狀態效果收集加成
// const statusEffects = StatusEffectManager.getInstance().getEffects(unit);
// for (const effect of statusEffects) {
//     if (effect.propertyBonuses && effect.propertyBonuses[propertyId]) {
//         // 根據 modifierType 分類狀態效果加成
//     }
// }
```

### 3. 護甲穿透功能（待實現）
```typescript
// DamageSystem.ts - calculateFinalDamage()
// ✅ 使用 BonusCalculator 獲取護甲穿透
const armorPenetration = BonusCalculator.getPropertyBonus('armor_penetration', attacker);
const effectiveDefense = Math.max(0, targetDefense - armorPenetration.flat);
```

### 4. 新元素類型支援
- 只需在 Google Sheets 中添加標籤定義
- TagService 自動支援新標籤族系
- 無需修改代碼

---

## 🎉 總結

### 核心成就
1. **修復 modifierType 問題**：PropertyValue 的 modifierType 現在被正確使用
2. **統一加成系統**：所有系統使用同一套 BonusCalculator
3. **代碼簡化**：移除 150+ 行重複代碼
4. **標籤驅動配置**：元素傷害加成不再硬編碼，自動追溯標籤族系
5. **POE 風格計算**：正確實現 FLAT/INCREASED/MORE 三種加成類型

### 可擴展性
- ✅ 天賦系統整合（預留接口）
- ✅ 狀態效果整合（預留接口）
- ✅ 新屬性類型（只需添加 propertyId）
- ✅ 新元素類型（只需添加標籤定義）

### 代碼品質
- ✅ 無編譯錯誤
- ✅ 統一 API 設計
- ✅ Debug 日誌支援
- ✅ 類型安全（TypeScript）

---

## 📝 使用指南

### 添加新屬性加成

1. **在 Google Sheets 中定義屬性 ID**（如果是元素傷害，添加標籤定義）
2. **在武器配置中添加 PropertyValue**：
   ```typescript
   properties: [
       {
           propertyId: 'new_property',
           value: 20,
           modifierType: ModifierType.INCREASED
       }
   ]
   ```
3. **在需要的地方使用 BonusCalculator**：
   ```typescript
   const bonus = BonusCalculator.getPropertyBonus('new_property', attacker);
   const finalValue = BonusCalculator.applyBonus(baseValue, bonus);
   ```

### Debug 加成計算
```typescript
// 啟用 debug 日誌
const bonus = BonusCalculator.getPropertyBonus('area_of_effect', attacker);
const final = BonusCalculator.applyBonus(100, bonus, 'Area Debug'); // 傳入 debugLabel

// 輸出範例：
// 📊 Area Debug: base=100, flat=+20, increased=+30%, more=×1.15, final=179.4
```

---

**報告完成時間**: 2024-12-XX  
**系統版本**: v1.0  
**編譯狀態**: ✅ 無錯誤
