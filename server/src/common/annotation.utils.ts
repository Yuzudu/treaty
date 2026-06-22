export interface AnnotationCoords {
  id: string;
  coordX: string | null;
  coordY: string | null;
  boundingBox: unknown;
}

export interface AnnotationVideo {
  id: string;
  timestampSeconds: string | null;
  duration: string | null;
}

export interface BaseAnnotation {
  id: string;
  assetId: string | null;
  commentText: string | null;
  collaboratorName: string | null;
  coordinates: AnnotationCoords | null;
  video: AnnotationVideo | null;
}

interface AnnotationRow {
  collabId: string;
  commentText: string | null;
  collaboratorName: string | null;
  coordId: string | null;
  coordX: string | null;
  coordY: string | null;
  boundingBox: unknown;
  videoAnnId: string | null;
  timestampSeconds: string | null;
  duration: string | null;
}

export function buildAnnotationMap<
  TRow extends AnnotationRow,
  TEntry extends BaseAnnotation,
>(rows: TRow[], createEntry: (row: TRow) => TEntry): TEntry[] {
  const map = new Map<string, TEntry>();
  for (const r of rows) {
    if (!map.has(r.collabId)) {
      map.set(r.collabId, createEntry(r));
    }
    const current = map.get(r.collabId);
    if (!current) continue;
    if (r.coordId) {
      current.coordinates = {
        id: r.coordId,
        coordX: r.coordX,
        coordY: r.coordY,
        boundingBox: r.boundingBox,
      };
    }
    if (r.videoAnnId) {
      current.video = {
        id: r.videoAnnId,
        timestampSeconds: r.timestampSeconds,
        duration: r.duration,
      };
    }
  }
  return Array.from(map.values());
}
