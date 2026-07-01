export interface BrandBrief {
  brand: string;
  product: string;
  offer: string;
  usp: string;
  tone: string;
  targetAudience: string;
  sourceAssetUrl?: string;
}

export interface CreativeStrategy {
  chosenFormats: Array<{
    formatId: number;
    formatName: string;
    subFormat: string;
    platform: string;
    aspectRatio: string;
    rationale: string;
  }>;
}

export interface ScriptOutput {
  formatName: string;
  subFormatName: string;
  hook: string;
  body: string;
  cta: string;
  duration: number;
  structure: string[];
}

export interface PipelineResult {
  brief: BrandBrief;
  strategy: CreativeStrategy;
  scripts: ScriptOutput[];
  renderPlans: any[];
  outputs: any[];
}
