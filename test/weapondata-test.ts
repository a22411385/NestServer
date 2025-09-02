import { WeaponData } from '../src/Colyseus/Schema/Weapon/WeaponData';
import { WeaponDataService } from '../src/Game/Services/WeaponDataService';

console.log('測試 WeaponData 顯示名稱...');

// 創建武器數據實例
const weapon1 = new WeaponData('baseball_bat');
console.log(`球棒: ${WeaponDataService.generateDisplayName(weapon1)}`);

const weapon2 = new WeaponData('fireball');
console.log(`火球: ${WeaponDataService.generateDisplayName(weapon2)}`);

// 測試強化
weapon1.level = 5;
weapon1.enhanceLevel = 2;
console.log(`強化球棒: ${WeaponDataService.generateDisplayName(weapon1)}`);

console.log('測試完成!');
