# BulletFactory 清理完成報告

## 🧹 **清理內容**

### ❌ **移除的方法**

1. `createExplosiveBullet()` - 爆炸邏輯現在由 `ExplosiveProjectile` 處理
2. `createPiercingBullet()` - 穿透邏輯現在由 `PiercingProjectile` 處理

### ✅ **保留的方法**

1. `createBullet()` - 基礎子彈創建（核心功能）
2. `createBulletFromWeapon()` - 根據武器創建子彈（常用功能）
3. `createMultipleBullets()` - 批量創建子彈（散彈等需要）
4. `createShotgunBullets()` - 散彈創建（特殊需求）

## 🎯 **新的職責分工**

### **BulletFactory**

- ✅ 創建 `ServerBullet` 實例（物理移動載體）
- ✅ 設定子彈的物理屬性（速度、方向、距離等）
- ✅ 根據武器類型設定基礎參數

### **ProjectileFactory**

- ✅ 創建投射物邏輯類（命中效果處理）
- ✅ 處理爆炸、穿透、冰凍等特殊效果
- ✅ 返回標準的 `AttackResult`

## 📊 **清理效果**

### **代碼簡化**

- 🔧 移除了 **30+ 行**重複的子彈創建邏輯
- 🔧 避免了邏輯分散在兩個系統中
- 🔧 提高了代碼的內聚性

### **維護性提升**

- ✅ 單一職責原則：BulletFactory 只負責物理創建
- ✅ 開放封閉原則：新增投射物類型不需要修改 BulletFactory
- ✅ 依賴倒置：高層模組（BulletSystem）不依賴具體的投射物邏輯

### **使用方式**

```typescript
// ✅ 現在的方式：簡化且統一
const bullet = BulletFactory.createBullet({
    bulletType: "explosive", // 只需要指定類型
    // ... 其他基礎參數
});

// ProjectileFactory 會自動根據 bulletType 處理邏輯
const projectile = ProjectileFactory.getProjectile(
    bullet.bulletType, 
    bullet.weaponId, 
    bullet.damage
);
```

```typescript
// ❌ 之前的方式：重複且分散
const explosiveBullet = BulletFactory.createExplosiveBullet(config);
const piercingBullet = BulletFactory.createPiercingBullet(config);
// 每種類型都需要單獨的方法，邏輯分散
```

## 🔮 **未來益處**

1. **新增投射物類型**：只需要在 ProjectileFactory 添加，不需要修改 BulletFactory
2. **更好的測試**：可以獨立測試物理移動和邏輯處理
3. **性能優化**：ProjectileFactory 的緩存機制避免重複創建邏輯實例

---

## 💡 **總結**

通過清理這些方法，我們實現了：

- ✅ 更清晰的職責分工
- ✅ 更好的代碼組織
- ✅ 更容易的未來擴展
- ✅ 符合 SOLID 設計原則

BulletFactory 現在專注於它應該做的事：創建輕量化的物理移動載體。而複雜的邏輯處理交給專門的 ProjectileFactory 來負責。