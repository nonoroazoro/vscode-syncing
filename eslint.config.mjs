import { configs } from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import * as globals from "globals";
import * as path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat(
    {
        baseDirectory: __dirname,
        recommendedConfig: configs.recommended,
        allConfig: configs.all
    }
);

export default defineConfig(
    [
        globalIgnores(["**/dist"]),
        {
            extends: compat.extends(
                "eslint-config-zoro/eslint",
                "eslint-config-zoro/typescript",
                "eslint-config-zoro/node",
            ),
            languageOptions:
            {
                globals:
                {
                    ...globals.node,
                    ...globals.jest,
                },
                ecmaVersion: 5,
                sourceType: "commonjs",
                parserOptions:
                {
                    project: "./tsconfig.eslint.json",
                }
            },
            rules:
            {
                "@typescript-eslint/naming-convention":
                    [
                        "error",
                        {
                            selector: "variable",
                            format: [
                                "camelCase",
                                "PascalCase",
                                "snake_case",
                                "UPPER_CASE"
                            ],
                            leadingUnderscore: "allow",
                            trailingUnderscore: "forbid",
                        }
                    ]
            }
        }
    ]
);
