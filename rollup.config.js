import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "src/halo-button-card.ts",
  output: {
    file: "dist/halo-button-card.js",
    format: "iife",
    name: "HaloButtonCard",
    sourcemap: false
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript()
  ]
};

