import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { parse } from "csv-parse/sync";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";

// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const dataDir = path.join(__dirname, "data");
const dataDir = path.join(process.cwd(), "prisma", "data");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// ---------- helpers ----------

function readCsv<T = Record<string, string>>(filename: string): T[] {
  const filePath = path.join(dataDir, filename);
  const content = fs.readFileSync(filePath, "utf-8");

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as T[];
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }
  return value;
}

// ---------- seed ----------

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Users
  const users = readCsv<{
    id: string;
    name: string;
    email: string;
    avatar: string;
  }>("users.csv");

  const defaultPassword = await bcrypt.hash("password123", 10);

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        password: defaultPassword,
        avatar: emptyToNull(u.avatar),
      },
    });
  }
  console.log(`✓ Users: ${users.length}`);

  // 2. Categories
  const categories = readCsv<{ id: string; name: string }>("categories.csv");

  await prisma.category.createMany({
    data: categories.map((c) => ({ id: c.id, name: c.name })),
    skipDuplicates: true,
  });
  console.log(`✓ Categories: ${categories.length}`);

  // 3. Areas
  const areas = readCsv<{ id: string; name: string }>("areas.csv");

  await prisma.area.createMany({
    data: areas.map((a) => ({ id: a.id, name: a.name })),
    skipDuplicates: true,
  });
  console.log(`✓ Areas: ${areas.length}`);

  // 4. Ingredients
  const ingredients = readCsv<{
    id: string;
    name: string;
    description: string;
    img: string;
  }>("ingredients.csv");

  await prisma.ingredient.createMany({
    data: ingredients.map((i) => ({
      id: i.id,
      name: i.name,
      description: emptyToNull(i.description),
      img: emptyToNull(i.img),
    })),
    skipDuplicates: true,
  });
  console.log(`✓ Ingredients: ${ingredients.length}`);

  // Maps for name → id (recipes.csv uses names)
  const categoryByName = new Map(categories.map((c) => [c.name, c.id]));
  const areaByName = new Map(areas.map((a) => [a.name, a.id]));

  // 5. Recipes
  const recipes = readCsv<{
    id: string;
    title: string;
    category: string;
    area: string;
    instructions: string;
    description: string;
    thumb: string;
    preview: string;
    time: string;
    owner_id: string;
  }>("recipes.csv");

  let recipesCreated = 0;

  for (const r of recipes) {
    const categoryId = categoryByName.get(r.category);
    const areaId = areaByName.get(r.area);

    if (!categoryId) {
      console.warn(`⚠ Skip recipe "${r.title}": unknown category "${r.category}"`);
      continue;
    }
    if (!areaId) {
      console.warn(`⚠ Skip recipe "${r.title}": unknown area "${r.area}"`);
      continue;
    }

    await prisma.recipe.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        title: r.title,
        instructions: r.instructions,
        description: emptyToNull(r.description),
        thumb: emptyToNull(r.thumb),
        preview: emptyToNull(r.preview),
        time: emptyToNull(r.time),
        ownerId: r.owner_id,
        categoryId,
        areaId,
      },
    });
    recipesCreated++;
  }
  console.log(`✓ Recipes: ${recipesCreated}`);

  // 6. RecipeIngredients
  const recipeIngredients = readCsv<{
    recipe_id: string;
    ingredient_id: string;
    measure: string;
  }>("recipe_ingredients.csv");

  await prisma.recipeIngredient.createMany({
    data: recipeIngredients.map((ri) => ({
      recipeId: ri.recipe_id,
      ingredientId: ri.ingredient_id,
      measure: ri.measure,
    })),
    skipDuplicates: true,
  });
  console.log(`✓ RecipeIngredients: ${recipeIngredients.length}`);

  // 7. Testimonials
  const testimonials = readCsv<{
    id: string;
    owner_id: string;
    testimonial: string;
  }>("testimonials.csv");

  await prisma.testimonial.createMany({
    data: testimonials.map((t) => ({
      id: t.id,
      ownerId: t.owner_id,
      testimonial: t.testimonial,
    })),
    skipDuplicates: true,
  });
  console.log(`✓ Testimonials: ${testimonials.length}`);

  console.log("🌱 Seed completed successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  