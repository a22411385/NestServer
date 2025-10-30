# ConfigManager API 遷移指南

## 🎯 重構概述

ConfigManager 已從 **Service 類模式** 重構為 **ORM 風格的泛型 API**。

### 架構變化

**舊設計（已刪除）:**
```
Config/
  ├── BaseConfigService.ts
  ├── ItemConfigService.ts
  ├── WeaponConfigService.ts
  ├── MaterialConfigService.ts
  ├── EnemyConfigService.ts
  └── index.ts

ConfigManager.ts (Facade)
  ├── Items = ItemConfigService
  ├── Weapons = WeaponConfigService
  └── ...
```

**新設計:**
```
ConfigManager.ts (單一文件)
  ├── 泛型查詢方法
  └── 特殊業務邏輯方法
```

---

## 📋 API 遷移對照表

### 物品配置

| 舊 API | 新 API |
|--------|--------|
| `ConfigManager.Items.getAll()` | `ConfigManager.getAll<ItemConfigDefinition>('ItemConfigs')` |
| `ConfigManager.Items.getById('id')` | `ConfigManager.getById<ItemConfigDefinition>('ItemConfigs', 'id')` |
| `ConfigManager.Items.getByRarity('rare')` | `ConfigManager.filterByField<ItemConfigDefinition>('ItemConfigs', 'rarity', 'rare')` |
| `ConfigManager.Items.getByType('weapon')` | `ConfigManager.filterByField<ItemConfigDefinition>('ItemConfigs', 'itemType', 'weapon')` |
| `ConfigManager.Items.getByConditions({...})` | `ConfigManager.filterByConditions<ItemConfigDefinition>('ItemConfigs', {...})` |
| `ConfigManager.Items.getEnabled()` | `ConfigManager.getEnabled<ItemConfigDefinition>('ItemConfigs')` |

### 武器配置

| 舊 API | 新 API |
|--------|--------|
| `ConfigManager.Weapons.getAllConfigs()` | `ConfigManager.getWeaponConfigs()` |
| `ConfigManager.Weapons.getAllProperties()` | `ConfigManager.getWeaponProperties()` |
| `ConfigManager.Weapons.getConfigById('id')` | `ConfigManager.getById<WeaponConfigDefinition>('WeaponConfigs', 'id')` |
| `ConfigManager.Weapons.getPropertyByType('fire')` | `ConfigManager.getWeaponPropertyByType('fire')` |

### 材料配置

| 舊 API | 新 API |
|--------|--------|
| `ConfigManager.Materials.getAll()` | `ConfigManager.getAll<MaterialConfigDefinition>('MaterialConfigs')` |
| `ConfigManager.Materials.getById('id')` | `ConfigManager.getById<MaterialConfigDefinition>('MaterialConfigs', 'id')` |
| `ConfigManager.Materials.getByEnemyLevel(5)` | `ConfigManager.getMaterialsByEnemyLevel(5)` |
| `ConfigManager.Materials.getByRarity('rare')` | `ConfigManager.filterByField<MaterialConfigDefinition>('MaterialConfigs', 'rarity', 'rare')` |

### 敵人配置

| 舊 API | 新 API |
|--------|--------|
| `ConfigManager.Enemies.getAll()` | `ConfigManager.getAll<EnemyConfigDefinition>('EnemyConfigs')` |
| `ConfigManager.Enemies.getById('zombie')` | `ConfigManager.getById<EnemyConfigDefinition>('EnemyConfigs', 'zombie')` |
| `ConfigManager.Enemies.getByWave(5)` | `ConfigManager.getEnemiesByWave(5)` |
| `ConfigManager.Enemies.getRandomIdByWave(10)` | `ConfigManager.getRandomEnemyIdByWave(10)` |
| `ConfigManager.Enemies.getByAIType(5, 'ranged')` | `ConfigManager.getEnemiesByWaveAndAIType(5, 'ranged')` |

---

## 🔄 自動遷移腳本

如果你的專案中有很多舊 API 調用，可以使用以下正則表達式批量替換：

### 物品 API

```regex
// 查找
ConfigManager\.Items\.getAll\(\)

// 替換為
ConfigManager.getAll<ItemConfigDefinition>('ItemConfigs')
```

```regex
// 查找
ConfigManager\.Items\.getById\(([^)]+)\)

// 替換為
ConfigManager.getById<ItemConfigDefinition>('ItemConfigs', $1)
```

### 敵人 API

```regex
// 查找
ConfigManager\.Enemies\.getAll\(\)

// 替換為
ConfigManager.getAll<EnemyConfigDefinition>('EnemyConfigs')
```

```regex
// 查找
ConfigManager\.Enemies\.getByWave\(([^)]+)\)

// 替換為（無需改變）
ConfigManager.getEnemiesByWave($1)
```

---

## 📝 完整範例對比

### 範例 1: 掉落系統

