import { ErrorCode } from '@/Controller/ErrorCode';
// 🆕 使用統一類型定義
import { HttpResponse } from '@/Types';

export function ResponeSuccess(content: any = null): HttpResponse {
    return { errorCode: ErrorCode.SUCCESS, content };
}

export function ResponeError(errorCode: ErrorCode): HttpResponse {
    return { errorCode, content: null };
}
