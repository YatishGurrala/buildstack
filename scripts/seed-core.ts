import { PrismaClient } from "../src/generated/core";

const coreDb = new PrismaClient();

async function main() {
  await coreDb.project.upsert({
    where: { key: "buildstack-internal" },
    update: {
      displayName: "Buildstack Internal",
      schemaName: "proj_buildstack_internal",
    },
    create: {
      key: "buildstack-internal",
      schemaName: "proj_buildstack_internal",
      displayName: "Buildstack Internal",
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
