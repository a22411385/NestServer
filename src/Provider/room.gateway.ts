import { WebSocketGateway, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CharacterService } from 'src/Service/charater.serivce';
import { GoogleSheetsService } from 'src/Service/google-sheets.service';
import { ModuleRef } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';

import { GamePlayer } from 'src/Game/GamePlayer';
import { GameService } from 'src/Service/game.service';
import { HttpRespone } from 'src/Shared/struct';
import { MessageID } from 'src/Shared/MessageID';
import { ErrorCode } from 'src/Shared/ErrorCode';
import { JWTPayload } from 'src/struct';
import { MonsterData, ProfessionData } from 'src/Game/Combat/UnitData';
import { ResponeError, ResponeSuccess } from 'src/Util/respone.util';
import { BattleEvent } from 'src/Shared/Enum';

@WebSocketGateway({ cors: true })
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {

    @WebSocketServer()
    server: Server;

    players = new Map<string, GamePlayer>();
    private roomMap = new Map<string, GameService>();

    constructor(
        private readonly jwtService: JwtService,
        private readonly charService: CharacterService,
        private readonly googleSheetService: GoogleSheetsService,
        private readonly moduleRef: ModuleRef
    ) { }

    async onModuleInit() {
        console.log('✅ GameGateway 已啟動');
        await this.googleSheetService.InitData([
            { tableName: "Profession", classType: ProfessionData },
            { tableName: "Monster", classType: MonsterData }
        ]);
    }

    async handleConnection(client: Socket) {
        try {
            const rawToken = client.handshake.query.token as string;
            if (!rawToken) throw new Error('No token found');

            const payload = this.jwtService.verify(rawToken, { secret: process.env.JWT_KEY }) as JWTPayload;
            if (!payload.playerId) throw new Error('Token 驗證失敗: 沒有角色');

            let player = this.players.get(payload.openId);
            if (!player) {
                const ch = await this.charService.getCharacterById(payload.playerId);
                if (!ch) throw new Error('沒有角色資料');

                player = new GamePlayer(ch);
                player.id = payload.openId;
                this.players.set(payload.openId, player);
            }

            client.data.user = payload;
            client.emit('init', player.ToJson());

            console.log(`Client connected: ${client.id}`);
        } catch (err) {
            console.warn('❌ 連線失敗:', err.message);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage(MessageID.STARTBATTLE)
    async startBattle(@MessageBody() data: any, @ConnectedSocket() client: Socket): Promise<HttpRespone> {
        return this.safeExecute(async () => {
            const payload = client.data.user as JWTPayload;
            const player = this.getPlayerOrThrow(payload.openId);

            if (player.roomId !== '') {
                return ResponeError(ErrorCode.正在戰鬥中);
            }

            const res = await this.CreateRoom('single', -1);
            if (typeof res !== 'string') {
                return ResponeError(ErrorCode.房間不存在);
            }
            client.join(res);
            this.JoinRoom(res, player);
            player.roomId = res;

            return ResponeSuccess(res);
        });
    }

    @SubscribeMessage(MessageID.READYFORGAME)
    async playerReady(@ConnectedSocket() client: Socket): Promise<HttpRespone> {
        return this.safeExecute(async () => {
            const payload = client.data.user as JWTPayload;
            const player = this.getPlayerOrThrow(payload.openId);

            if (player.roomId === '') {
                return ResponeError(ErrorCode.房間不存在);
            }

            this.Ready(player.roomId, player);

            return ResponeSuccess();
        });
    }

    private async CreateRoom(roomName: string, areaID: number): Promise<ErrorCode | string> {
        const r = await this.moduleRef.resolve(GameService);
        this.roomMap.set(r.UniqueID, r);
        return r.UniqueID;
    }

    private Ready(roomId: string, player: GamePlayer): ErrorCode {
        const room = this.getRoomOrThrow(roomId);
        room.PlayerReady(player);
        return ErrorCode.SUCCESS;
    }

    private JoinRoom(roomId: string, player: GamePlayer): ErrorCode {
        const room = this.getRoomOrThrow(roomId);
        room.JoinPlayer(player);
        return ErrorCode.SUCCESS;
    }

    @OnEvent('room.close')
    private RoomClose(param: { roomId: string }) {
        console.log(`[房間 ${param.roomId}] 房間關閉`);
        this.server.to(param.roomId).emit(MessageID.ROOMISCLOSE)
        this.server.in(param.roomId).socketsLeave(param.roomId);
        const room = this.getRoomOrThrow(param.roomId);
        room.Players.forEach((p) => {
            p.roomId = "";

        })

        this.roomMap.delete(param.roomId);
    }

    @OnEvent('game.battleEvent')
    private BattleEvent(param: { roomId: string, data: BattleEvent }) {
        //  const room = this.getRoomOrThrow(param.roomId);
        this.server.to(param.roomId).emit(MessageID.BATTLE_EVENT, param.data);
    }

    // --- 以下是共用小工具 ---

    private getPlayerOrThrow(openId: string): GamePlayer {
        const player = this.players.get(openId);
        if (!player) {
            throw new Error('玩家不存在');
        }
        return player;
    }

    private getRoomOrThrow(roomId: string): GameService {
        const room = this.roomMap.get(roomId);
        if (!room) {
            throw new Error('房間不存在');
        }
        return room;
    }

    private async safeExecute(fn: () => Promise<HttpRespone>): Promise<HttpRespone> {
        try {
            return await fn();
        } catch (error) {
            console.error('❌ 執行錯誤:', error.message);
            return ResponeError(ErrorCode.不存在的資料);
        }
    }
}