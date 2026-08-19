import type { Nullable } from "../../../core/types/common.ts";
import type { AreasReader } from "../domain/areas.port.ts";
import type { AreaView } from "../domain/area.view.ts";

export class AreasService {
  constructor(private readonly areas: AreasReader) {}

  list(): Promise<AreaView[]> {
    return this.areas.list();
  }

  findByName(name: string): Promise<Nullable<AreaView>> {
    return this.areas.findByName(name);
  }
}
