export interface DatabaseProbe {
  ping(): Promise<void>;
}
