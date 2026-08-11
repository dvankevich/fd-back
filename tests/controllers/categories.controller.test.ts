import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { getCategories } from "../../src/controllers/categories.controller.ts";
import prisma from "../../prisma/client.ts";

// Mock Prisma
vi.mock("../../prisma/client.ts", () => ({
  default: {
    category: {
      findMany: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock("../../src/logger.ts", () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("getCategories", () => {
  const mockFindMany = vi.mocked(prisma.category.findMany);

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

  it("should return list of categories ordered by name", async () => {
    const mockCategories = [
      { id: "6462a6cd4c3d0ddd28897f8a", name: "Seafood" },
      { id: "6462a6cd4c3d0ddd28897f8b", name: "Lamb" },
      { id: "6462a6cd4c3d0ddd28897f8c", name: "Starter" },
    ];

    mockFindMany.mockResolvedValue(mockCategories);

    await getCategories(mockReq, mockRes);

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockFindMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(mockCategories);
  });

  it("should return empty array when no categories exist", async () => {
    mockFindMany.mockResolvedValue([]);

    await getCategories(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });
});
