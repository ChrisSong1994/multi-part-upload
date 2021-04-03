import { useRef, useState } from 'react';
import { Upload, Button, message } from 'antd';
import _ from 'lodash';
// @ts-ignore
import multiPartUpload from '../../../../dist/index.esm';

import MediaItem from './mediaItem';

const action = '/upload/file-upload';

const ParallelMultiPartUpload = () => {
  const cancelFunRef = useRef(() => {});
  const [dataList, setDataList] = useState([]);

  // 文件检查
  const checkUpload = (file: any) => {
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
          {...uploadOnChangeParams}
          customRequest={async (pramas) => {
            debugger;
            // @ts-ignore
            cancelFunRef.current = await multiPartUpload({
              ...pramas,
              chunkSize: 5 * 1024 * 1024,
              parallel: 3,
              data: (
                file: { size: any; name: any; uid: any },
                chunk: {
                  chunkCount: any;
                  chunkIndex: any;
                  chunkStart: any;
                  chunkSize: any;
                },
              ) => {
                const { size, name, uid } = file;
                const { chunkCount, chunkIndex, chunkStart, chunkSize } = chunk;
                debugger;
                return {
                  name: name,
                  hash: uid,
                  total: chunkCount,
                  index: chunkIndex,
                };
              },
            });
          }}
        >
          <Button type="primary"> 并行分片上传</Button>
        </Upload>
        <Button
          style={{ marginLeft: 20 }}
          onClick={() => cancelFunRef.current()}
        >
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
    </section>
  );
};

export default ParallelMultiPartUpload;
