import { Schema } from "@colyseus/schema";
import { Client, Room } from "colyseus";
import { LobbyPlayer } from "../Schema/LobbyState";
import { JWTPayload } from "@/struct";
import jwt from 'jsonwebtoken';
import { getAppContext } from "@/main";
import { DataSource, Repository } from "typeorm";
import { CharacterORM } from "@/ORM/charater.entity";

export class MiddleRoom<T extends Schema> extends Room<T> {

    private characterRepo?: Repository<CharacterORM>;

    async onAuth(client: Client, options: any): Promise<LobbyPlayer> {
        console.log(`Player ${client.sessionId} joined lobby`);
        const token = options?.token;
        if (!token) {

            throw new Error("Unauthorized")
        }
        try {
            // 業務邏輯：驗證和處理玩家加入
            const playerData = await this.validatePlayerOptions(token, client.sessionId);

            // 創建玩家 Schema 物件
            const player = new LobbyPlayer();
            player.id = playerData.id;
            player.name = playerData.name;
            player.characterId = playerData.characterId;
            player.level = playerData.level;
            player.status = "idle";
            return player;
        } catch (error) {
            console.error(`Error adding player ${client.sessionId}:`, error);
            client.send("error", { message: "Failed to join lobby: " + error.message });
            client.leave();
            throw error;
        }

    }

    /**
        * 業務邏輯：驗證玩家選項
        */
    protected async validatePlayerOptions(token: string, sessionId: string) {
        const payload = jwt.verify(token, process.env.JWT_KEY as string) as JWTPayload;
        const app = await getAppContext();
        const dataSource = app.get<DataSource>(DataSource);
        this.characterRepo = dataSource.getRepository(CharacterORM);

        const character = await this.characterRepo.findOne({
            where: {
                id: payload.playerId
            }
        });
        console.log("玩家角色:", character);

        const playerName = character?.name || `Player${sessionId.substring(0, 6)}`;
        const characterId = character?.id || 1;
        const level = character?.Lv || 1;


        return {
            id: sessionId,
            name: playerName.trim(),
            characterId: characterId,
            level: level
        };
    }
}