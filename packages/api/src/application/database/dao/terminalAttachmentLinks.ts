export type IssueImageLink = { taskImageId: string; originalName: string; storedName: string; contentType: string; byteSize: number; sha256: string };
export type SessionAttachmentLinks = { uploadIds: string[]; issueImages: IssueImageLink[] };

export const NO_ATTACHMENT_LINKS: SessionAttachmentLinks = { uploadIds: [], issueImages: [] };
