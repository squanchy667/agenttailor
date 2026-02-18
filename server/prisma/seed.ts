import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Upsert default local user
  const user = await prisma.user.upsert({
    where: { email: 'local@agenttailor.dev' },
    update: {},
    create: {
      email: 'local@agenttailor.dev',
      name: 'Local User',
      plan: 'PRO',
    },
  });
  console.log(`  User: ${user.email} (${user.id})`);

  // Upsert sample "Getting Started" project
  const existingProject = await prisma.project.findFirst({
    where: { userId: user.id, name: 'Getting Started' },
  });

  if (!existingProject) {
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: 'Getting Started',
        description: 'Sample project to help you get started with AgentTailor. Upload your documents here!',
      },
    });
    console.log(`  Project: ${project.name} (${project.id})`);
  } else {
    console.log(`  Project: ${existingProject.name} (${existingProject.id}) — already exists`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
