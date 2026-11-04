import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // All email goes through src/lib/email.ts (Google Workspace SMTP). Calling a
  // provider directly is how Resend spread into 11 files with unchecked errors.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "nodemailer", message: "Use sendEmail() from '@/lib/email'." },
            { name: "resend", message: "Resend is retired. Use sendEmail() from '@/lib/email'." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/email.ts", "src/lib/email.test.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
