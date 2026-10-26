import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/halo-button-card.ts",
  output: {
    file: "dist/halo-button-card.js",
    format: "iife",
    sourcemap: false
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript(),
    terser({
      format: {
        comments: false
      }
    })
  ]
};
