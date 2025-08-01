import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ColyseusService } from '../Service/colyseus.service';
import { IsPublic } from '../main';

export interface CreateRoomDto {
    roomName: string;
    maxPlayers: number;
    isPrivate?: boolean;
    hostId: string;
    hostName: string;
    hostCharacterId: number;
}

export interface JoinRoomDto {
    roomId: string;
    playerName: string;
    characterId: number;
}

@Controller('game')
export class GameController {
    constructor(private readonly colyseusService: ColyseusService) { }

    // 獲取房間列表
    @Get('rooms')
    async getRoomList() {
        try {
            const rooms = await this.colyseusService.getAllRooms();
            return {
                success: true,
                data: {
                    total: rooms.length,
                    rooms: rooms.map((room: any) => ({
                        roomId: room.roomId,
                        roomName: room.metadata?.roomName || 'Unknown Room',
                        hostName: room.metadata?.hostName || 'Unknown Host',
                        currentPlayers: room.clients,
                        maxPlayers: room.maxClients,
                        isStarted: room.metadata?.isStarted || false,
                        isPrivate: room.metadata?.isPrivate || false,
                    }))
                }
            };
        } catch (error) {
            throw new HttpException(
                'Failed to get room list',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // 獲取特定房間資訊
    @Get('rooms/:roomId')
    async getRoomInfo(@Param('roomId') roomId: string) {
        try {
            const room = await this.colyseusService.getRoomById(roomId);
            if (!room) {
                throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                data: {
                    roomId: room.roomId,
                    roomName: room.metadata?.roomName || 'Unknown Room',
                    hostName: room.metadata?.hostName || 'Unknown Host',
                    currentPlayers: room.clients,
                    maxPlayers: room.maxClients,
                    isStarted: room.metadata?.isStarted || false,
                    isPrivate: room.metadata?.isPrivate || false,
                }
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'Failed to get room info',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // 創建房間（預留座位）
    @Post('rooms/create')
    async createRoom(@Body() createRoomDto: CreateRoomDto) {
        try {
            const reservation = await this.colyseusService.createRoom('game_room', {
                roomName: createRoomDto.roomName,
                maxPlayers: createRoomDto.maxPlayers,
                hostId: createRoomDto.hostId,
                hostName: createRoomDto.hostName,
                hostCharacterId: createRoomDto.hostCharacterId,
                isPrivate: createRoomDto.isPrivate || false,
            });

            return {
                success: true,
                data: {
                    roomId: reservation.room.roomId,
                    sessionId: reservation.sessionId,
                    roomName: createRoomDto.roomName,
                    message: 'Room created successfully'
                }
            };
        } catch (error) {
            console.error('Create room error:', error);
            throw new HttpException(
                'Failed to create room',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // 加入房間（預留座位）
    @Post('rooms/:roomId/join')
    async joinRoom(@Param('roomId') roomId: string, @Body() joinRoomDto: JoinRoomDto) {
        try {
            const reservation = await this.colyseusService.joinRoom(roomId, {
                playerName: joinRoomDto.playerName,
                characterId: joinRoomDto.characterId,
            });

            return {
                success: true,
                data: {
                    roomId: reservation.room.roomId,
                    sessionId: reservation.sessionId,
                    message: 'Joined room successfully'
                }
            };
        } catch (error) {
            console.error('Join room error:', error);
            if (error.message && error.message.includes('not found')) {
                throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
            }
            if (error.message && error.message.includes('full')) {
                throw new HttpException('Room is full', HttpStatus.CONFLICT);
            }
            throw new HttpException(
                'Failed to join room',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // 快速加入可用房間
    @Post('rooms/quick-join')
    async quickJoin(@Body() joinRoomDto: Omit<JoinRoomDto, 'roomId'>) {
        try {
            const reservation = await this.colyseusService.joinOrCreateRoom('game_room', {
                playerName: joinRoomDto.playerName,
                characterId: joinRoomDto.characterId,
            });

            return {
                success: true,
                data: {
                    roomId: reservation.room.roomId,
                    sessionId: reservation.sessionId,
                    message: 'Quick join successful'
                }
            };
        } catch (error) {
            console.error('Quick join error:', error);
            throw new HttpException(
                'No available rooms for quick join',
                HttpStatus.NOT_FOUND
            );
        }
    }

    // 獲取大廳連接資訊
    @Post('lobby/join')
    async joinLobby(@Body() body: { playerName: string; characterId: number }) {
        try {
            const reservation = await this.colyseusService.joinOrCreateRoom('lobby', {
                playerName: body.playerName,
                characterId: body.characterId,
            });

            return {
                success: true,
                data: {
                    roomId: reservation.room.roomId,
                    sessionId: reservation.sessionId,
                    message: 'Joined lobby successfully'
                }
            };
        } catch (error) {
            console.error('Join lobby error:', error);
            throw new HttpException(
                'Failed to join lobby',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // 伺服器狀態
    @Get('status')
    async getServerStatus() {
        try {
            const rooms = await this.colyseusService.getAllRooms();
            const totalPlayers = rooms.reduce((sum: number, room: any) => sum + room.clients, 0);

            return {
                success: true,
                data: {
                    status: 'online',
                    timestamp: new Date().toISOString(),
                    rooms: {
                        total: rooms.length,
                        playing: rooms.filter((r: any) => r.metadata?.isStarted).length,
                        waiting: rooms.filter((r: any) => !r.metadata?.isStarted).length,
                    },
                    players: {
                        total: totalPlayers,
                        inGame: rooms.filter((r: any) => r.metadata?.isStarted).reduce((sum: number, room: any) => sum + room.clients, 0),
                        inLobby: rooms.filter((r: any) => !r.metadata?.isStarted).reduce((sum: number, room: any) => sum + room.clients, 0),
                    }
                }
            };
        } catch (error) {
            throw new HttpException(
                'Failed to get server status',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
