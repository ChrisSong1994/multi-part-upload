/* eslint-disable @typescript-eslint/no-explicit-any */
import Axios, { CancelTokenSource } from "axios";
import SparkMD5 from "spark-md5";
import errorCapture from "./errorCapture";
import parallelToSerial from "./parallelToSerial";

export type BeforeUploadFileType = File | Blob | boolean | string;

export type UploadRequestHeader = Record<string, string>;

export interface IObj {
  [key: string]: any;
}

interface File extends Blob {
  mozSlice: (
    start?: number | undefined,
    end?: number | undefined,
    contentType?: string | undefined
  ) => Blob;
  webkitSlice: (
    start?: number | undefined,
    end?: number | undefined,
    contentType?: string | undefined
  ) => Blob;
  readonly lastModified: number;
  readonly name: string;
}

// eslint-disable-next-line no-var
declare var File: {
  prototype: File;
  new (fileBits: BlobPart[], fileName: string, options?: FilePropertyBag): File;
};

export interface RcFile extends File {
  uid: string;
}

export interface UploadProgressEvent extends ProgressEvent {
  percent: number | string;
}

export type FileType = Exclude<BeforeUploadFileType, File | boolean> | RcFile;

export type Chunk = {
  chunkBuffer: Blob;
  chunkStart: number;
  chunkEnd: number;
  chunkSize: number;
  chunkCount: number;
  chunkIndex: number;
  fileHash: string;
};
export interface UploadRequestOption<T = any> {
  action: string;
  chunkSize?: number | boolean; // 分片参数 不传默认不分片，传了将作为分片大小进行分片上传
  data?: IObj | ((file: any, chunk?: Chunk, pre?: any) => IObj);
  filename?: string;
  file: FileType;
  headers?: UploadRequestHeader;
  parallel?: number | boolean; // 并行上传 默认为false 串行执行，可传number 类型值为并行执行请求个数,限制最大并行6个请求
  withCredentials?: boolean;
  onError?: (event: Error | ProgressEvent, file: FileType) => void;
  onProgress?: (event: UploadProgressEvent, file: FileType) => void;
  onSuccess?: (body: T, file: FileType) => void;
}

const isType = (value: any) => Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
const isString = (value: any) => isType(value) === "string";
const isNumber = (value: any) => isType(value) === "number";
const isArray = (value: any) => Array.isArray(value);

// 使用Blob.slice方法来对文件进行分割。
// 同时该方法在不同的浏览器使用方式不同。
const blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;

const axiosCancelTokenMap: Map<string, CancelTokenSource> = new Map(); // uid:source

/**
 * 说明：对比于upload customRequest 的属性增加 chunkSize 分片大小，parallel并发请求数，删除method属性默认用axios.post方法进行上传
 * */
