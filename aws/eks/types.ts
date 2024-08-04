export interface EksAddon {
    name: string;
    version: string;
    configuration?: Map<string, any>;
    enableIRSA?: boolean;
    namespace?: string;
  }
  