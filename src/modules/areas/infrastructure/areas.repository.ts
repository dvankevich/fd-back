import type { Prisma, PrismaClient } from "../../../core/database/prisma.ts";
import type { Nullable } from "../../../core/types/common.ts";
import type { AreasReader } from "../domain/areas.port.ts";
import type { AreaView } from "../domain/area.view.ts";

const areaSelect = { id: true, name: true } as const satisfies Prisma.AreaSelect;

export class AreasRepository implements AreasReader {
  constructor(private readonly client: PrismaClient) {}

  list(): Promise<AreaView[]> {
    return this.client.area.findMany({ select: areaSelect, orderBy: { name: "asc" } });
  }

  findByName(name: string): Promise<Nullable<AreaView>> {
    return this.client.area.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: areaSelect,
    });
  }
}
