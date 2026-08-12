import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { getIngredients } from "../../src/controllers/ingredients.controller.ts";
import prisma from "../../prisma/client.ts";

vi.mock("../../prisma/client.ts", () => ({
  default: {
    ingredient: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../../src/logger.ts", () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("getIngredients", () => {
  const mockFindMany = vi.mocked(prisma.ingredient.findMany);

  const mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;

  const mockReq = {} as Request;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return list of ingredients ordered by name", async () => {
    const mockIngredients = [
      {
        id: "640c2dd963a319ea671e37aa",
        name: "Squid",
        description: "A type of cephalopod...",
        img: "https://ftp.goit.study/img/so-yummy/ingredients/640c2dd963a319ea671e37aa.png",
      },
      {
        id: "640c2dd963a319ea671e37f5",
        name: "Cabbage",
        description: "A leafy green or purple vegetable...",
        img: "https://ftp.goit.study/img/so-yummy/ingredients/640c2dd963a319ea671e37f5.png",
      },
    ];

    mockFindMany.mockResolvedValue(mockIngredients);

    await getIngredients(mockReq, mockRes);

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockFindMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        description: true,
        img: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(mockIngredients);
  });

  it("should return empty array when no ingredients exist", async () => {
    mockFindMany.mockResolvedValue([]);

    await getIngredients(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });
});
