import { defineConfig } from 'umi';

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  routes: [{ path: '/', component: '@/pages/index' }],
  fastRefresh: {},
  alias: {
    ROOT: './src',
  },
  devServer: {
    host: 'admin1.cpgxpt.zhengqiyezhi666.com',
    port: 9000,
  },
  proxy: {
    '/upload': {
      target: 'http://localhost:3100/',
      changeOrigin: true,
    },
    '/edge': {
      target: 'https://cpgxpt.zhengqiyezhi666.com:13001/',
      changeOrigin: true,
    },
  },
});
