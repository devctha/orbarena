import { createConfig } from "../src/config.js";
import { createOrbApp } from "../src/app.js";
import { fileURLToPath } from "node:url";

const config = createConfig({ cwd: fileURLToPath(new URL("..", import.meta.url)) });
const app = createOrbApp(config);
try {
  const result = await app.seedAdmin();
  console.log(result.seeded ? "Administrador inicial criado com hash seguro." : `Seed não alterou o banco: ${result.reason}.`);
} finally { app.close(); }
