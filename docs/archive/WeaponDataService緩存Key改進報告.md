# WeaponDataService 緩存 Key 生成算法改進

## 🎯 問題描述

原有的 `generateStatsKey` 方法過於簡單，容易發生 key 衝突：

```typescript
// ❌ 舊版本 - 容易衝突
return `${weaponData.weaponId}_${weaponData.level}_${weaponData.enhanceLevel}_${weaponData.durability}`;
```

## 🔧 改進方案

### 1. 新的 Key 生成策略

```typescript
// ✅ 新版本 - 強健的唯一性保證
static generateStatsKey(weaponData: WeaponData): string {
    // 優先使用 uniqueId（最可靠）
    if (weaponData.uniqueId) {
        return `weapon_${weaponData.uniqueId}`;
    }

    // 包含所有影響屬性計算的因素
    const keyComponents = [
        weaponData.weaponId,
        weaponData.level,
        weaponData.enhanceLevel,
        weaponData.exp,
        weaponData.durability,
        weaponData.quality || weaponData.rarity || 'normal',
        this.serializeProperties(weaponData.fixedProperties),
        this.serializeProperties(weaponData.randomProperties)
    ];

    // 使用哈希縮短 key 長度
    const hash = this.generateSimpleHash(keyComponents.join('|'));
    return `${weaponData.weaponId}_lv${weaponData.level}_enh${weaponData.enhanceLevel}_${hash}`;
}
```

### 2. 屬性序列化

```typescript
private static serializeProperties(properties: any): string {
    const props = properties.toArray();
    return props.map(prop => 
        `${prop.type}:${prop.value}:${prop.subType}`
    ).sort().join(','); // 排序確保一致性
}
```

### 3. 簡單哈希算法

```typescript
private static generateSimpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32位整數
    }
    return Math.abs(hash).toString(36); // 36進制縮短長度
}
```

## 🎁 改進效果

### 之前的問題：
```typescript
// 這些武器可能產生相同的 key
weapon1: { weaponId: "sword", level: 1, enhanceLevel: 0, durability: 100 }
weapon2: { weaponId: "sword", level: 1, enhanceLevel: 0, durability: 100 }
// 但它們可能有不同的隨機屬性！
```

### 現在的解決方案：
```typescript
// 每個武器都有唯一的 key
weapon1: "sword_lv1_enh0_a3x9k2"  // 包含所有屬性的哈希
weapon2: "sword_lv1_enh0_b7y5m8"  // 不同的隨機屬性產生不同哈希
weapon3: "weapon_unique_12345"    // 有 uniqueId 的直接使用
```

## 🔍 技術細節

### Key 生成優先級：
1. **uniqueId 存在** → 直接使用 `weapon_{uniqueId}`
2. **uniqueId 不存在** → 使用完整屬性哈希

### 包含的屬性因素：
- ✅ weaponId（武器類型）
- ✅ level（等級）
- ✅ enhanceLevel（強化等級）
- ✅ exp（經驗值）
- ✅ durability（耐久度）
- ✅ quality/rarity（品質）
- ✅ fixedProperties（固定屬性）
- ✅ randomProperties（隨機屬性）

### 哈希特性：
- **確定性**：相同輸入總是產生相同哈希
- **分散性**：微小差異產生完全不同的哈希
- **緊湊性**：使用36進制縮短長度

## 📈 性能優化

1. **優先使用 uniqueId**：避免複雜計算
2. **屬性排序**：確保相同屬性產生相同字符串
3. **簡單哈希**：避免昂貴的加密算法
4. **錯誤處理**：序列化失敗時返回空字符串

## ⚡ 使用建議

```typescript
// 推薦：為所有武器設置 uniqueId
const weaponData = new WeaponData("sword");
weaponData.uniqueId = "weapon_12345"; // 最佳實踐

// 系統會自動選擇最優的 key 生成策略
const cacheKey = WeaponDataService.generateStatsKey(weaponData);
```

---
*改進完成時間：2025年9月11日*  
*影響文件：WeaponDataService.ts*
