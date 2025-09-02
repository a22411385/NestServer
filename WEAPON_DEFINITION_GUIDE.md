# 武器名稱和類型定義指南

## 📋 **定義架構說明**

您的武器系統採用**分離關注點**的設計，將武器的不同方面分別定義在不同的地方：

### **1. 武器配置定義** 📊
**位置**: `f:\RPGWork\NestServer\src\Game\Factories\WeaponConfig.ts`

**這是武器名稱、類型和基礎屬性的主要定義地點**

```typescript
export const WEAPON_CONFIGS: Record<string, WeaponConfig> = {
    baseball_bat: {
        id: 'baseball_bat',
        name: 'Baseball Bat',           // 英文名稱 (系統用)
        displayName: '球棒',            // 顯示名稱 (玩家看到的)
        type: 'melee',                  // 武器類型
        rarity: 'common',               // 稀有度
        description: '一把普通的球棒...',  // 描述
        baseDamage: 25,                 // 基礎傷害
        attackSpeed: 1200,              // 攻擊間隔
        attackRange: 80,                // 攻擊範圍
        specialProperties: {            // 特殊屬性
            knockbackForce: 150,
            sweepAngle: 0.5
        }
    }
};
```

### **2. 武器類別註冊** 🏭
**位置**: `f:\RPGWork\NestServer\src\Game\Factories\WeaponFactory.ts`

**這裡註冊武器ID對應的實作類別**

```typescript
private static weaponClassMap = new Map<string, any>([
    ['baseball_bat', BaseballBat],       // ID → 類別映射
    ['fireball', Fireball],
    ['healing_potion', HealingPotion]
]);
```

### **3. 武器實例數據** 💾
**位置**: `f:\RPGWork\NestServer\src\Colyseus\Schema\Weapon\WeaponData.ts`

**這裡存儲武器的實例狀態（等級、強化等）**

```typescript
export class WeaponData extends Schema {
    @type("string") weaponId: string = "";    // 武器ID
    @type("string") weaponType: string = "";  // 武器類型
    @type("number") level: number = 1;        // 武器等級
    @type("number") enhanceLevel: number = 0; // 強化等級
    // ... 其他實例屬性
}
```

### **4. 武器行為實現** ⚔️
**位置**: `f:\RPGWork\NestServer\src\Colyseus\Schema\Weapon\MeleeWeapon\*.ts`

**這裡實現具體的武器行為和邏輯**

## 🎯 **如何添加新武器**

### **步驟1: 定義武器配置**
在 `WeaponConfig.ts` 中添加新武器：

```typescript
dragon_sword: {
    id: 'dragon_sword',
    name: 'Dragon Sword',
    displayName: '龍劍',
    type: 'melee',
    rarity: 'epic',
    description: '傳說中的龍劍，擁有強大的火焰力量',
    baseDamage: 60,
    attackSpeed: 1000,
    attackRange: 120,
    specialProperties: {
        knockbackForce: 200,
        sweepAngle: 0.6,
        fireDamage: 15,
        fireDuration: 2000
    }
}
```

### **步驟2: 創建武器類別**
創建 `DragonSword.ts` 文件：

```typescript
import { MeleeWeapon } from "../Baisc/MeleeWeapon";

export class DragonSword extends MeleeWeapon {
    constructor() {
        super(
            'dragon_sword',  // weaponId
            120,             // attackRange
            60,              // baseDamage
            1000,            // attackSpeed
            200,             // knockbackForce
            0.6,             // sweepAngle
            1                // maxTargets
        );
    }
    
    // 實現特殊攻擊邏輯
    protected override createMeleeVisualEffects(attacker, direction) {
        return [{
            type: 'dragon_flame',
            // ... 特殊效果
        }];
    }
}
```

### **步驟3: 註冊武器類別**
在 `WeaponFactory.ts` 中註冊：

```typescript
import { DragonSword } from "../../Colyseus/Schema/Weapon/MeleeWeapon/DragonSword";

private static weaponClassMap = new Map<string, any>([
    ['baseball_bat', BaseballBat],
    ['dragon_sword', DragonSword],  // 🆕 新增這行
    ['fireball', Fireball],
    ['healing_potion', HealingPotion]
]);
```

## 📚 **使用方式**

### **獲取武器信息**
```typescript
import { getWeaponConfig } from "@/Game/Factories/WeaponConfig";

// 獲取武器配置
const config = getWeaponConfig('dragon_sword');
console.log(config.displayName); // '龍劍'
console.log(config.type);        // 'melee'
console.log(config.rarity);      // 'epic'
```

### **創建武器實例**
```typescript
import { WeaponFactory } from "@/Game/Factories/WeaponFactory";

// 創建武器實例
const weapon = WeaponFactory.createWeapon('dragon_sword');
console.log(weapon.name);        // '龍劍'
console.log(weapon.baseDamage);  // 60
```

### **武器數據管理**
```typescript
// 創建武器數據
const weaponData = new WeaponData('dragon_sword');
console.log(weaponData.getDisplayName()); // '龍劍'

// 強化武器後
weaponData.enhance();
weaponData.level = 5;
console.log(weaponData.getDisplayName()); // '龍劍 +1 (Lv.5)'
```

## 🎨 **最佳實踐**

### **1. 命名規範**
- **武器ID**: 使用 snake_case，如 `dragon_sword`
- **英文名**: 使用 Pascal Case，如 `Dragon Sword` 
- **顯示名**: 使用本地化語言，如 `龍劍`

### **2. 配置組織**
```typescript
// 按類型分組配置
const WEAPON_CONFIGS = {
    // =================== 近戰武器 ===================
    baseball_bat: { /* ... */ },
    iron_sword: { /* ... */ },
    dragon_sword: { /* ... */ },
    
    // =================== 遠程武器 ===================
    fireball: { /* ... */ },
    magic_bow: { /* ... */ },
    
    // =================== 支援武器 ===================
    healing_potion: { /* ... */ },
    blessing_staff: { /* ... */ }
};
```

### **3. 類型安全**
```typescript
// 使用 TypeScript 接口確保配置正確
export interface WeaponConfig {
    id: string;
    name: string;
    displayName: string;
    type: 'melee' | 'projectile' | 'support';  // 限制類型
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    // ... 其他屬性
}
```

## 🔄 **系統整合流程**

1. **WeaponConfig.ts** → 定義武器的靜態信息（名稱、類型、屬性）
2. **WeaponFactory.ts** → 根據配置創建武器實例
3. **WeaponData.ts** → 存儲武器的動態狀態（等級、強化）
4. **具體武器類** → 實現武器的行為邏輯
5. **客戶端** → 接收武器數據並顯示給玩家

## 🎯 **總結**

**武器名稱和類型的定義位置**：

✅ **主要定義**：`WeaponConfig.ts` - 這是您應該添加新武器的地方  
✅ **類別註冊**：`WeaponFactory.ts` - 註冊武器ID到類別的映射  
✅ **實例數據**：`WeaponData.ts` - 自動處理顯示名稱  
✅ **行為實現**：具體武器類 - 實現特殊邏輯  

這樣的設計讓您可以：
- 🎯 **集中管理** - 所有武器信息都在一個配置文件中
- 🔧 **易於擴展** - 添加新武器只需修改配置和註冊類別
- 💾 **數據分離** - 配置數據與實例狀態分離
- 🎨 **本地化支持** - 支持多語言顯示名稱
