const fs = require("fs");
const path = require("path");

const dirs = [path.join(__dirname, "..", ".next"), path.join(__dirname, "..", "node_modules", ".cache")];
for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log("Removido:", dir);
  }
}
console.log("Limpeza concluída. Rode: npm run dev");
