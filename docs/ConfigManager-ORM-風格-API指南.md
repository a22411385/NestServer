# ConfigManager ORM 風格 API 使用指南

## 🎯 設計理念

ConfigManager 現在採用 **ORM 風格的泛型 API 設計**，讓你可以像使用資料庫 ORM 一樣查詢配置數據。

### 核心優勢

- ✅ **統一 API**：所有配置類型使用相同的查詢方法
- ✅ **類型安全**：完整的 TypeScript 泛型支持
- ✅ **零樣板代碼**：無需為每個配置類型創建 Service 類
- ✅ **易於擴展**：新增配置類型無需修改代碼

---

## 📚 API 參考

### 基礎查詢方法

#### `getAll<T>(key: ConfigKey): T[]`
獲取所有配置項

```typescript
// 獲取所有物品
const items = ConfigManager.getAll<ItemConfigDefinition>('ItemConfigs');

// 獲取所有敵人
const enemies = ConfigManager.getAll<EnemyConfigDefinition>('EnemyConfigs');

// 獲取所有材料
const materials = ConfigManager.getAll<MaterialConfigDefinition>('MaterialConfigs');
```

#### `getById<T>(key: ConfigKey, id: string | number): T | null`
根據 ID 查找單個配置

```typescript
// 查找特定物品
const sword = ConfigManager.getById<ItemConfigDefinition>('ItemConfigs', 'iron_sword');

// 查找特定敵人
const zombie = ConfigManager.getById<EnemyConfigDefinition>('EnemyConfigs', 'zombie_normal');

// 查找特定武器
const bow = ConfigManager.getById<WeaponConfigDefinition>('WeaponConfigs', 'wooden_bow');
```

#### `filterByField<T>(key, fieldName, value, enabledCheck?): T[]`
根據單一欄位值篩選

```typescript
// 獲取所有傳奇品質的物品
const legendaryItems = ConfigManager.filterByField<ItemConfigDefinition>(
    'ItemConfigs', 
    'rarity', 
    'legendary'
);

// 獲取所有近戰武器
const meleeWeapons = ConfigManager.filterByField<WeaponConfigDefinition>(
    'WeaponConfigs', 
    'weaponType', 
    'melee'
);

// 獲取所有精華類材料（不檢查 enabled 狀態）
const essences = ConfigManager.filterByField<MaterialConfigDefinition>(
    'MaterialConfigs', 
    'category', 
    'essence',
    false  // 不檢查啟用狀態
);
```

#### `getEnabled<T>(key: ConfigKey): T[]`
獲取所有已啟用的配置

```typescript
// 獲取所有啟用的物品
const enabledItems = ConfigManager.getEnabled<ItemConfigDefinition>('ItemConfigs');

// 獲取所有啟用的敵人
const enabledEnemies = ConfigManager.getEnabled<EnemyConfigDefinition>('EnemyConfigs');
```

#### `filterByConditions<T>(key, conditions, enabledCheck?): T[]`
多條件組合查詢

```typescript
// 查找稀有的治療藥水
const rarePotions = ConfigManager.filterByConditions<ItemConfigDefinition>(
    'ItemConfigs',
    {
        rarity: 'rare',
        type: 'potion',
        category: 'consumable'
    }
);

// 查找近戰類型的史詩武器
const epicMeleeWeapons = ConfigManager.filterByConditions<WeaponConfigDefinition>(
    'WeaponConfigs',
    {
        rarity: 'epic',
        weaponType: 'melee'
    }
);
```

#### `filterByRange<T>(key, fieldName, min?, max?, enabledCheck?): T[]`
範圍篩選（數值）

```typescript
// 查找價格在 100-500 之間的物品
const midPriceItems = ConfigManager.filterByRange<ItemConfigDefinition>(
    'ItemConfigs',
    'basePrice',
    100,
    500
);

// 查找等級 5 以上的敵人
const highLevelEnemies = ConfigManager.filterByRange<EnemyConfigDefinition>(
    'EnemyConfigs',
    'level',
    5  // 只指定最小值
);
```

---

## 🎮 特殊業務邏輯方法

對於有特殊業務邏輯的查詢，ConfigManager 提供專門的方法：

### 敵人相關

#### `getEnemiesByWave(waveNumber: number): EnemyConfigDefinition[]`
根據波次獲取可生成的敵人

```typescript
// 獲取第 5 波可以出現的所有敵人
const wave5Enemies = ConfigManager.getEnemiesByWave(5);
```

