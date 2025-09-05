# 配置驅動武器系統使用指南

## 概述

本文檔介紹如何使用新的配置驅動武器系統，該系統完全依賴於 Google Sheets 中的 WeaponConfigs 配置，而不需要在武器類別構造函數中傳入參數。

## 🎯 主要改進

### ✅ 完成的功能

1. **配置驅動**: 武器屬性完全來自 Google Sheets
2. **零參數初始化**: 武器類別不需要構造函數參數
3. **集中管理**: 所有武器配置統一管理
4. **動態載入**: 支持熱重載配置
5. **類型安全**: 保持 TypeScript 類型檢查
6. **易於擴展**: 新增武器只需在配置和類別映射中添加

## 🚀 使用方式

### 1. 基本使用

```typescript
import { WeaponFactory } from '@/Game/Factories/WeaponFactory';

// 🆕 新的方式（完全基於配置）
const fireball = WeaponFactory.createWeapon('fireball');

// ❌ 舊的方式（需要傳入參數）
// const fireball = new Fireball("火球", 30, 2000, 400);
```

### 2. 批量創建

```typescript
// 批量創建武器
const weapons = WeaponFactory.createMultipleWeapons([
    'fireball', 
    'baseball_bat', 
    'lightning_bolt'
]);

// 獲取特定類型的武器
const projectileWeaponIds = WeaponFactory.getWeaponIdsByType('ProjectileWeapon');
const projectileWeapons = WeaponFactory.createMultipleWeapons(projectileWeaponIds);
```

### 3. 系統初始化

```typescript
import { WeaponFactory } from '@/Game/Factories/WeaponFactory';
import { WeaponInstanceManager } from '@/Game/Managers/WeaponInstanceManager';

// 在應用程序啟動時初始化
async function initializeWeaponSystem() {
    await WeaponFactory.initialize();
    await WeaponInstanceManager.initialize();
    console.log('✅ 武器系統初始化完成');
}
```

## 🔧 配置格式

### Google Sheets WeaponConfigs 格式

```json
{
    "id": "fireball",
    "name": "火球",
    "baseDamage": 30,
    "attackSpeed": 2000,
    "attackRange": 400,
    "enabled": true,
    "weaponClass": "Fireball",
    "classModule": "ProjectileWeapon",
    "fixedProperties": "burn,area_of_effect",
    "randomProperties": "intelligence,vitality,projectile_speed,critical_damage",
    "description": "燃燒的火焰球，擅長範圍攻擊"
}
```

### 配置欄位說明

- **id**: 武器的唯一識別碼
- **name**: 武器顯示名稱
- **baseDamage**: 基礎傷害值
- **attackSpeed**: 攻擊間隔（毫秒）
- **attackRange**: 攻擊範圍
- **enabled**: 是否啟用此武器
- **weaponClass**: 武器類別名稱（對應 TypeScript 類別）
- **classModule**: 武器模組類型（MeleeWeapon/ProjectileWeapon/SupportWeapon）
- **fixedProperties**: 固定屬性（逗號分隔）
- **randomProperties**: 隨機屬性（逗號分隔）
- **description**: 武器描述

## 📝 新增武器流程

### 1. 在 Google Sheets 中添加配置

在 WeaponConfigs 表中添加新武器的配置行。

### 2. 創建武器類別

```typescript
import { MeleeWeapon } from "../Basic/MeleeWeapon";

export class NewWeapon extends MeleeWeapon {
    constructor() {
        super(); // 🆕 無參數構造函數
    }

    /**
     * 應用武器特定的配置
     */
    protected applyMeleeSpecificConfig(): void {
        console.log(`⚔️ ${this.name} 特定配置已應用`);
        
        // 根據固定屬性進行特殊設置
        const fixedProps = this.getFixedProperties();
        if (fixedProps.includes('special_effect')) {
            // 實施特殊效果邏輯
        }
    }
}
```

### 3. 註冊武器類別

在 `WeaponClassRegistry.ts` 的 `MODULE_PATH_MAP` 中確保路徑正確，或手動註冊：

```typescript
WeaponFactory.registerWeaponClass('new_weapon_id', NewWeapon);
```

### 4. 測試新武器

```typescript
const newWeapon = WeaponFactory.createWeapon('new_weapon_id');
console.log('新武器創建成功:', newWeapon?.name);
```

## 🛠️ 高級功能

### 配置驗證

```typescript
const validation = WeaponFactory.validateConfiguration();
if (!validation.valid) {
    console.error('配置錯誤:', validation.issues);
}
```

### 系統統計

```typescript
// 類別映射統計
const stats = WeaponFactory.getClassMappingStats();
console.log(`動態類別: ${stats.dynamic}, 靜態類別: ${stats.static}`);

// 分類統計
const meleeWeapons = WeaponFactory.getWeaponIdsByType('MeleeWeapon');
console.log(`近戰武器數量: ${meleeWeapons.length}`);
```

### 熱重載

```typescript
// 重新載入配置（開發時使用）
await WeaponFactory.reloadWeaponClasses();
```

## 🔍 除錯和診斷

### 檢查武器可用性

```typescript
const isAvailable = WeaponFactory.isWeaponClassAvailable('weapon_id');
console.log(`武器可用性: ${isAvailable}`);
```

### 獲取所有可用武器

```typescript
const availableWeapons = WeaponFactory.getAvailableWeaponIds();
console.log('可用武器:', availableWeapons);
```

### 檢查特定武器配置

```typescript
import { getWeaponConfig } from '@/Game/Factories/WeaponConfig';

const config = getWeaponConfig('fireball');
if (config) {
    console.log('火球配置:', config);
} else {
    console.log('找不到火球配置');
}
```

## ⚠️ 注意事項

1. **初始化順序**: 必須先初始化 WeaponFactory，再使用其他武器相關功能
2. **配置同步**: Google Sheets 配置變更後需要重新載入
3. **類別映射**: 新武器類別需要正確映射到配置中的 weaponClass
4. **錯誤處理**: 系統會優雅降級到靜態映射作為備用

## 🎯 最佳實踐

1. **統一命名**: 武器 ID、類別名稱和檔案名稱保持一致
2. **配置驗證**: 定期執行配置驗證檢查
3. **日誌記錄**: 關注武器創建和初始化的日誌
4. **測試覆蓋**: 為新武器編寫測試用例

## 📊 效能考量

- 武器實例會被 WeaponInstanceManager 快取，避免重複創建
- 配置數據在啟動時載入並快取，運行時效能良好
- 動態類別載入只在初始化時進行，不影響遊戲運行效能

---

*此文檔對應配置驅動武器系統 v2.0*
