import { describe, expect, it } from "vitest";
import type { Nullable } from "../../../core/types/common.ts";
import type { AreasReader } from "../domain/areas.port.ts";
import type { AreaView } from "../domain/area.view.ts";
import { AreasService } from "./areas.service.ts";

const areas: AreaView[] = [
  { id: "area-1", name: "British" },
  { id: "area-2", name: "Ukrainian" },
];

class FakeAreasReader implements AreasReader {
  constructor(private readonly rows: AreaView[] = areas) {}

  async list(): Promise<AreaView[]> {
    return this.rows;
  }

  async findByName(name: string): Promise<Nullable<AreaView>> {
    return this.rows.find((row) => row.name.toLowerCase() === name.toLowerCase()) ?? null;
  }
}

describe("AreasService", () => {
  it("should return the areas the reader gives", async () => {
    const service = new AreasService(new FakeAreasReader());

    await expect(service.list()).resolves.toEqual(areas);
  });

  it("should return an empty list when there are no areas", async () => {
    const service = new AreasService(new FakeAreasReader([]));

    await expect(service.list()).resolves.toEqual([]);
  });

  it("should look an area up by name regardless of case", async () => {
    const service = new AreasService(new FakeAreasReader());

    await expect(service.findByName("ukrainian")).resolves.toEqual({ id: "area-2", name: "Ukrainian" });
  });

  it("should return null for an unknown area name", async () => {
    const service = new AreasService(new FakeAreasReader());

    await expect(service.findByName("Martian")).resolves.toBeNull();
  });
});