#### `getRandomEnemyIdByWave(waveNumber: number): string | null`
根據波次加權隨機選擇敵人 ID

```typescript
// 根據權重隨機選擇第 10 波的敵人
const randomEnemyId = ConfigManager.getRandomEnemyIdByWave(10);
if (randomEnemyId) {
    const enemy = ConfigManager.getById<EnemyConfigDefinition>('EnemyConfigs', randomEnemyId);
    // 生成敵人...
}
```

#### `getEnemiesByWaveAndAIType(waveNumber, aiType): EnemyConfigDefinition[]`
根據波次和 AI 類型篩選敵人

```typescript
// 獲取第 8 波的遠程敵人
const wave8RangedEnemies = ConfigManager.getEnemiesByWaveAndAIType(8, 'ranged');
```

### 材料相關

#### `getMaterialsByEnemyLevel(enemyLevel: number): MaterialConfigDefinition[]`
根據敵人等級獲取可掉落的材料

```typescript
// 獲取 5 級敵人可以掉落的所有材料
const level5Materials = ConfigManager.getMaterialsByEnemyLevel(5);
```

#### `getMaterialsByEnemyLevelAndRarity(level, rarity): MaterialConfigDefinition[]`
根據敵人等級和稀有度獲取材料

```typescript
// 獲取 10 級敵人掉落的稀有材料
const level10RareMaterials = ConfigManager.getMaterialsByEnemyLevelAndRarity(10, 'rare');
```

### 武器相關

#### `getWeaponConfigs(): WeaponConfigDefinition[]`
獲取所有武器配置（快捷方法）

```typescript
const allWeapons = ConfigManager.getWeaponConfigs();
```

#### `getWeaponProperties(): WeaponPropertyDefinition[]`
獲取所有武器屬性配置

```typescript
const allProperties = ConfigManager.getWeaponProperties();
```

#### `getWeaponPropertyByType(propertyType: string): WeaponPropertyDefinition | null`
根據屬性類型獲取武器屬性

```typescript
// 獲取火焰屬性
const fireProperty = ConfigManager.getWeaponPropertyByType('fire');
```

---

## 🔄 快取管理

### `reloadCache(): void`
重新載入配置快取

```typescript
// 重新載入所有配置
ConfigManager.reloadCache();
console.log('配置已重新載入');
```

---

## 📊 完整使用範例

### 範例 1: 掉落系統

```typescript
class DropSystem {
    /**
     * 計算敵人掉落
     */
    calculateEnemyDrop(enemyId: string, enemyLevel: number): MaterialConfigDefinition[] {
        // 獲取敵人配置
        const enemy = ConfigManager.getById<EnemyConfigDefinition>('EnemyConfigs', enemyId);
        if (!enemy) return [];

        // 獲取該等級可掉落的材料
        const availableMaterials = ConfigManager.getMaterialsByEnemyLevel(enemyLevel);

        // 根據稀有度進一步篩選
        const commonMaterials = availableMaterials.filter(m => m.rarity === 'common');
        const rareMaterials = availableMaterials.filter(m => m.rarity === 'rare');

        // 掉落邏輯...
        return this.rollDrop(commonMaterials, rareMaterials);
    }
}
```

### 範例 2: 波次生成系統

```typescript
class WaveManager {
    /**
     * 生成波次敵人
     */
    spawnWaveEnemies(waveNumber: number, count: number): string[] {
        const enemyIds: string[] = [];

        for (let i = 0; i < count; i++) {
            // 根據權重隨機選擇敵人
            const enemyId = ConfigManager.getRandomEnemyIdByWave(waveNumber);
            if (enemyId) {
                enemyIds.push(enemyId);
            }
        }

        return enemyIds;
    }

    /**
     * 獲取波次可用敵人統計
     */
    getWaveEnemyStats(waveNumber: number) {
        const enemies = ConfigManager.getEnemiesByWave(waveNumber);

        return {
            total: enemies.length,
            byType: {
                melee: enemies.filter(e => e.aiType === 'melee').length,
                ranged: enemies.filter(e => e.aiType === 'ranged').length,
                boss: enemies.filter(e => e.isBoss).length
            }
        };
    }
}
```

### 範例 3: 商店系統