**舊代碼:**
```typescript
class DropSystem {
    getMaterialsByLevel(level: number) {
        return ConfigManager.Materials.getByEnemyLevel(level);
    }
    
    getRareMaterials() {
        return ConfigManager.Materials.getByRarity('rare');
    }
}
```

**新代碼:**
```typescript
class DropSystem {
    getMaterialsByLevel(level: number) {
        return ConfigManager.getMaterialsByEnemyLevel(level);
    }
    
    getRareMaterials() {
        return ConfigManager.filterByField<MaterialConfigDefinition>(
            'MaterialConfigs', 
            'rarity', 
            'rare'
        );
    }
}
```

### 範例 2: 敵人生成

**舊代碼:**
```typescript
class WaveManager {
    spawnWave(waveNumber: number) {
        const enemyId = ConfigManager.Enemies.getRandomIdByWave(waveNumber);
        const enemy = ConfigManager.Enemies.getById(enemyId);
        return enemy;
    }
}
```

**新代碼:**
```typescript
class WaveManager {
    spawnWave(waveNumber: number) {
        const enemyId = ConfigManager.getRandomEnemyIdByWave(waveNumber);
        const enemy = ConfigManager.getById<EnemyConfigDefinition>('EnemyConfigs', enemyId);
        return enemy;
    }
}
```

---

## ✅ 遷移檢查清單

- [ ] 搜尋所有 `ConfigManager.Items.` 的使用
- [ ] 搜尋所有 `ConfigManager.Weapons.` 的使用
- [ ] 搜尋所有 `ConfigManager.Materials.` 的使用
- [ ] 搜尋所有 `ConfigManager.Enemies.` 的使用
- [ ] 更新所有導入語句（刪除 Service 類導入）
- [ ] 運行 TypeScript 編譯器檢查錯誤
- [ ] 運行測試驗證功能正常

---

## 🚀 新功能

遷移到新 API 後，你可以使用這些全新功能：

### 1. 統一的泛型查詢
```typescript
// 任何配置類型都可以用相同的方法查詢
const talents = ConfigManager.getAll<TalentConfig>('TalentConfigs');
const skills = ConfigManager.getAll<SkillConfig>('SkillConfigs');
```

### 2. 強大的多條件查詢
```typescript
// 一次查詢多個條件
const epicFireWeapons = ConfigManager.filterByConditions<WeaponConfigDefinition>(
    'WeaponConfigs',
    {
        rarity: 'epic',
        element: 'fire',
        weaponType: 'projectile'
    }
);
```

### 3. 範圍查詢
```typescript
// 價格範圍查詢
const affordableItems = ConfigManager.filterByRange<ItemConfigDefinition>(
    'ItemConfigs',
    'basePrice',
    0,
    1000
);
```

---

## 💡 最佳實踐

1. **總是指定泛型類型**
   ```typescript
   // ✅ 好
   const items = ConfigManager.getAll<ItemConfigDefinition>('ItemConfigs');
   
   // ❌ 差
   const items = ConfigManager.getAll('ItemConfigs');
   ```

2. **使用專門的方法處理複雜邏輯**
   ```typescript
   // ✅ 好（有優化）
   const enemies = ConfigManager.getEnemiesByWave(5);
   
   // ❌ 差（手動實現）
   const enemies = ConfigManager.getAll<EnemyConfigDefinition>('EnemyConfigs')
       .filter(e => e.minWave <= 5 && ...);
   ```

3. **利用 filterByConditions 簡化複雜查詢**
   ```typescript
   // ✅ 好
   const items = ConfigManager.filterByConditions<ItemConfigDefinition>(
       'ItemConfigs',
       { rarity: 'epic', type: 'weapon' }
   );
   
   // ❌ 差
   const items = ConfigManager.getAll<ItemConfigDefinition>('ItemConfigs')
       .filter(i => i.rarity === 'epic')
       .filter(i => i.type === 'weapon');
   ```

---

## 📚 延伸閱讀

- [ConfigManager ORM 風格 API 指南](./ConfigManager-ORM-風格-API指南.md)
- TypeScript 泛型最佳實踐
- 配置管理模式

---

## ❓ 常見問題

### Q: 為什麼要重構？
A: 舊設計需要為每個配置類型創建一個 Service 類，導致大量重複代碼。新設計使用泛型統一 API，減少 80% 的樣板代碼。

### Q: 新 API 性能如何？
A: 性能相同或更好。泛型在編譯時處理，運行時無額外開銷。

### Q: 可以混用新舊 API 嗎？
A: 不行，舊的 Service 類已被刪除。必須完全遷移到新 API。

### Q: 如何擴展新增配置類型？
A: 只需在 `GoogleCacheData` 中添加類型定義，然後直接使用泛型方法查詢，無需創建新的 Service 類。

### Q: 特殊查詢邏輯怎麼辦？
A: 可以在 ConfigManager 中添加專門的靜態方法（如 `getEnemiesByWave`），或者在業務層組合使用泛型方法。
