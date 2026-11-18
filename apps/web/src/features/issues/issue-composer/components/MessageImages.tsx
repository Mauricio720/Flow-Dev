import Image from "next/image";
import { ATTACHMENT_COPY } from "../imageCopy";
import { imageRoute } from "../issueImageModel";

const THUMB_WIDTH = 320;
const THUMB_HEIGHT = 200;

export function MessageImages({ imageIds }: { imageIds: string[] }) {
  if (!imageIds.length) return null;
  return (
    <ul aria-label="Imagens anexadas" className="mt-2 flex flex-wrap gap-2">
      {imageIds.map((imageId, index) => (
        <li key={imageId}>
          <a href={imageRoute(imageId)} target="_blank" rel="noreferrer" className="block rounded-md focus-visible:outline-2 focus-visible:outline-project">
            <Image src={imageRoute(imageId)} alt={`${ATTACHMENT_COPY.sent} ${index + 1}`} width={THUMB_WIDTH} height={THUMB_HEIGHT} unoptimized loading="lazy" className="block h-auto max-h-48 w-auto max-w-[min(20rem,100%)] rounded-md border border-line bg-surface object-contain" />
          </a>
        </li>
      ))}
    </ul>
  );
}
