const fs = require('fs');
const path = 'node_modules/.prisma/client/query_engine-windows.dll.node';
try {
  fs.unlinkSync(path);
  console.log('DELETED');
} catch (e) {
  console.log('LOCKED_BY:' + e.code);
}
