export interface TickStep {
  readonly name: string;
  run(): Promise<void>;
}
