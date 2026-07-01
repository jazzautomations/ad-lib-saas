export interface AssetUpload {
  url?: string;
  filePath?: string;
  type: "video" | "image" | "audio";
  durationSec?: number;
  aspectRatio?: string;
}

export interface AssetBundle {
  id: string;
  source: AssetUpload;
  processed: {
    variants: Array<{ format: string; url: string }>;
    thumbnails: string[];
    duration: number;
  };
  metadata: Record<string, any>;
}

export class AssetManager {
  private assets: Map<string, AssetBundle> = new Map();

  async register(upload: AssetUpload): Promise<string> {
    const id = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const bundle: AssetBundle = {
      id,
      source: upload,
      processed: { variants: [], thumbnails: [], duration: upload.durationSec || 0 },
      metadata: {},
    };
    this.assets.set(id, bundle);
    return id;
  }

  get(id: string): AssetBundle | undefined {
    return this.assets.get(id);
  }
}
