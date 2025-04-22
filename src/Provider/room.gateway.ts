// game.gateway.ts
import {
    WebSocketGateway,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from '../Service/room.service';

import { OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {

    @WebSocketServer()
    server: Server;

    socketRoomMap = new Map<string, string>();
    onModuleInit() {
        console.log('✅ GameGateway 已啟動');
    }
    constructor(
        private readonly roomService: RoomService,
        private readonly jwtService: JwtService
        //  private readonly gameService: GameService,
    ) { }

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
        //開始驗證
        try {
            const rawToken =
                client.handshake.query.token as string;
            //    client.handshake.headers?.authorization?.replace('Bearer ', '') as string;
            if (!rawToken) {
                throw new Error('No token found');
            }
            const payload = this.jwtService.verify(rawToken, { secret: process.env.JWT_KEY });
            client.data.user = payload;
        } catch (err) {
            console.warn('❌ Token 驗證失敗:', err.message);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
        this.roomService.removePlayerFromRoom(client);
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(
        @MessageBody() data: { roomId: string; playerId: number },
        @ConnectedSocket() client: Socket,
    ) {

        this.roomService.addPlayerToRoom(data.roomId, data.playerId, client);
        client.join(data.roomId);
        this.socketRoomMap.set(client.id, data.roomId);
        client.to(data.roomId).emit('playerJoined', { playerId: data.playerId });
    }

    //玩家離開
    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(
        @MessageBody() data: { roomId: string; playerId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.leave(data.roomId);
        this.roomService.removePlayerFromRoom(client);
        client.to(data.roomId).emit('playerLeft', { playerId: data.playerId });
    }
}