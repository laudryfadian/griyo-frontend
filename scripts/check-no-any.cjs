const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
let failures = 0;
function scan(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (!/\.tsx?$/.test(file)) continue;
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (node.kind === ts.SyntaxKind.AnyKeyword) {
        const position = source.getLineAndCharacterOfPosition(node.getStart());
        console.error(`${file}:${position.line + 1}: explicit any is prohibited`);
        failures++;
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
scan('src');
if (failures) process.exit(1);
console.log('PASS: authored TypeScript has no explicit any');
