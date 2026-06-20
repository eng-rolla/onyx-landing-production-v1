import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const baseConfigs = nextCoreWebVitals
  .filter((entry) => !("ignores" in entry))
  .map((entry) => ({
    ...entry,
    rules: {
      ...entry.rules,
      "react-hooks/set-state-in-effect": "off",
    },
  }));

export default [
  {
    ignores: [".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts", "eslint.config.mjs"],
  },
  ...baseConfigs,
];
