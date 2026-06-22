export interface CameraState {
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
}

export interface VideoCanvasProps {
  stream: MediaStream | null;
  width?: number;
  height?: number;
  isPaused?: boolean;
  onFrameSent?: (response: import("@/types/detection").FaceDetectionResponse) => void;
  onFrameError?: (error: Error) => void;
  faceCoordinates?: { x: number; y: number; w: number; h: number } | null;
}

export interface BlinkCounterProps {
  count: number;
}

export interface VideoCanvasBlinkProps {
  stream: MediaStream | null;
  width?: number;
  height?: number;
  isPaused?: boolean;
  isActive?: boolean;
  onFrameSent?: (response: import("@/types/detection").BlinkDetectionResponse) => void;
  onBlink?: (response: import("@/types/detection").CombinedDetectionResponse) => void;
  onFrameError?: (error: Error) => void;
}

