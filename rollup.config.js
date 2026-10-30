import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

// Plugin JSON minimal (aucune dépendance) : exporte les dictionnaires i18n en module ES.
const json = () => ({
  name: "halo-json",
  transform(code, id) {
    if (!id.endsWith(".json")) return null;
    return { code: `export default ${code};`, map: null };
  }
});

export default {
  input: "src/halo-button-card.ts",
  output: {
    file: "dist/halo-button-card.js",
    format: "iife",
    name: "HaloButtonCard",
    sourcemap: false
  },
  plugins: [
    json(),
    resolve(),
    commonjs(),
    typescript()
  ]
};

