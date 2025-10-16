import { ESLINT_CONFIGS } from "eslint-config-zoro/eslint";
import { NODE_CONFIGS } from "eslint-config-zoro/node";
import { STYLISTIC_CONFIGS } from "eslint-config-zoro/stylistic";
import { TYPESCRIPT_CONFIGS } from "eslint-config-zoro/typescript";
import * as globals from "globals";

export default [
    { ignores: ["dist/*"] },
    ...ESLINT_CONFIGS,
    ...NODE_CONFIGS,
    ...STYLISTIC_CONFIGS,
    ...TYPESCRIPT_CONFIGS,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest
            },
            ecmaVersion: 5,
            sourceType: "commonjs",
            parserOptions: {
                project: "./tsconfig.eslint.json"
            }
        },
        rules: {
            "@typescript-eslint/no-unsafe-member-access": "off"
        }
    }
];
