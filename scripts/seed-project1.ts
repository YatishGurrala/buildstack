import { PrismaClient } from "../src/generated/project1";

const project1Db = new PrismaClient();

async function main() {
  await project1Db.note.createMany({
    data: [
      {
        ownerId: "demo-user",
        title: "Welcome Note",
        body: "Project1 seed data is working.",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Project1 seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await project1Db.$disconnect();
  });
