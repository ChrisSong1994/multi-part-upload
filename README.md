# multi-part-upload

基于 axios 的自定义的分片上传模块，支持切片大小设置和并行上传

#### 安装

```sh
yarn add @chrissong/multi-part-upload
或者
npm install  @chrissong/multi-part-upload --save
```

#### 基本用法

下面以在 React 项目中结合 `antd`的 `Upload` 组件实现分片上传,`Upload` 上的 action、data、headers、withCredentials、onError、onProgress、onSuccess 等属性将作为

```tsx
import multiPartUpload from "@chrissong/multi-part-upload";

const ShareMultiPartUpload = () => {
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
              url: _.get(res, 'data.url', ''),
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
      <Upload
        action={action}
        accept="image/*,video/*"
        showUploadList={false}
        beforeUpload={checkUpload}
        {...uploadOnChangeParams}
        customRequest={(pramas) =>
          multiPartUpload({
            ...pramas,
            chunkSize: 10 * 1024 * 1024,
            parallel:false,
            data: (file: any, chunk: any, pre: any) => {
              const { size, name } = file;
              const { chunkCount, chunkIndex, chunkStart, chunkSize,fileHash } = chunk;

              return{
                 name: name,
                 hash: fileHash,
                 total: chunkCount,
                 index: chunkIndex,
                 key:pre.data.key || null  // 从上一次返回对象里面取到key 值
              }
            },
          })
        }
      >
        <Button type="primary"> 共享平台项目分片上传</Button>
      </Upload>
  );
};

```

这里特别说明`chunkSize` 表示切片的大小，将在上传的时候自动分成每片 `chunkSize` 大小单位是 b。当`parallel`值为 false 的时候表示分片串行执行,`data`属性作为函数执行时第二个参数`chunk`表示当前分片信息，第三个参数`pre`表示上一次请求的返回值;该示例是`multiPartUpload`在大文件分片上传时，受制于后端接口逻辑，使用的较慢的串行分片上传执行；

`multiPartUpload`也支持并行分片上传，如下

```tsx
let cancelFun = null;

<Upload
  action={action}
  accept="image/*,video/*"
  showUploadList={false}
  beforeUpload={checkUpload}
  {...uploadOnChangeParams}
  customRequest={async (pramas) => {
    cancelFun = await multiPartUpload({
      ...pramas,
      chunkSize: 5 * 1024 * 1024,
      parallel: 3,
      data: (file, chunk) => {
        const { size, name, uid } = file;
        const { chunkCount, chunkIndex, chunkStart, chunkSize } = chunk;
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
  <Button type="primary" onClick={cancelFun}>
    取消上传
  </Button>
</Upload>;
```

设置`parallel`值为一个数字类型将代表可一次并行发请求数(最大为 6),并行分片上传`data`作为函数执行的第三个参数将为 undefined;
调用`multiPartUpload`函数将异步返回一个回调函数`callback`,这个`callback`接受一个(组)`id`,执行将会取消正在执行的上传的请求，不传参数将会取消全部正在上传的请求。(`id` 默认为 `file` 对象的 `uid` 值)

#### API

| 参数            | 说明                                     | 类型                                                    | 默认值   |
| --------------- | ---------------------------------------- | ------------------------------------------------------- | -------- |
| action          | 上传的地址                               | string                                                  | 无       |
| chunkSize       | 分片参数                                 | number \| boolean                                       | false    |
| data            | 上传所需额外参数或返回上传额外参数的方法 | object\|(file,chunk?,pre?) => object                    | 无       |
| headers         | 设置上传的请求头部，IE10 以上有效        | object                                                  | 无       |
| parallel        | 并行上传请求数                           | number \| boolean                                       | false    |
| withCredentials | 上传请求时是否携带 cookie                | boolean                                                 | false    |
| onError         | 上传失败回调                             | (event: Error \| ProgressEvent, file: FileType) => void | undefine |
| onProgress      | 上传进度回调                             | (event: UploadProgressEvent, file: FileType)            | undefine |
| onSuccess       | 上传成功回调                             | (body: any, file: FileType) => void;                    | undefine |

#### RETURN

| 参数           | 说明                                                | 类型                                                | 默认值 |
| -------------- | --------------------------------------------------- | --------------------------------------------------- | ------ |
| cancelCallback | 返回的一个回调函数，可取消所有正在进行的 axios 请求 | (cancelId: string \| string[] \| undefined) => void | 无     |
