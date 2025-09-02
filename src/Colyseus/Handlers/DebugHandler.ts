import { Client } from "colyseus";
import { BaseMessageHandler } from "./Base/BaseMessageHandler";
import { PermissionLevel } from "@/Types";

/**
 * 調試消息處理器
 * 處理調試相關的命令和信息輸出
 */
export class DebugHandler extends BaseMessageHandler {
    private supportedTypes = [
        "debugInfo",
        "debugToggleLog",
        "debugGetState",
        "debugPrintPlayers",
        "debugPrintEnemies",
        "debugMemoryUsage",
        "debugPerformance"
    ];

    getPermissionLevel(): PermissionLevel {
        return PermissionLevel.ADMIN;
    }

    canHandle(type: string): boolean {
        return this.supportedTypes.includes(type);
    }

    getSupportedTypes(): string[] {
        return [...this.supportedTypes];
    }

    async handle(client: Client, message: any): Promise<void> {
        const { type, data } = message;

        // 檢查權限
        if (!this.checkPermissions(client)) {
            this.sendError(client, "權限不足，只有管理員可以使用調試功能");
            return;
        }

        try {
            switch (type) {
                case "debugInfo":
                    this.handleDebugInfo(client, data);
                    break;
                case "debugToggleLog":
                    this.handleDebugToggleLog(client, data);
                    break;
                case "debugGetState":
                    this.handleDebugGetState(client, data);
                    break;
                case "debugPrintPlayers":
                    this.handleDebugPrintPlayers(client, data);
                    break;
                case "debugPrintEnemies":
                    this.handleDebugPrintEnemies(client, data);
                    break;
                case "debugMemoryUsage":
                    this.handleDebugMemoryUsage(client, data);
                    break;
                case "debugPerformance":
                    this.handleDebugPerformance(client, data);
                    break;
                default:
                    throw new Error(`Unsupported debug type: ${type}`);
            }

            this.logHandle(type, client.id, true);
        } catch (error) {
            this.logHandle(type, client.id, false, error.message);
            this.sendError(client, error.message);
        }
    }

    private handleDebugInfo(client: Client, data: any): void {
        // 計算敵人數量
        let enemiesCount = 0;
        for (const [id, unit] of this.state.gameCore.allUnits) {
            if (unit.type === 0) { // UnitType.enemy = 0
                enemiesCount++;
            }
        }

        const debugInfo = {
            roomId: this.room.roomId,
            playersCount: this.state.players.size,
            enemiesCount: enemiesCount,
            gameState: {
                isPlaying: this.room.gameManager.isPlaying,
                isPaused: false, // 暫停功能尚未實作
                currentWave: this.room.enemySystem.getWaveManager()?.getCurrentWaveNumber() || 0,
                gameTime: "未實作" // gameStartTime 尚未實作
            },
            serverInfo: {
                nodeVersion: process.version,
                uptime: process.uptime(),
                pid: process.pid
            }
        };

        this.sendSuccess(client, debugInfo);
        console.log("🐛 調試信息:", JSON.stringify(debugInfo, null, 2));
    }

    private handleDebugToggleLog(client: Client, data: any): void {
        if (!this.validateMessage(data, ['logType'])) {
            throw new Error("無效的日誌類型");
        }

        const { logType, enabled } = data;

        // 這裡可以實作動態日誌開關
        console.log(`🐛 切換日誌類型 ${logType}: ${enabled ? '開啟' : '關閉'}`);

        this.sendSuccess(client, {
            message: `日誌類型 ${logType} 已${enabled ? '開啟' : '關閉'}`,
            logType,
            enabled
        });
    }

    private handleDebugGetState(client: Client, data: any): void {
        const { section } = data || {};

        let stateData: any;

        switch (section) {
            case "players":
                stateData = Array.from(this.state.players.values()).map(player => ({
                    id: player.id,
                    name: player.name,
                    isReady: player.isReady,
                    // 其他玩家屬性
                }));
                break;
            case "enemies":
                // 從allUnits中提取敵人信息
                const enemyData: any[] = [];
                for (const [id, unit] of this.state.gameCore.allUnits) {
                    if (unit.type === 0) { // UnitType.enemy = 0
                        enemyData.push({
                            id: unit.id,
                            type: 'enemy',
                            x: unit.position.x,
                            y: unit.position.y,
                            health: unit.hp
                        });
                    }
                }
                stateData = enemyData;
                break;
            case "game":
                stateData = {
                    isPlaying: this.room.gameManager.isPlaying,
                    gameTime: "未實作", // gameStartTime 尚未實作
                    // 其他遊戲狀態
                };
                break;
            default:
                // 計算敵人數量
                let enemyCount = 0;
                for (const [id, unit] of this.state.gameCore.allUnits) {
                    if (unit.type === 0) { // UnitType.enemy = 0
                        enemyCount++;
                    }
                }
                stateData = {
                    players: this.state.players.size,
                    enemies: enemyCount,
                    isPlaying: this.room.gameManager.isPlaying
                };
        }

        this.sendSuccess(client, { section, data: stateData });
        console.log(`🐛 獲取狀態 [${section || 'all'}]:`, stateData);
    }

    private handleDebugPrintPlayers(client: Client, data: any): void {
        const players = Array.from(this.state.players.values()).map(player => ({
            id: player.id,
            name: player.name,
            isReady: player.isReady,
            isHost: this.room.playerManager.isPlayerHost({ id: player.id } as Client)
        }));

        console.log("🐛 當前玩家列表:");
        console.table(players);

        this.sendSuccess(client, {
            message: "玩家信息已輸出到控制台",
            players
        });
    }

    private handleDebugPrintEnemies(client: Client, data: any): void {
        // 從allUnits中提取敵人信息
        const enemyList: any[] = [];
        for (const [id, unit] of this.state.gameCore.allUnits) {
            if (unit.type === 0) { // UnitType.enemy = 0
                enemyList.push({
                    id: unit.id,
                    type: 'enemy',
                    x: unit.position.x,
                    y: unit.position.y,
                    health: unit.hp
                });
            }
        }

        console.log("🐛 當前敵人列表:");
        console.table(enemyList);

        this.sendSuccess(client, {
            message: "敵人信息已輸出到控制台",
            enemies: enemyList
        });
    } private handleDebugMemoryUsage(client: Client, data: any): void {
        const memUsage = process.memoryUsage();
        const formatBytes = (bytes: number) => {
            return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
        };

        const memoryInfo = {
            rss: formatBytes(memUsage.rss),
            heapTotal: formatBytes(memUsage.heapTotal),
            heapUsed: formatBytes(memUsage.heapUsed),
            external: formatBytes(memUsage.external),
            arrayBuffers: formatBytes(memUsage.arrayBuffers)
        };

        console.log("🐛 記憶體使用量:");
        console.table(memoryInfo);

        this.sendSuccess(client, {
            message: "記憶體使用量已輸出到控制台",
            memory: memoryInfo
        });
    }

    private handleDebugPerformance(client: Client, data: any): void {
        const performanceInfo = {
            uptime: `${Math.floor(process.uptime())} 秒`,
            cpuUsage: process.cpuUsage(),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        };

        console.log("🐛 性能信息:");
        console.table(performanceInfo);

        this.sendSuccess(client, {
            message: "性能信息已輸出到控制台",
            performance: performanceInfo
        });
    }
}
