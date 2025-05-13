import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CharacterORM } from 'src/ORM/charater.entity';

@Injectable()
export class CharacterService {
    constructor(
        @InjectRepository(CharacterORM)
        private readonly characterRepo: Repository<CharacterORM>,

        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) { }

    // 快取的 key 前綴
    private getCacheKey(id: number): string {
        return `character:${id}`;
    }

    /**
     * 讀取角色（含快取）
     */
    async getCharacterById(id: number): Promise<CharacterORM | null> {
        const cacheKey = this.getCacheKey(id);
        const cached = await this.cacheManager.get<CharacterORM>(cacheKey);
        if (cached) return cached;

        const character = await this.characterRepo.findOne({ where: { id } });
        if (character) {
            await this.cacheManager.set(cacheKey, character, 60); // 快取 60 秒
        }
        return character;
    }
    /**
     * 儲存角色（自動清除快取）
     */
    async saveCharacter(character: CharacterORM): Promise<CharacterORM> {
        const saved = await this.characterRepo.save(character);
        await this.cacheManager.del(this.getCacheKey(saved.id));
        return saved;
    }

    /**
     * 擴充儲存資料的機制（可自訂邏輯）
     */
    async saveGameLogicData(characterId: number, updates: Partial<CharacterORM>): Promise<CharacterORM> {
        const char = await this.getCharacterById(characterId);
        if (!char) throw new Error('角色不存在');

        const updated = this.characterRepo.merge(char, updates);
        return await this.saveCharacter(updated);
    }

    /**
     * 清除角色快取
     */
    async clearCache(id: number) {
        await this.cacheManager.del(this.getCacheKey(id));
    }
}
