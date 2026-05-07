import { prisma } from "../src/lib/db";

async function resetFinancialData() {
  console.log("Resetando dados financeiros...");

  // Ordem importa por causa das foreign keys
  await prisma.transaction.deleteMany({});
  console.log("Transações deletadas.");

  await prisma.pluggyConnection.deleteMany({});
  console.log("Conexões Pluggy deletadas.");

  await prisma.bankAccount.deleteMany({});
  console.log("Contas bancárias deletadas.");

  console.log("Done. Banco limpo para dados reais do Pluggy.");
}

resetFinancialData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
