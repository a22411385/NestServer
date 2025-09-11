import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TalentService } from '../Game/Services/TalentService';
import { TalentManager } from '../Game/Managers/TalentManager';
import { PropertyCalculationService } from '../Game/Services/PropertyCalculationService';
import { AuthGuard } from '@/Provider/AuthGuard';
import { CharacterService } from '@/Service/charater.serivce';
import { ErrorCode } from './ErrorCode';

/**
 * 天賦系統控制器
 * 處理天賦相關的API請求
 */
@Controller('talent')
@UseGuards(AuthGuard)
export class TalentController {
    constructor(
        private readonly characterService: CharacterService
    ) { }

    /**
     * 獲取所有天賦配置（天賦樹資料）
     */
    @Get('configs')
    async getTalentConfigs() {
        try {
            const talentService = TalentService.getInstance();
            const stats = talentService.getStats();

            if (!stats.isInitialized) {
                return {
                    success: false,
                    errorCode: ErrorCode.SYSTEM_NOT_READY,
                    message: '天賦系統尚未初始化'
                };
            }

            // 獲取所有分類的天賦
            const categories = ['COMBAT', 'WEAPON', 'DEFENSE', 'UTILITY', 'MAGIC'];
            const talentTree: { [key: string]: any[] } = {};

            for (const category of categories) {
                talentTree[category] = talentService.getTalentsByCategory(category as any);
            }

            return {
                success: true,
                data: {
                    talentTree,
                    stats
                }
            };
        } catch (error) {
            console.error('獲取天賦配置失敗:', error);
            return {
                success: false,
                errorCode: ErrorCode.INTERNAL_ERROR,
                message: '獲取天賦配置失敗'
            };
        }
    }

    /**
     * 獲取角色天賦資料
     */
    @Get('character/:characterId')
    async getCharacterTalents(@Param('characterId') characterId: string, @Request() req: any) {
        try {
            // 驗證角色歸屬
            const character = await this.characterService.getCharacterByIdAndUserId(
                parseInt(characterId),
                req.user.id
            );

            if (!character) {
                return {
                    success: false,
                    errorCode: ErrorCode.CHARACTER_NOT_FOUND,
                    message: '角色不存在'
                };
            }

            const propertyService = PropertyCalculationService.getInstance();
            const talentStats = propertyService.getTalentStats(character);
            const talentData = character.getTalentData();

            return {
                success: true,
                data: {
                    character: {
                        id: character.id,
                        name: character.name,
                        level: character.Lv
                    },
                    talentData,
                    talentStats
                }
            };
        } catch (error) {
            console.error('獲取角色天賦失敗:', error);
            return {
                success: false,
                errorCode: ErrorCode.INTERNAL_ERROR,
                message: '獲取角色天賦失敗'
            };
        }
    }

    /**
     * 分配天賦點數
     */
    @Post('allocate')
    async allocateTalentPoint(
        @Body() body: { characterId: number, talentId: string },
        @Request() req: any
    ) {
        try {
            const { characterId, talentId } = body;

            // 驗證角色歸屬
            const character = await this.characterService.getCharacterByIdAndUserId(
                characterId,
                req.user.id
            );

            if (!character) {
                return {
                    success: false,
                    errorCode: ErrorCode.CHARACTER_NOT_FOUND,
                    message: '角色不存在'
                };
            }

            // 確保天賦點數為最新（基於等級）
            const propertyService = PropertyCalculationService.getInstance();
            propertyService.updateCharacterLevel(character);

            // 分配天賦點
            const success = propertyService.allocateTalentPoint(character, talentId);

            if (!success) {
                return {
                    success: false,
                    errorCode: ErrorCode.TALENT_ALLOCATION_FAILED,
                    message: '天賦點分配失敗'
                };
            }

            // 保存角色資料
            await this.characterService.saveCharacter(character);

            // 返回更新後的數據
            const updatedTalentStats = propertyService.getTalentStats(character);
            const updatedTalentData = character.getTalentData();

            return {
                success: true,
                data: {
                    talentData: updatedTalentData,
                    talentStats: updatedTalentStats,
                    message: '天賦點分配成功'
                }
            };
        } catch (error) {
            console.error('分配天賦點失敗:', error);
            return {
                success: false,
                errorCode: ErrorCode.INTERNAL_ERROR,
                message: '分配天賦點失敗'
            };
        }
    }