```typescript
class ShopSystem {
    /**
     * 獲取商店可售物品
     */
    getShopItems(shopLevel: number): ItemConfigDefinition[] {
        // 獲取所有啟用的物品
        const allItems = ConfigManager.getEnabled<ItemConfigDefinition>('ItemConfigs');

        // 根據商店等級篩選
        return allItems.filter(item => {
            return item.requiredLevel <= shopLevel && item.canBuy;
        });
    }

    /**
     * 獲取特定類型的商品
     */
    getItemsByCategory(category: string): ItemConfigDefinition[] {
        return ConfigManager.filterByField<ItemConfigDefinition>(
            'ItemConfigs',
            'category',
            category
        );
    }
}
```

---

## 🆚 舊 API vs 新 API

### 舊設計（Service 類模式）

```typescript
// ❌ 需要為每個配置創建 Service 類
const items = ItemConfigService.getAll();
const enemy = EnemyConfigService.getById('zombie');
const materials = MaterialConfigService.getByEnemyLevel(5);

// ❌ 新增配置類型需要新增整個 Service 類
```

### 新設計（ORM 風格泛型）

```typescript
// ✅ 統一的泛型 API
const items = ConfigManager.getAll<ItemConfigDefinition>('ItemConfigs');
const enemy = ConfigManager.getById<EnemyConfigDefinition>('EnemyConfigs', 'zombie');
const materials = ConfigManager.getMaterialsByEnemyLevel(5);

// ✅ 新增配置類型只需要在 GoogleCacheData 中定義
```

---

## 🔧 類型定義

### ConfigKey

```typescript
type ConfigKey = keyof GoogleCacheData;

// 可用的配置鍵：
// - 'ItemConfigs'
// - 'WeaponConfigs'
// - 'WeaponProperties'
// - 'MaterialConfigs'
// - 'EnemyConfigs'
// - 'TalentConfigs'
// - ... 其他配置
```

### 配置類型

```typescript
import { ItemConfigDefinition } from '@/Types/Equipment/ItemTypes';
import { WeaponConfigDefinition, WeaponPropertyDefinition } from '@/Types/Equipment/WeaponPropertyTypes';
import { MaterialConfigDefinition } from '@/Types/Equipment/MaterialTypes';
import { EnemyConfigDefinition } from '@/Types/Game/EnemyTypes';
```

---

## 💡 最佳實踐

1. **使用泛型保證類型安全**
   ```typescript
   // ✅ 好
   const items = ConfigManager.getAll<ItemConfigDefinition>('ItemConfigs');
   
   // ❌ 差（失去類型推導）
   const items = ConfigManager.getAll('ItemConfigs');
   ```

2. **利用 enabledCheck 參數**
   ```typescript
   // 默認只返回 enabled = true 的項目
   const items = ConfigManager.getAll<ItemConfigDefinition>('ItemConfigs');
   
   // 獲取所有項目（包括禁用的）
   const allItems = ConfigManager.filterByField<ItemConfigDefinition>(
       'ItemConfigs', 
       'enabled', 
       true,
       false  // 不進行 enabled 檢查
   );
   ```

3. **複雜查詢使用 filterByConditions**
   ```typescript
   // ✅ 好（一次查詢）
   const items = ConfigManager.filterByConditions<ItemConfigDefinition>(
       'ItemConfigs',
       { rarity: 'epic', type: 'weapon', canDrop: true }
   );
   
   // ❌ 差（多次過濾）
   const items = ConfigManager.getAll<ItemConfigDefinition>('ItemConfigs')
       .filter(i => i.rarity === 'epic')
       .filter(i => i.type === 'weapon')
       .filter(i => i.canDrop);
   ```

4. **特殊邏輯使用專門方法**
   ```typescript
   // ✅ 好（有優化的專門方法）
   const enemies = ConfigManager.getEnemiesByWave(5);
   
   // ❌ 差（手動實現相同邏輯）
   const enemies = ConfigManager.getAll<EnemyConfigDefinition>('EnemyConfigs')
       .filter(e => e.minWave <= 5 && (e.maxWave === 0 || e.maxWave >= 5));
   ```

---

## 📝 總結

ConfigManager 的 ORM 風格設計讓配置查詢變得：

- **簡單**: 統一的 API，學習成本低
- **靈活**: 泛型支持，適用所有配置類型
- **安全**: 完整的 TypeScript 類型檢查
- **高效**: 專門的優化方法處理複雜邏輯

新增配置類型時，只需：
1. 在 `GoogleCacheData` 中添加類型定義
2. 直接使用泛型方法查詢，無需創建新的 Service 類！
