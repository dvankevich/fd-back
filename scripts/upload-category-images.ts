import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import fs from "node:fs";
import path from "node:path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type SourceCategory = {
  _id: string;
  name: string;
  image: string;
  description: string;
};

const source: SourceCategory[] = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "prisma/data/categories.source.json"),
    "utf-8",
  ),
);

async function main() {
  const rows: string[] = [
    `"id","name","image","description"`,
  ];

  for (const cat of source) {
    console.log(`Uploading ${cat.name}...`);

    const result = await cloudinary.uploader.upload(cat.image, {
      folder: "foodies/categories",
      public_id: cat.name.toLowerCase().replace(/\s+/g, "_"),
      overwrite: true,
    });

    const description = cat.description.replaceAll('"', '""');

    rows.push(
      `"${cat._id}","${cat.name}","${result.secure_url}","${description}"`,
    );

    console.log(`  → ${result.secure_url}`);
  }

  const outPath = path.join(process.cwd(), "prisma/data/categories.csv");
  fs.writeFileSync(outPath, rows.join("\n") + "\n", "utf-8");
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
