# Excel 導入指南

## 快速開始

1. **開啟 CSV 檔案**
   - 用 Excel 開啟 `projectile_configs_sample.csv`
   - 選擇「分隔符號」並使用逗號作為分隔符號
   - 文字編碼選擇 UTF-8

2. **調整欄位格式**
   - 將所有 JSON 欄位設為「文字」格式（visual, physics, combat, effects, audio）
   - enabled 欄位可以使用布林值或文字

3. **編輯建議**
   - 使用 Excel 的「自動調整欄寬」功能
   - 凍結首列以便捲動時保持標題可見
   - 使用篩選功能按類別查看不同類型的投射物

## JSON 欄位說明

### Visual (視覺效果)
```json
{
  "spriteKey": "投射物貼圖名稱",
  "scale": 縮放倍率,
  "width": 寬度,
  "height": 高度,
  "animation": {
    "key": "動畫名稱",
    "frameRate": 幀率,
    "repeat": 重複次數
  },
  "rotateWithDirection": 是否隨方向旋轉,
  "tint": 色調 (RGB數值),
  "glowEffect": {
    "color": 發光顏色,
    "intensity": 發光強度
  }
}
```

### Physics (物理屬性)
```json
{
  "speed": 初始速度,
  "acceleration": 加速度,
  "maxSpeed": 最大速度,
  "trajectory": "軌跡類型",
  "maxDistance": 最大距離,
  "penetration": 穿透目標數
}
```

### Combat (戰鬥屬性)
```json
{
  "baseDamage": 基礎傷害,
  "damageType": "傷害類型",
  "areaOfEffect": {
    "radius": 範圍半徑,
    "damage": 範圍傷害,
    "falloff": 是否距離衰減
  },
  "statusEffects": [
    {
      "type": "狀態類型",
      "chance": 觸發機率,
      "duration": 持續時間,
      "value": 效果數值
    }
  ]
}
```

## 常用數值參考

### 傷害類型
- `physical`: 物理傷害
- `fire`: 火焰傷害
- `ice`: 冰霜傷害
- `poison`: 毒素傷害
- `lightning`: 雷電傷害
- `healing`: 治療 (負傷害)

### 軌跡類型
- `straight`: 直線
- `arc`: 拋物線
- `curve`: 曲線
- `homing`: 追蹤
- `spiral`: 螺旋

### 狀態效果
- `burn`: 燃燒
- `freeze`: 冰凍
- `poison`: 中毒
- `slow`: 減速
- `stun`: 眩暈

### 顏色代碼 (RGB)
- 紅色: 16711680
- 藍色: 65535
- 綠色: 65280
- 黃色: 16776960
- 白色: 16777215
- 黑色: 0

現在您可以直接使用這些範例數據來設計您的投射物系統！
