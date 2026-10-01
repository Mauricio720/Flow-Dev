import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Stroke({ size = 16, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function GitHubMark({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.02c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function FlowMark({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M5 2v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 5.5 11 11.5v3.5" stroke="var(--lane-project)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="5" cy="15.5" r="2.5" fill="var(--lane-merge)" />
      <circle cx="11" cy="15" r="2" fill="var(--ground)" stroke="var(--lane-project)" strokeWidth="1.75" />
    </svg>
  );
}

export const SendIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 19V5" />
    <path d="m6 11 6-6 6 6" />
  </Stroke>
);

export const PlusIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
);

export const GridIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 4h16v16H4zM4 12h16M12 4v16" />
  </Stroke>
);

export const FolderIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </Stroke>
);

export const IssueIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </Stroke>
);

export const PencilIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16Z" />
    <path d="m13.5 6.5 4 4" />
  </Stroke>
);

export const CheckIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Stroke>
);

export const XIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Stroke>
);

export const ArrowUpRightIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </Stroke>
);

export const LogOutIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
  </Stroke>
);

export const MenuIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Stroke>
);

export const BranchIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="6" cy="5.5" r="2" />
    <circle cx="6" cy="18.5" r="2" />
    <circle cx="18" cy="8" r="2" />
    <path d="M6 7.5v9M18 10c0 4-6 3.5-11 7" />
  </Stroke>
);

export const LayersIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m12 4 8 4-8 4-8-4Z" />
    <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
  </Stroke>
);

export const ShieldIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6Z" />
    <path d="m9 12 2 2 4-4" />
  </Stroke>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Stroke>
);

export const ChevronUpIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m6 14.5 6-6 6 6" />
  </Stroke>
);
