import { taskImages } from "../../schema";

export const imageRecordColumns = { id: taskImages.id, taskId: taskImages.taskId, projectId: taskImages.projectId, contentType: taskImages.contentType, byteSize: taskImages.byteSize, sha256: taskImages.sha256, createdAt: taskImages.createdAt };
