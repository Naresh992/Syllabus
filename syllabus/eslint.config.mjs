import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { FlatCompat } from "@eslint/eslintrc"

const rootDir = dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({ baseDirectory: rootDir })

const config = [...compat.extends("next/core-web-vitals")]
config.push({ ignores: [".next/**", "node_modules/**"] })

export default config
