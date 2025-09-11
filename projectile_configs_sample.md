# 投射物配置範例

這個範例展示了如何使用新的投射物配置系統來替代簡單的 `bulletType` 字串。

## 配置結構說明

每個投射物配置包含以下主要部分：
- **基本信息**: id, name, category, enabled
- **視覺效果**: sprite, animation, glow effects
- **物理屬性**: speed, trajectory, distance, penetration
- **戰鬥屬性**: damage, area effects, status effects
- **特效系統**: particles, trails, explosions
- **音效設置**: launch, flight, hit sounds

## 範例投射物

### 1. 基礎火球 (fireball_basic)
```yaml
類別: magic_ball
傷害: 50 (火焰傷害)
速度: 300
範圍爆炸: 64 半徑, 30 傷害
狀態效果: 75% 機率造成燃燒 (3秒, 每秒5傷害)
視覺效果: 火焰粒子軌跡, 爆炸特效, 螢幕震動
音效: 施法聲, 飛行聲, 撞擊聲, 爆炸聲
```

### 2. 大型火球 (fireball_large)
```yaml
類別: magic_ball
傷害: 80 (火焰傷害)
速度: 250
範圍爆炸: 96 半徑, 50 傷害
狀態效果: 90% 機率造成燃燒 (5秒, 每秒8傷害)
穿透: 2 個目標
特色: 更大的視覺效果和音效
```

### 3. 基礎冰球 (iceball_basic)
```yaml
類別: magic_ball
傷害: 45 (冰霜傷害)
速度: 280
範圍爆炸: 48 半徑, 25 傷害 (無衰減)
狀態效果: 
  - 60% 機率冰凍 (2秒)
  - 80% 機率減速 (4秒, 50% 速度)
視覺效果: 冰晶粒子, 破碎特效
```

### 4. 毒球 (poison_ball)
```yaml
類別: magic_ball
傷害: 35 (毒素傷害)
速度: 200 → 350 (加速)
軌跡: 拋物線 (重力影響)
範圍爆炸: 80 半徑, 20 傷害
狀態效果: 95% 機率中毒 (8秒, 每秒3傷害)
特色: 跟隨投射物的煙霧效果
```

### 5. 飛刀 (throwing_knife)
```yaml
類別: weapon
傷害: 40 (物理傷害)
速度: 400
穿透: 3 個目標
特色: 隨方向旋轉, 金屬火花軌跡
音效: 投擲聲, 旋轉聲, 撞擊聲
```

### 6. 基礎箭矢 (arrow_basic)
```yaml
類別: weapon
傷害: 55 (物理傷害)
速度: 500
射程: 800
特色: 高速直線飛行, 木屑撞擊效果
```

### 7. 閃電 (lightning_bolt)
```yaml
類別: energy
傷害: 60 (雷電傷害)
速度: 800
穿透: 5 個目標
狀態效果: 40% 機率眩暈 (1秒)
特殊效果: 連鎖閃電
視覺效果: 強烈發光, 電流閃爍
```

### 8. 追蹤飛彈 (homing_missile)
```yaml
類別: energy
傷害: 70 (物理傷害)
軌跡: 追蹤目標
追蹤參數: 轉向速度 3.0, 偵測範圍 200
範圍爆炸: 80 半徑, 40 傷害
特色: 加速飛行, 推進器軌跡, 螢幕震動
```

### 9. 治療球 (healing_orb)
```yaml
類別: special
治療: 30 (負傷害值)
軌跡: 拋物線 (反重力)
範圍治療: 60 半徑, 20 治療
視覺效果: 綠色光暈, 治療粒子
音效: 柔和的治療音效
```

## 使用方式

1. **導入 CSV 到 Excel**: 直接開啟 `projectile_configs_sample.csv`
2. **配置管理**: 在 Excel 中編輯各種屬性
3. **系統整合**: 使用 `ProjectileManager` 載入配置
4. **動態切換**: 武器可以指定不同的 `projectileId`

## 擴展建議

- **視覺變體**: 同一投射物可以有多種皮膚 (例如: `fireball_red`, `fireball_blue`)
- **等級系統**: 透過數值調整實現不同等級 (例如: `fireball_lv1`, `fireball_lv2`)
- **特殊效果**: 添加更多 `specialEffects` 如反彈、分裂、傳送等
- **條件配置**: 根據角色等級或裝備動態調整屬性

這個系統可以完全替代原本的 `bulletType: string`，提供豐富的客製化選項和擴展性。
