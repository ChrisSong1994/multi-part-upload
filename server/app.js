const Koa = require("koa");
const multer = require("koa-multer");
const path = require("path");
const fs = require("fs-extra");
const KoaStatic = require("koa-static");
const KoaBody = require("koa-body");
const KoaLogger = require("koa-logger");
const KoaRouter = require("koa-router");

const mkdirsSync = require("./utils/mkdir");
const uploadPath = path.join(__dirname, "uploads");
const uploadTempPath = path.join(uploadPath, "temp");
const upload = multer({ dest: uploadTempPath });

const app = new Koa();
const router = new KoaRouter();

app.use(KoaLogger());
app.use(KoaBody());

router.post("/upload/file-upload", upload.single("file"), (ctx, next) => {
  const { name, total, index, hash } = ctx.req.body;

  const chunksPath = path.join(uploadPath, hash, "/");
  if (!fs.existsSync(chunksPath)) mkdirsSync(chunksPath);
  fs.renameSync(ctx.req.file.path, chunksPath + hash + "-" + index);

  // 判断是否传输完毕
  if (total - 1 > index) {
    ctx.status = 200;
    ctx.res.end("Upload Success");
  } else {
    try {
      //   合并分片文件
      const filePath = path.join(uploadPath, name);
      const chunks = fs.readdirSync(chunksPath);
      fs.writeFileSync(filePath, "");
      for (let i = 0; i < total; i++) {
        // 追加写入到文件中
        fs.appendFileSync(filePath, fs.readFileSync(chunksPath + hash + "-" + i));
        // 删除本次使用的chunk
        fs.unlinkSync(chunksPath + hash + "-" + i);
      }
      fs.rmdirSync(chunksPath);
      ctx.status = 200;
      ctx.res.end("Upload Success");
    } catch (err) {
      ctx.status = 200;
      ctx.res.end("合并文件失败");
    }
  }
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(3100, (err) => {
  console.log("upload server is listen in 3100!");
});
