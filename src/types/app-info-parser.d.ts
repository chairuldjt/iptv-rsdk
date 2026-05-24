declare module 'app-info-parser' {
  export default class AppInfoParser {
    constructor(file: File | Blob);
    parse(): Promise<{
      versionCode: number;
      versionName: string;
      package: string;
      [key: string]: unknown;
    }>;
  }
}
