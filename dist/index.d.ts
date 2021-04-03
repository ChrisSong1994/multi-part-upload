declare type BeforeUploadFileType = File | Blob | boolean | string;
declare type UploadRequestHeader = Record<string, string>;
interface IObj {
    [key: string]: any;
}
interface File extends Blob {
    mozSlice: (start?: number | undefined, end?: number | undefined, contentType?: string | undefined) => Blob;
    webkitSlice: (start?: number | undefined, end?: number | undefined, contentType?: string | undefined) => Blob;
    readonly lastModified: number;
    readonly name: string;
}
declare var File: {
    prototype: File;
    new (fileBits: BlobPart[], fileName: string, options?: FilePropertyBag): File;
};
interface RcFile extends File {
    uid: string;
}
interface UploadProgressEvent extends ProgressEvent {
    percent: number | string;
}
declare type FileType = Exclude<BeforeUploadFileType, File | boolean> | RcFile;
declare type Chunk = {
    chunkBuffer: Blob;
    chunkStart: number;
    chunkEnd: number;
    chunkSize: number;
    chunkCount: number;
    chunkIndex: number;
    fileHash: string;
};
interface UploadRequestOption<T = any> {
    action: string;
    chunkSize?: number | boolean;
    data?: IObj | ((file: any, chunk?: Chunk, pre?: any) => IObj);
    filename?: string;
    file: FileType;
    headers?: UploadRequestHeader;
    parallel?: number | boolean;
    withCredentials?: boolean;
    onError?: (event: Error | ProgressEvent, file: FileType) => void;
    onProgress?: (event: UploadProgressEvent, file: FileType) => void;
    onSuccess?: (body: T, file: FileType) => void;
}
/**
 * 说明：对比于upload customRequest 的属性增加 chunkSize 分片大小，parallel并发请求数，删除method属性默认用axios.post方法进行上传
 * */
declare const multiPartUpload: ({ chunkSize, parallel, action, data, file, filename, headers, onError, onProgress, onSuccess, withCredentials, }: UploadRequestOption) => Promise<any>;

export default multiPartUpload;
export { BeforeUploadFileType, Chunk, FileType, IObj, RcFile, UploadProgressEvent, UploadRequestHeader, UploadRequestOption };
