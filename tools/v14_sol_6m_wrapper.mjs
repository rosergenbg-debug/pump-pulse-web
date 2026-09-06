import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
let src=fs.readFileSync('tools/v14_sol_oos.js','utf8');
src=src
  .replace("Date.parse('2026-02-01T00:00:00Z')","Date.parse('2026-02-01T00:00:00Z')")
  .replace("Date.parse('2026-03-01T00:00:00Z')","Date.parse('2026-08-01T00:00:00Z')")
  .replace("'2026-02-01..2026-03-01 UTC'","'2026-02-01..2026-08-01 UTC'")
  .replace("'v14_sol_oos_result.json'","'v14_sol_6m_result.json'");
fs.writeFileSync('/tmp/v14_sol_6m.mjs',src);
const r=spawnSync(process.execPath,['/tmp/v14_sol_6m.mjs'],{stdio:'inherit',cwd:process.cwd()});
process.exit(r.status??1);