    /**
     * 重置角色天賦
     */
    @Post('reset')
    async resetTalents(
        @Body() body: { characterId: number },
        @Request() req: any
    ) {
        try {
            const { characterId } = body;

            // 驗證角色歸屬
            const character = await this.characterService.getCharacterByIdAndUserId(
                characterId,
                req.user.id
            );

            if (!character) {
                return {
                    success: false,
                    errorCode: ErrorCode.CHARACTER_NOT_FOUND,
                    message: '角色不存在'
                };
            }

            // 重置天賦
            const propertyService = PropertyCalculationService.getInstance();
            propertyService.resetTalents(character);

            // 保存角色資料
            await this.characterService.saveCharacter(character);

            // 返回更新後的數據
            const updatedTalentStats = propertyService.getTalentStats(character);
            const updatedTalentData = character.getTalentData();

            return {
                success: true,
                data: {
                    talentData: updatedTalentData,
                    talentStats: updatedTalentStats,
                    message: '天賦重置成功'
                }
            };
        } catch (error) {
            console.error('重置天賦失敗:', error);
            return {
                success: false,
                errorCode: ErrorCode.INTERNAL_ERROR,
                message: '重置天賦失敗'
            };
        }
    }

    /**
     * 獲取角色的完整屬性計算結果
     */
    @Get('properties/:characterId')
    async getCharacterProperties(@Param('characterId') characterId: string, @Request() req: any) {
        try {
            // 驗證角色歸屬
            const character = await this.characterService.getCharacterByIdAndUserId(
                parseInt(characterId),
                req.user.id
            );

            if (!character) {
                return {
                    success: false,
                    errorCode: ErrorCode.CHARACTER_NOT_FOUND,
                    message: '角色不存在'
                };
            }

            const propertyService = PropertyCalculationService.getInstance();

            // 獲取完整屬性摘要
            const propertySummary = propertyService.getPropertySummary(character);

            // 獲取天賦效果詳情
            const talentManager = TalentManager.getInstance();
            const talentEffects = talentManager.calculateTalentEffects(character.id.toString());

            return {
                success: true,
                data: {
                    character: {
                        id: character.id,
                        name: character.name,
                        level: character.Lv
                    },
                    properties: propertySummary,
                    talentEffects,
                    effectsCount: talentEffects.length
                }
            };
        } catch (error) {
            console.error('獲取角色屬性失敗:', error);
            return {
                success: false,
                errorCode: ErrorCode.INTERNAL_ERROR,
                message: '獲取角色屬性失敗'
            };
        }
    }

    /**
     * 獲取天賦效果詳情
     */
    @Get('effects/:talentId')
    async getTalentEffects(@Param('talentId') talentId: string) {
        try {
            const talentService = TalentService.getInstance();
            const talentConfig = talentService.getTalentConfig(talentId);
            const talentEffects = talentService.getTalentEffects(talentId);

            if (!talentConfig) {
                return {
                    success: false,
                    errorCode: ErrorCode.TALENT_NOT_FOUND,
                    message: '天賦不存在'
                };
            }

            return {
                success: true,
                data: {
                    config: talentConfig,
                    effects: talentEffects
                }
            };
        } catch (error) {
            console.error('獲取天賦效果失敗:', error);
            return {
                success: false,
                errorCode: ErrorCode.INTERNAL_ERROR,
                message: '獲取天賦效果失敗'
            };
        }
    }
}
