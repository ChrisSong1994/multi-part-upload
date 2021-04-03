import { useState, useRef } from 'react';
import { Upload, Button, message } from 'antd';
import _ from 'lodash';
// @ts-ignore
import multiPartUpload from '../../../../dist/index.esm';

import MediaItem from './mediaItem';

const action = '/edge/documentation/documentation/upload';

const ShareMultiPartUpload = () => {
  const cancelFunRef = useRef(() => {});
  const [dataList, setDataList] = useState([]);

  // 检查文件
  const checkUpload = (file: any) => {
    // 插入文件
    setDataList([
      // @ts-ignore
      ...dataList,
      {
        id: file.uid,
        type: file.type.split('/')[0],
        url: null,
        progress: 0,
        selected: true,
        fileName: file.name,
      },
    ]);

    return true;
  };

  // 上传回调
  const uploadOnChangeParams = {
    // 上传完成
    onSuccess: (res: any, file: any) => {
      setDataList(
        // @ts-ignore
        dataList.map((item: any) => {
          if (file.uid === item.id) {
            return {
              ...item,
              progress: 100,
              url: _.get(res, 'data.objUrl', ''),
            };
          }
          return item;
        }),
      );
    },
    // 上传失败
    onError: (_err: any, file: any) => {
      const { type } = file;
      const mediaType =
        type === 'image' ? '图片' : type === 'video' ? '视频' : '文件';
      message.error(`${mediaType}上传失败！`);
    },
    // 上传进度
    onProgress: ({ percent }: any, file: any) => {
      setDataList(
        // @ts-ignore
        dataList.map((item: any) => {
          if (file.uid === item.id) {
            return {
              ...item,
              progress: Math.floor(percent),
            };
          }
          return item;
        }),
      );
    },
  };

  return (
    <section>
      <div>
        <Upload
          action={action}
          accept="image/*,video/*"
          showUploadList={false}
          beforeUpload={checkUpload}
          // @ts-ignore
          {...uploadOnChangeParams}
          customRequest={async (pramas) => {
            // @ts-ignore
            cancelFunRef.current = await multiPartUpload({
              ...pramas,
              chunkSize: 10 * 1024 * 1024,
              data: (file: any, chunk: any, pre: any) => {
                const { size, name } = file;
                const { chunkCount, chunkIndex, chunkStart, chunkSize } = chunk;
                const formaData = {
                  downloadFlag: 1,
                  publicFlag: true, // 话题回答和评论的上传都是公开的
                  appendFlag: chunkCount > 1,
                  position: chunkStart,
                  times: chunkCount >= chunkIndex + 1 ? chunkIndex + 1 : -1,
                  totalSize: size,
                  currentSize: chunkSize,
                  fileName: name,
                  uploadId: _.get(pre, 'data.data.uploadId') || null,
                  objectKey: _.get(pre, 'data.data.objectKey') || null,
                };
                //  这里需要判断是否是第一次是否是第一次上传
                return pre
                  ? formaData
                  : _.omit(formaData, ['uploadId', 'objectKey']);
              },
            });
          }}
        >
          <Button type="primary"> 共享平台项目分片上传</Button>
        </Upload>

        <Button
          style={{ marginLeft: 20 }}
          onClick={() => cancelFunRef.current()}
        >
          {' '}
          取消上传
        </Button>
      </div>

      <ul
        style={{
          display: 'block',
          listStyle: 'none',
        }}
      >
        {dataList.map((item: any) => (
          <MediaItem
            key={item.id}
            progress={item.progress}
            name={item.fileName}
          />
        ))}
      </ul>

      <div>
        {/* @ts-ignore */}
        {/* <input type="file" name="file" webkitdirectory /> */}
      </div>
    </section>
  );
};

export default ShareMultiPartUpload;
