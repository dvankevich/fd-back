import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { getAreas } from "../../src/controllers/areas.controller.ts";
import prisma from "../../prisma/client.ts";

vi.mock("../../prisma/client.ts", () => ({
  default: {
    area: {
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

describe("getAreas", () => {
  const mockFindMany = vi.mocked(prisma.area.findMany);

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

  it("should return list of areas ordered by name", async () => {
    const mockAreas = [
      { id: "6462a6f04c3d0ddd28897f9b", name: "Ukrainian" },
      { id: "6462a6f04c3d0ddd28897f9c", name: "Italian" },
      { id: "6462a6f04c3d0ddd28897f9d", name: "Moroccan" },
    ];

    mockFindMany.mockResolvedValue(mockAreas);

    await getAreas(mockReq, mockRes);

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
    expect(mockRes.json).toHaveBeenCalledWith(mockAreas);
  });

  it("should return empty array when no areas exist", async () => {
    mockFindMany.mockResolvedValue([]);

    await getAreas(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });
});
