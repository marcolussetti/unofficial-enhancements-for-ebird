export interface Feature {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  matches(url: URL): boolean;
  run(): Promise<void>;
}
