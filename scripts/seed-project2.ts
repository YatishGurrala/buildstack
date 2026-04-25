import { PrismaClient } from "../src/generated/project2";

const project2Db = new PrismaClient();

async function main() {
  await project2Db.task.createMany({
    data: [
      {
        ownerId: "demo-user",
        title: "Welcome Task",
        description: "Project2 seed data is working.",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Project2 seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await project2Db.$disconnect();
  });
