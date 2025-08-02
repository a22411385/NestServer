import { Schema, type, MapSchema } from "@colyseus/schema";

export interface RoomInfo {
    roomId: string;
    roomName: string;
    hostName: string;
    currentPlayers: number;
    maxPlayers: number;
    isStarted: boolean;
    isPrivate: boolean;
}

export class LobbyRoomInfo extends Schema {
    @type("string") roomId: string;
    @type("string") roomName: string;
    @type("string") hostName: string;
    @type("number") currentPlayers: number = 0;
    @type("number") maxPlayers: number = 6;
    @type("boolean") isStarted: boolean = false;
    @type("boolean") isPrivate: boolean = false;

    constructor(roomInfo: RoomInfo) {
        super();
        this.roomId = roomInfo.roomId;
        this.roomName = roomInfo.roomName;
        this.hostName = roomInfo.hostName;
        this.currentPlayers = roomInfo.currentPlayers;
        this.maxPlayers = roomInfo.maxPlayers;
        this.isStarted = roomInfo.isStarted;
        this.isPrivate = roomInfo.isPrivate;
    }
}

export class LobbyPlayer extends Schema {
    @type("string") id: string;
    @type("string") name: string;
    @type("number") characterId: number;
    @type("number") level: number = 1;
    @type("string") status: string = "idle";

    constructor(id: string, name: string, characterId: number) {
        super();
        this.id = id;
        this.name = name;
        this.characterId = characterId;
        this.level = 1;
        this.status = "idle";

        console.log(`LobbyPlayer created: ${id}, ${name}, ${characterId}`);
    }
}

export class LobbyState extends Schema {
    @type({ map: LobbyRoomInfo }) rooms = new MapSchema<LobbyRoomInfo>();
    @type({ map: LobbyPlayer }) players = new MapSchema<LobbyPlayer>();
    @type("number") totalRooms: number = 0;
    @type("number") totalPlayers: number = 0;

    constructor() {
        super();
    }

    addRoom(roomInfo: RoomInfo): LobbyRoomInfo {
        const room = new LobbyRoomInfo(roomInfo);
        this.rooms.set(roomInfo.roomId, room);
        this.totalRooms++;
        return room;
    }

    removeRoom(roomId: string): void {
        this.rooms.delete(roomId);
        this.totalRooms = Math.max(0, this.totalRooms - 1);
    }

    addPlayer(id: string, name: string, characterId: number): LobbyPlayer {
        try {
            console.log(`LobbyState: Creating player with id=${id}, name=${name}, characterId=${characterId}`);

            // 確保參數有效
            if (!id || !name || typeof characterId !== 'number') {
                throw new Error(`Invalid player parameters: id=${id}, name=${name}, characterId=${characterId}`);
            }

            const player = new LobbyPlayer(id, name, characterId);
            this.players.set(id, player);
            this.totalPlayers++;

            console.log(`LobbyState: Player ${id} added successfully. Total players: ${this.totalPlayers}`);
            return player;
        } catch (error) {
            console.error('LobbyState: Error creating player:', error);
            throw error;
        }
    }

    removePlayer(playerId: string): void {
        this.players.delete(playerId);
        this.totalPlayers = Math.max(0, this.totalPlayers - 1);
    }

    updateRoomPlayerCount(roomId: string, playerCount: number): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.currentPlayers = playerCount;
        }
    }

    setRoomStarted(roomId: string, started: boolean): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.isStarted = started;
        }
    }

    getAvailableRooms(): LobbyRoomInfo[] {
        return Array.from(this.rooms.values()).filter(room =>
            !room.isStarted &&
            !room.isPrivate &&
            room.currentPlayers < room.maxPlayers
        );
    }
}
