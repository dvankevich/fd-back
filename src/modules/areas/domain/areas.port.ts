import type { Nullable } from "../../../core/types/common.ts";
import type { AreaView } from "./area.view.ts";

export interface AreasReader {
  list(): Promise<AreaView[]>;
  findByName(name: string): Promise<Nullable<AreaView>>;
}
