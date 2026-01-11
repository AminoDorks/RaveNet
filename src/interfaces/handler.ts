export interface Handler {
  handle(): Promise<any>;
}
