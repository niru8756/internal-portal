// lib/fileUpload.ts
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface UploadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export async function uploadFile(file: File, folder: string = 'uploads'): Promise<UploadResult> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Create upload directory if it doesn't exist
  const uploadDir = join(process.cwd(), 'public', folder);
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}_${originalName}`;
  const filePath = join(uploadDir, fileName);

  // Write file
  await writeFile(filePath, buffer);

  return {
    filePath: `/${folder}/${fileName}`,
    fileName: originalName,
    fileSize: buffer.length,
    mimeType: file.type
  };
}

export function validatePolicyFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only PDF and Word documents are allowed' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  return { valid: true };
}