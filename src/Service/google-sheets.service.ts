// google-sheets.service.ts
import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import path from 'path';

export interface TableMappingEntry<T> {
    tableName: string;
    classType: new () => T; // Constructor Type
}

const SHEETS_ID = "1YwsRUfno9-Y7pEYvzV24G1EPSvcvCicvJ9yN3t58Reo";


@Injectable()
export class GoogleSheetsService {
    private sheets;
    private cache = new Map<string, any[]>();
    private mappings: TableMappingEntry<any>[] = [];
    constructor() {

        const keyFilePath = process.env.GOOGLE_KEY_PATH;
        if (!keyFilePath) {
            throw new Error('Google API key path is not defined in environment variables');
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: path.resolve(keyFilePath), // 使用 path.resolve 來獲取絕對路徑
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        })
        this.sheets = google.sheets({ version: 'v4', auth });

    }

    //初始化所有資料
    async InitData(mappings: TableMappingEntry<any>[]) {
        this.mappings = mappings;
        console.log("==== 載入職業資料 ====")
        //let profession = await this.getSheetData<Unit>('Profession');
        for (const entry of this.mappings) {
            const data = await this.fetchTableData(entry.tableName, entry.classType);
            this.cache.set(entry.tableName, data);
        }

    }
    /**
   * 從 Google Sheets 抓取資料並轉成實例
   */
    private async fetchTableData<T extends object>(tableName: string, classType: new () => T): Promise<T[]> {
        const res = await this.sheets.spreadsheets.values.get({
            spreadsheetId: SHEETS_ID,
            range: tableName, // 只要表單名稱就好
        });

        const rows = res.data.values;
        if (!rows || rows.length < 2) return [];

        const headers = rows[0];
        const dataRows = rows.slice(1);

        const parsed = dataRows.map(row => {
            const instance = new classType();
            headers.forEach((header: string, idx: number) => {
                const value = row[idx];
                if (value !== undefined) {
                    // 如果目標物件上有這個欄位，就設定
                    if (header in instance) {
                        if (!isNaN(Number(value)) && value !== '') {
                            (instance as any)[header] = Number(value);
                        } else {
                            (instance as any)[header] = value;
                        }
                    }
                }
            });
            return instance;
        });

        return parsed;
    }

    /**
  * 取得表單資料
  */
    async getSheetData<T>(tableName: string): Promise<T[]> {

        let c = this.cache.get(tableName);
        if (c != undefined) {
            return c;
        }

        // 萬一沒快取，也能動態補撈
        const mapping = this.mappings.find(m => m.tableName === tableName);
        if (!mapping) {
            throw new Error(`No mapping found for table: ${tableName}`);
        }

        const data = await this.fetchTableData(mapping.tableName, mapping.classType);
        this.cache.set(tableName, data);
        return data;
    }


    /**
     * 清除快取（可指定單個或全部）
     */
    clearCache(tableName?: string) {
        if (tableName) {
            this.cache.delete(tableName);
        } else {
            this.cache.clear();
        }
    }
}