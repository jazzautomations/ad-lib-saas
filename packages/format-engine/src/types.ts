export type MediaType = "video" | "image" | "mixed";
export type FunnelStage = "top" | "mid" | "btm";

export interface SubFormat {
  name: string;
  tipo: string;
  funil: string;
  quando: string;
  estrutura: string;
  hook: string;
  dica: string;
}

export interface AdFormat {
  id: number;
  icon: string;
  name: string;
  color: string;
  tipos: string[];
  funil: string[];
  desc: string;
  subs: SubFormat[];
}

export interface FormatMatch {
  format: AdFormat;
  sub?: SubFormat;
  score: number;
}

export interface FormatQuery {
  tipos?: string[];
  funil?: string[];
  search?: string;
  platform?: string;
}
