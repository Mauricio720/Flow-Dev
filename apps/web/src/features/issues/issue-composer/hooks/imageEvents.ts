import type { DragEvent } from "react";
import { imageFiles } from "../issueImageModel";

const FILE_DRAG_TYPE = "Files";

export function takeFiles(event: { preventDefault: () => void }, source: FileList) {
  const files = imageFiles(source);
  if (files.length) event.preventDefault();
  return files;
}

export function chosenFiles(input: HTMLInputElement) {
  const files = imageFiles(input.files);
  input.value = "";
  return files;
}

export function acceptFileDrag(event: DragEvent<HTMLElement>) {
  if (event.dataTransfer.types.includes(FILE_DRAG_TYPE)) event.preventDefault();
}
