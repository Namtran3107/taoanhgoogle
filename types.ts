
export enum AppMode {
  TRY_ON = 'TRY_ON',
  POSE_CHANGE = 'POSE_CHANGE',
  OBJECT_REMOVAL = 'OBJECT_REMOVAL',
  REMOVE_BG = 'REMOVE_BG'
}

export type AspectRatio = '1:1' | '9:16' | '16:9';

export interface ImageFile {
  id: string;
  url: string;
  file: File;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: string;
  error: string | null;
}
