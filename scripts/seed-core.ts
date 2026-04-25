import { PrismaClient } from "../src/generated/core";

const coreDb = new PrismaClient();

async function main() {
  await coreDb.project.upsert({
    where: { key: "project1" },
    update: { displayName: "Project 1" },
    create: {
      key: "project1",
      displayName: "Project 1",
    },
  });

  await coreDb.project.upsert({
    where: { key: "project2" },
    update: { displayName: "Project 2" },
    create: {
      key: "project2",
      displayName: "Project 2",
    },
  });

  console.log("Core seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await coreDb.$disconnect();
  });
