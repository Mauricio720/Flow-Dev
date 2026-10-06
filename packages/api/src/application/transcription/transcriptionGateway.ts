export type TranscriptionInput = { audio: Uint8Array; mimeType: "audio/webm" | "audio/mp4"; signal: AbortSignal };
export type TranscriptionResult = { text: string };

export interface TranscriptionGateway {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}