const multiPartUpload = async ({
  chunkSize = false,
  parallel = false,
  action,
  data,
  file,
  filename,
  headers,
  onError,
  onProgress,
  onSuccess,
  withCredentials,
}: UploadRequestOption): Promise<any> => {
  const axiosCancelSource = Axios.CancelToken.source();
  axiosCancelTokenMap.set((file as RcFile).uid, axiosCancelSource);
  // 切片上传
  if (chunkSize && isNumber(chunkSize) && Number(chunkSize) > 0) {
    // 读取file构建切片
    const [error, result] = await errorCapture(readFile(file, Number(chunkSize)));
    if (error) return onError && onError(error, file);
    const { hash, fileSize, chunkBufferArray } = result;
    // 并行执行
    if (parallel && isNumber(parallel) && Number(parallel) > 0) {
      const axiosPromiseArray = [];
      const chunksLoadedArray = new Array(chunkBufferArray.length).fill(0);
      for (let index = 0; index < chunkBufferArray.length; index++) {
        const formData = new FormData();

        if (typeof data === "function") {
          // 非分片上传默认data参数是file对象
          const currentData = data(file, {
            chunkBuffer: chunkBufferArray[index].buffer,
            chunkStart: chunkBufferArray[index].start,
            chunkEnd: chunkBufferArray[index].end,
            chunkSize: chunkBufferArray[index].size,
            chunkCount: chunkBufferArray.length,
            chunkIndex: index,
            fileHash: hash,
          });

          Object.keys(currentData).forEach((key) => {
            formData.append(key, currentData[key]);
          });
        } else if (typeof data === "object") {
          Object.keys(data).forEach((key) => {
            formData.append(key, data[key]);
          });
        }

        formData.append(
          filename as string,
          new Blob([chunkBufferArray[index].buffer], {
            type: "application/octet-stream",
          })
        );

        axiosPromiseArray.push(() =>
          Axios.post(action, formData, {
            cancelToken: axiosCancelSource.token,
            withCredentials,
            headers,
            onUploadProgress: ({ loaded, ...resetprops }) => {
              chunksLoadedArray[index] = loaded;
              const currentLoaded = chunksLoadedArray.reduce((acu, cur) => acu + cur, 0);

              // 统计总上传量
              onProgress &&
                onProgress(
                  {
                    percent: Math.round((currentLoaded / fileSize) * 100).toFixed(2),
                    total: fileSize,
                    loaded: currentLoaded,
                    chunkIndex: index,
                    ...resetprops,
                  },
                  file
                );
            },
          })
        );
      }
      //上传
      parallelToSerial(axiosPromiseArray, Number(parallel > 6 ? 6 : parallel))
        .then((res: any) => {
          onSuccess && onSuccess(res.data, file);
          return res;
        })
        .catch((err: any) => {
          onError && onError(err, file);
        });
    } else {
      // 串行执行
      chunkBufferArray
        .reduce((acu: Promise<any>, curBuffer: any, index: number) => {
          return acu.then((res: any) => {
            const formData = new FormData();

            if (typeof data === "function") {
              // 非分片上传默认data参数是file对象
              const currentData = data(
                file,
                {
                  chunkBuffer: curBuffer.buffer,
                  chunkStart: curBuffer.start,
                  chunkEnd: curBuffer.end,
                  chunkSize: curBuffer.size,
                  chunkCount: chunkBufferArray.length,
                  chunkIndex: index,
                  fileHash: hash,
                },
                res
              );

              Object.keys(currentData).forEach((key) => {
                formData.append(key, currentData[key]);
              });
            } else if (typeof data === "object") {
              Object.keys(data).forEach((key) => {
                formData.append(key, data[key]);
              });
            }

            formData.append(
              filename as string,
              new Blob([curBuffer.buffer], {
                type: "application/octet-stream",
              })
            );

            return Axios.post(action, formData, {
              cancelToken: axiosCancelSource.token,
              withCredentials,
              headers,
              onUploadProgress: ({ loaded, ...resetprops }) => {
                const currentLoaded = chunkBufferArray[index].start + loaded;
                // 统计总上传量
                onProgress &&
                  onProgress(
                    {
                      percent: Math.round((currentLoaded / fileSize) * 100).toFixed(2),
                      total: fileSize,
                      loaded: currentLoaded,
                      chunkIndex: index,
                      ...resetprops,
                    },
                    file
                  );
              },
            });
          });
        }, Promise.resolve(null))
        .then((res: any) => {
          onSuccess && onSuccess(res.data, file);
          return res;
        })
        .catch((err: any) => {
          onError && onError(err, file);
        });
    }
  } else {
    // 构建formData
    const formData = new FormData();

    if (typeof data === "function") {
      const currentData = data(file); // 非分片上传默认data参数是file对象
      Object.keys(currentData).forEach((key) => {
        formData.append(key, currentData[key]);
      });
    } else if (typeof data === "object") {
      Object.keys(data).forEach((key) => {
        formData.append(key, data[key]);
      });
    }
    formData.append(filename as string, file);

    // 正常上传
    Axios.post(action, formData, {
      cancelToken: axiosCancelSource.token,
      withCredentials,
      headers,
      onUploadProgress: ({ total, loaded, ...resetprops }) => {
        onProgress &&
          onProgress(
            {
              percent: Math.round((loaded / total) * 100).toFixed(2),
              total: total,
              loaded: loaded,
              ...resetprops,
            },
            file
          );
      },
    })
      .then(({ data: res }) => {
        onSuccess && onSuccess(res, file);
      })
      .catch((err) => {
        onError && onError(err, file);
      });
  }
  // 返回一个取消axios 的函数
  return (cancelId: string | string[] | undefined) => {
    if (cancelId === undefined) {
      // 删除所有上传请求
      for (const [key, value] of axiosCancelTokenMap) {
        value.cancel();
        axiosCancelTokenMap.delete(key);
      }
    } else if (isString(cancelId) && typeof cancelId === "string") {
      if (axiosCancelTokenMap.get(cancelId)) {
        (axiosCancelTokenMap.get(cancelId) as CancelTokenSource).cancel();
        axiosCancelTokenMap.delete(cancelId);
      }
    } else if (isArray(cancelId)) {
      for (const uid of cancelId) {
        if (axiosCancelTokenMap.get(uid)) {
          (axiosCancelTokenMap.get(uid) as CancelTokenSource).cancel();
          axiosCancelTokenMap.delete(uid);
        }
      }
    }
  };
};

// 读取文件判断分片
const readFile = (file: FileType, chunkSize: number): Promise<any> => {
  return new Promise((resolve, reject) => {
    const fileSize = (file as File).size;
    const chunkCount = Math.ceil(fileSize / chunkSize);
    let currentChunk = 0;
    const chunkBufferArray: {
      buffer: Blob;
      size: number;
      start: number;
      end: number;
    }[] = [];
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();

    function loadNext() {
      const start = currentChunk * chunkSize;
      const end = start + chunkSize >= fileSize ? fileSize : start + chunkSize;
      const buffer = blobSlice.call(file, start, end);
      fileReader.readAsArrayBuffer(buffer);
      chunkBufferArray.push({ buffer, start, end, size: end - start });
    }

    fileReader.onload = (e) => {
      spark.append((e.target as FileReader).result as ArrayBuffer);

      currentChunk += 1;
      if (currentChunk < chunkCount) {
        loadNext();
      } else {
        const result = spark.end();
        // 如果单纯的使用result 作为hash值的时候, 如果文件内容相同，而名称不同的时候
        // 想保留两个文件无法保留。所以把文件名称加上。
        const sparkMd5 = new SparkMD5();
        sparkMd5.append(result);
        sparkMd5.append((file as File).name);
        const hexHash = sparkMd5.end();
        resolve({
          fileSize,
          hash: hexHash,
          chunkBufferArray: chunkBufferArray,
        });
      }
    };
    fileReader.onerror = () => {
      reject(new Error("文件读取失败！"));
    };
    loadNext();
  });
};

export default multiPartUpload;
