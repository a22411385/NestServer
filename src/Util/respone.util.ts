import { ErrorCode } from 'src/Shared/ErrorCode';
import { HttpRespone } from 'src/Shared/struct';

export function ResponeSuccess(content: any = null): HttpRespone {
    return { errorCode: ErrorCode.SUCCESS, content };
}

export function ResponeError(errorCode: ErrorCode): HttpRespone {
    return { errorCode, content: null };
}