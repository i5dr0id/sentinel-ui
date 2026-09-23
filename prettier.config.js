import { defineConfig } from "prettier"

export default {
  semi: false,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 110,
  plugins: ["prettier-plugin-tailwindcss"],
}
