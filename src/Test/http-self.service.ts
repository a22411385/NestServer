import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class HttpSelfService {
    private readonly baseUrl: string;

    constructor(
        private readonly httpService: HttpService, // 用Nest提供的HttpService
    ) {
        // 假設自己是跑在 http://localhost:3000
        this.baseUrl = 'http://localhost:' + process.env.PORT;
    }

    async get<T>(url: string, headers?: Record<string, string>): Promise<T> {
        const response = await firstValueFrom(
            this.httpService.get<T>(this.baseUrl + url, { headers })
        );
        return response.data;
    }

    async post<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
        const response = await firstValueFrom(
            this.httpService.post<T>(this.baseUrl + url, data, { headers })
        );
        return response.data;
    }

    // 你也可以加 put/patch/delete 方法，看需要
}