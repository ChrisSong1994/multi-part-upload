/* eslint-disable no-undef */
import * as path from "path";
import { terser } from "rollup-plugin-terser";
import pluginTypescript from "@rollup/plugin-typescript";
import pluginCommonjs from "@rollup/plugin-commonjs";
import pluginNodeResolve from "@rollup/plugin-node-resolve";
import pluginDts from "rollup-plugin-dts";
import { babel } from "@rollup/plugin-babel";
import strip from "@rollup/plugin-strip";
import pkg from "./package.json";

const isDev = process.env.NODE_ENV === "development";
const moduleName = pkg.name.replace(/^@.*\//, "");
const inputFileName = "src/index.ts";
const author = pkg.author;
const banner = `
  /**
   * @license
   * author: ${author}
   * ${moduleName}.js v${pkg.version}
   * Released under the ${pkg.license} license.
   */
`;

const esm = [
  {
    input: inputFileName,
    output: [
      {
        file: pkg.module,
        format: "es",
        sourcemap: isDev ? true : "inline",
        banner,
        exports: "named",
      },
    ],
    external: [
      ...Object.keys(pkg.peerDependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ],
    plugins: [
      pluginTypescript(),
      pluginCommonjs({
        extensions: [".js", ".ts"],
      }),
      babel({
        babelHelpers: "bundled",
        configFile: path.resolve(__dirname, ".babelrc.js"),
      }),
      pluginNodeResolve({
        browser: false,
      }),
      strip(),
      isDev ? null : terser(),
    ],
  },
  {
    input: inputFileName,
    output: {
      file: pkg.types,
      format: "es",
    },
    plugins: [pluginDts()],
  },
];

const cjs = [
  {
    input: inputFileName,
    output: [
      {
        file: pkg.main,
        format: "cjs",
        sourcemap: "inline",
        banner,
        exports: "default",
      },
    ],
    external: [
      ...Object.keys(pkg.peerDependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ],
    plugins: [
      pluginTypescript(),
      pluginCommonjs({
        extensions: [".js", ".ts"],
      }),
      babel({
        babelHelpers: "bundled",
        configFile: path.resolve(__dirname, ".babelrc.js"),
      }),
      pluginNodeResolve({
        browser: false,
      }),
      strip(),
      terser(),
    ],
  },
];


export default isDev ? esm : esm.concat(cjs);
