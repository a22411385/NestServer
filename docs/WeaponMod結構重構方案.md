# WeaponMod 結構說明

## 問題分析

### 配置表結構（扁平化）
Google Sheets 中的 WeaponMods 表是扁平結構：

```csv
id,displayName,description,tags,affectedStat,value,valueType,modifierType,category,...
piercing,穿透,攻擊可以穿透多個敵人,attack,pierce_count,1,次,flat,mechanic,...
critical_strike,暴擊強化,提升暴擊率和暴擊傷害,combat,critical_chance,5,%,increased,combat,...
critical_strike,暴擊強化,提升暴擊率和暴擊傷害,combat,critical_damage,25,%,increased,combat,...
```

**特點**：
- 同一個 `id` 會出現多次（複合詞綴）
- 每一行代表一個屬性修改效果

### 代碼中的結構需求（嵌套）

代碼中期望的結構：

```typescript
interface WeaponModWithModifiers {
    id: string;
    displayName: string;
    modifiers: [
        { affectedStat: string; value: number; valueType: string; modifierType: string; }
    ];
    // ... 其他欄位
}
```

**特點**：
- 每個唯一 `id` 一個物件
- `modifiers` 陣列包含該詞綴的所有屬性修改

---

## 解決方案對比

### 方案 A：在 getWeaponMods() 中聚合（推薦）

**優點**：
- ✅ 只需修改一個地方（WeaponSchema.getWeaponMods）
- ✅ 其他代碼無需改動
- ✅ 向後兼容性好
- ✅ 類型安全

**缺點**：
- ⚠️ 需要運行時聚合邏輯
- ⚠️ 輕微性能開銷

**實現**：
```typescript
public getWeaponMods(): WeaponModWithModifiers[] {
    const flatMods = JSON.parse(this.weaponModsJson || "[]");
    return this.aggregateModifiers(flatMods);
}

private aggregateModifiers(flatMods: WeaponModFlat[]): WeaponModWithModifiers[] {
    const grouped = new Map<string, WeaponModWithModifiers>();
    
    for (const flat of flatMods) {
        if (!grouped.has(flat.id)) {
            grouped.set(flat.id, {
                id: flat.id,
                displayName: flat.displayName,
                description: flat.description,
                tags: flat.tags,
                category: flat.category,
                modType: flat.modType,
                stackable: flat.stackable,
                weight: flat.weight,
                requiredLevel: flat.requiredLevel,
                enabled: flat.enabled,
                modifiers: []
            });
        }
        
        grouped.get(flat.id)!.modifiers.push({
            affectedStat: flat.affectedStat,
            value: flat.value,
            valueType: flat.valueType,
            modifierType: flat.modifierType
        });
    }
    
    return Array.from(grouped.values());
}
```

---

### 方案 B：修改所有使用處

**優點**：
- ✅ 無運行時轉換開銷
- ✅ 直接使用配置表結構

**缺點**：
- ❌ 需要修改大量文件（8+ 個）
- ❌ 破壞性改動
- ❌ 容易遺漏

**需要修改的文件**：
1. `WeaponDataService.ts` - applyWeaponModifiers
2. `BonusCalculator.ts` - calculatePropertyFromWeapons
3. `Hero.ts` - 屬性計算
4. `BehaviorResolver.ts` - getBehaviorsFromModifiers
5. `ConfigValidationService.ts` - 驗證邏輯
6. `ProjectileWeapon.ts` - 使用詞綴
7. `test-scripts/validate-weapon-mods.ts`
8. `test-scripts/update-and-validate.ts`

---

## 推薦方案

**採用方案 A**，原因：
1. 最小改動原則
2. 類型安全且易維護
3. 配置表結構（扁平）和代碼結構（嵌套）解耦

---

## 需要的類型定義

```typescript
// 配置表的扁平結構（Google Sheets）
export interface WeaponModFlat {
    id: string;
    displayName: string;
    description: string;
    tags: string;
    affectedStat: string;
    value: number;
    valueType: string;
    modifierType: ModifierType;
    category: ModCategory;
    modType: ModType;
    stackable: boolean;
    weight: number;
    requiredLevel: number;
    enabled: boolean;
}

// 代碼使用的嵌套結構
export interface WeaponModWithModifiers {
    id: string;
    displayName: string;
    description: string;
    tags: string;
    modifiers: ModifierEffect[];
    category: ModCategory;
    modType: ModType;
    stackable: boolean;
    weight: number;
    requiredLevel: number;
    enabled: boolean;
}

// ModifierEffect 已存在
export interface ModifierEffect {
    affectedStat: string;
    value: number;
    valueType: string;
    modifierType: ModifierType;
}
```

---

## 待確認

1. **是否採用方案 A？** （推薦）
2. **WeaponMod 類型應該改名為 WeaponModFlat？**（代表配置表結構）
3. **新增 WeaponModWithModifiers 類型？**（代表代碼使用結構）
