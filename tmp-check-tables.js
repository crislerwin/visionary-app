const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/saas'
    }
  }
});

prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`
  .then(t => {
    console.log(t.map(r => r.tablename).sort().join('\n'));
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
