# 投射物系統重構完成報告

## 📅 日期：2025-10-18

## 🎯 重構目標

解決 `ProjectileWeapon` 和 `ProjectileBasic` 職責重疊的問題，明確兩者分工：
- **武器（Weapon）**：攻擊時機 + 物理屬性（速度、射程）
- **彈藥（Projectile）**：命中邏輯 + 效果規則（穿透、爆炸）

---

## 🔄 架構變更

### 重構前

```
ProjectileWeapon (武器)
  ├─ pierceCount: number        ❌ 彈藥屬性在武器層
  ├─ areaOfEffect: number       ❌ 彈藥屬性在武器層
  └─ projectileSpeed: number    ✅ 武器屬性

ProjectileBasic (彈藥)
  ├─ initialPierceCount: number ❌ 重複定義
  ├─ areaOfEffect: number       ❌ 重複定義
  └─ onHit()                    ✅ 命中邏輯
```

**問題：**
1. 配置重複定義（武器和彈藥都有 pierceCount）
2. 職責不清（武器決定彈藥屬性還是彈藥決定自己屬性？）
3. 無法靈活切換彈藥類型

---

### 重構後

```
ProjectileWeapon (武器)
  ├─ projectileSpeed: number    ✅ 武器屬性：發射速度
  ├─ accuracy: number           ✅ 武器屬性：精度
  ├─ attackRange: number        ✅ 武器屬性：射程
  ├─ getBulletClass()           ✅ 選擇彈藥類型
  └─ getAmmoOverride()          ✅ 可選覆蓋彈藥配置

ProjectileBasic (彈藥)
  ├─ initialPierceCount: number ✅ 彈藥規則：穿透次數
  ├─ areaOfEffect: number       ✅ 彈藥規則：爆炸範圍
  ├─ getConfig()                ✅ 提供默認配置
  └─ onHit()                    ✅ 命中邏輯

CombatSystem (配置合併)
  └─ 武器覆蓋 > 彈藥默認值     ✅ 配置優先級明確
```

---

## ✅ 重構完成

所有修改已通過編譯檢查，無錯誤！

查看完整報告：`docs/投射物系統重構完成報告.md`
