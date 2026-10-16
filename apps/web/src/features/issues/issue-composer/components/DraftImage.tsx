import Image from "next/image";
import { RichText } from "@/components/tasks/Graph";
import { imageSegments } from "../issueImageModel";

const INTRINSIC_WIDTH = 1200;
const INTRINSIC_HEIGHT = 800;

export function DraftImage({ alt, src }: { alt: string; src: string }) {
  return <Image src={src} alt={alt} width={INTRINSIC_WIDTH} height={INTRINSIC_HEIGHT} unoptimized loading="lazy" className="my-2 block h-auto max-h-96 w-auto max-w-full rounded-md border border-line bg-surface object-contain" />;
}

export function TextWithImages({ text }: { text: string }) {
  return (
    <>
      {imageSegments(text).map((segment, index) => segment.kind === "image" ? <DraftImage key={index} alt={segment.alt} src={segment.src} /> : <RichText key={index} text={segment.text} />)}
    </>
  );
}
