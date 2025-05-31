import { WebSocketGateway, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CharacterService } from 'src/Service/charater.serivce';
import { GoogleSheetsService } from 'src/Service/google-sheets.service';
import { ModuleRef } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';

import { GamePlayer } from 'src/Game/GamePlayer';
import { FrameInput, GameService } from 'src/Service/game.service';
import { HttpRespone } from 'src/Shared/struct';
import { MessageID } from 'src/Shared/MessageID';
import { ErrorCode } from 'src/Shared/ErrorCode';
import { JWTPayload } from 'src/struct';
import { ResponeError, ResponeSuccess } from 'src/Util/respone.util';
import { BattleEvent } from 'src/Shared/Enum';
import { ItemFactoryService } from 'src/Service/ItemFactory.service';
import { ExperienceData } from 'src/Game/Combat/UnitData';
import { delay, LevelUtils } from 'src/Util/Utils';

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
        private readonly moduleRef: ModuleRef,
        private readonly itemService: ItemFactoryService
    ) { }

    async onModuleInit() {
        console.log('✅ GameGateway 已啟動');

        //    await this.itemService.InitData(this.googleSheetService);
        //   this.googleSheetService.InitData([
        //      { tableName: "ExperienceTable", classType: ExperienceData }
        //  ])
        // let exp = await this.googleSheetService.getSheetData<ExperienceData>('ExperienceTable');
        //LevelUtils.load(exp);
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

                player = new GamePlayer(ch, ch.name);
                player.id = payload.openId;
                this.players.set(payload.openId, player);
            }
            player.socket = client;
            client.data.user = payload;
            client.emit('connected', player.ToJson());

            if (player.roomId != '') {
                this.JoinRoom(player.roomId, player);
            }


            console.log(`Client connected: ${client.id}`);
        } catch (err) {
            console.warn('❌ 連線失敗:', err.message);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }


    public async startBattleTest(openId: string) {
        let p = this.players.get(openId);
        if (p && p.socket) {
            await this.HostRoom({}, p.socket);
            this.Ready(p.roomId, p);
        }
        else {
            console.error("玩家不存在");
        }
    }

    @SubscribeMessage(MessageID.HOSTBATTLE)
    async HostRoom(@MessageBody() data: any, @ConnectedSocket() client: Socket): Promise<HttpRespone> {
        return this.safeExecute(async () => {
            const payload = client.data.user as JWTPayload;
            const player = this.getPlayerOrThrow(payload.openId);

            if (player.roomId !== '') {
                return ResponeError(ErrorCode.已經在房間中);
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


    @SubscribeMessage(MessageID.快照同步)
    async 客戶端請求同步(@ConnectedSocket() client: Socket): Promise<HttpRespone> {
        return this.safeExecute(async () => {
            const payload = client.data.user as JWTPayload;
            const player = this.getPlayerOrThrow(payload.openId);

            if (player.roomId === '') {
                return ResponeError(ErrorCode.房間不存在);
            }
            const room = this.getRoomOrThrow(player.roomId);

            return ResponeSuccess(room.快照同步());
        });
    }

    @SubscribeMessage(MessageID.BATTLE_COMMAND)
    async 客戶端指令(@MessageBody() data: any, @ConnectedSocket() client: Socket): Promise<HttpRespone> {
        return this.safeExecute(async () => {
            const payload = client.data.user as JWTPayload;
            const player = this.getPlayerOrThrow(payload.openId);

            if (player.roomId === '') {
                return ResponeError(ErrorCode.房間不存在);
            }
            const room = this.getRoomOrThrow(player.roomId);

            return ResponeSuccess(room.gameMain.客戶端指令(data, player.id));
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

    private async JoinRoom(roomId: string, player: GamePlayer): Promise<ErrorCode> {
        const room = this.getRoomOrThrow(roomId);
        await player.socket?.join(roomId);
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
            let pp = this.players.get(p.id);
            if (pp) pp.roomId = "";
        })

        this.roomMap.delete(param.roomId);
    }

    @OnEvent('game.tick')
    private BattleEvent(param: { roomId: string, data: FrameInput[] }) {
        this.server.to(param.roomId).emit(MessageID.TICK, param.data);
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