import { defineConfig } from "eslint-config-zoro";

export default defineConfig({
    node: true,
    typescript: true,
    ignores: ["dist/**"],
    languageOptions: {
        parserOptions: {
            project: "./tsconfig.eslint.json"
        }
    },
    rules: {
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/strict-void-return": "off",
        "perfectionist/sort-object-types": "off"
    }
});
