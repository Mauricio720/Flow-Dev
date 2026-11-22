"use client";

import { useState } from "react";
import type { IssueImageChoice } from "../terminalContract";
import { skippedImagesNotice } from "../terminalCopy";

export function useIssueImageSelection(issueImages: IssueImageChoice[]) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isSelected = (image: IssueImageChoice) => overrides[image.id] ?? image.preselected;
  const toggle = (id: string) => {
    const image = issueImages.find((candidate) => candidate.id === id);
    if (image) setOverrides((current) => ({ ...current, [id]: !isSelected(image) }));
  };
  const skipped = issueImages.filter((image) => !image.preselected).length;
  const selected = issueImages.filter(isSelected);
  return { isSelected, toggle, selected, notices: skipped > 0 ? [skippedImagesNotice(skipped)] : [] };
}
