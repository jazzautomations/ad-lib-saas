export type MediaType = "video" | "image" | "mixed";
export type FunnelStage = "top" | "mid" | "btm";
export type RenderEngine = "remotion" | "hyperframes" | "shotstack" | "creatomate" | "replicate" | "custom";

export interface SubFormat {
  name: string;
  tipo: MediaType;
  funil: FunnelStage | FunnelStage[];
  quando: string;
  estrutura: string;
  hook: string;
  dica?: string;
  imagem?: string;
}

export interface AdFormat {
  id: number;
  icon: string;
  name: string;
  color: string;
  tipos: MediaType[];
  funil: FunnelStage[];
  desc: string;
  subs: SubFormat[];
}

export interface CreativeBrief {
  brand: string;
  product: string;
  offer: string;
  targetAudience: string;
  platform?: string;
  funnelStage?: FunnelStage;
  tone?: string;
}

export interface GenerationRequest {
  brief: CreativeBrief;
  formatId?: number;
  subFormatName?: string;
  engine?: RenderEngine;
}

export interface GeneratedAd {
  id: string;
  formatName: string;
  subFormatName: string;
  script: string;
  storyboard: string[];
  audioScript?: string;
  renderUrl?: string;
  platform: string;
  estimatedDuration: number;
}
