import ShareMultiPartUpload from './shareMultiPartUpload';
import ParallelMultiPartUpload from './parallelMultiPartUpload';

export default function IndexPage() {
  return (
    <div style={{
      width:800,
      margin:'20px auto'
    }}>
      <h1>文件分片上传</h1>
      <ShareMultiPartUpload />
      &nbsp;
      <ParallelMultiPartUpload />
    </div>
  );
}
