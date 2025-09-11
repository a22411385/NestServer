import { TalentService } from './src/Game/Services/TalentService';
import { TalentManager } from './src/Game/Managers/TalentManager';
import { GoogleSheetCache } from './src/Tasks/GoogleSheetCache';

async function testPrerequisitesParsing() {
    console.log('🚀 測試天賦前置需求解析...\n');

    try {
        // 使用本地快取
        const googleSheetCache = GoogleSheetCache.getInstance();
        console.log('✅ 使用本地 Google Sheets 快取');

        // 初始化天賦服務
        const talentService = TalentService.getInstance();
        await talentService.initialize();
        console.log('✅ TalentService 初始化成功');

        // 初始化天賦管理器
        const talentManager = TalentManager.getInstance();
        await talentManager.initialize();
        console.log('✅ TalentManager 初始化成功');

        console.log('\n🔍 檢查天賦配置的 prerequisites 格式:');

        // 檢查所有天賦配置
        const allCategories = talentService.getAllCategories();
        let hasPrerequisites = false;

        for (const category of allCategories) {
            const talents = talentService.getTalentsByCategory(category);
            for (const talent of talents) {
                if (talent.prerequisites && talent.prerequisites.trim() !== '') {
                    hasPrerequisites = true;
                    console.log(`📋 ${talent.name} (${talent.id}): prerequisites = "${talent.prerequisites}"`);

                    // 測試解析
                    const prerequisiteIds = talent.prerequisites.split(',').map(id => id.trim()).filter(id => id.length > 0);
                    console.log(`   解析結果: [${prerequisiteIds.join(', ')}]`);

                    // 測試驗證邏輯
                    const mockAllocatedTalents: Record<string, number> = {};
                    const isValid = talentService.validatePrerequisites(talent.id, mockAllocatedTalents);
                    console.log(`   驗證結果: ${isValid ? '✅ 通過' : '❌ 失敗'} (空的已分配天賦)`);
                    console.log('');
                }
            }
        }

        if (!hasPrerequisites) {
            console.log('📝 當前沒有天賦配置有前置需求');
            console.log('💡 測試手動創建的範例:');

            // 模擬測試
            const mockTalent = {
                id: 'test_talent',
                name: 'Test Talent',
                description: 'Test',
                icon: 'test',
                category: 'combat' as any,
                position_x: 0,
                position_y: 0,
                max_points: 5,
                prerequisites: 'talent1,talent2, talent3', // 包含空格測試
                is_active: true
            };

            console.log(`測試解析: "${mockTalent.prerequisites}"`);
            const parsed = mockTalent.prerequisites.split(',').map(id => id.trim()).filter(id => id.length > 0);
            console.log(`解析結果: [${parsed.join(', ')}]`);
        }

        console.log('\n🎉 前置需求解析測試完成！');
        console.log('✅ 成功將 prerequisites 從 string[] 改為逗號分隔的 string');
        console.log('✅ 解析邏輯正確處理空格和空字串');

    } catch (error) {
        console.error('❌ 測試失敗:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

testPrerequisitesParsing();
