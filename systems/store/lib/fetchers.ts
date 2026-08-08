import { storeApi } from './api';

/**
 * Upload a file to the backend storage.
 *
 * @param file         - The File object to upload.
 * @param folderId     - Legacy param: kept for API compatibility, ignored (backend organises storage internally).
 * @param uploadType   - Legacy param: kept for API compatibility, ignored.
 * @param email        - Legacy param: kept for API compatibility, ignored.
 * @param emailSubject - Legacy param: kept for API compatibility, ignored.
 * @param emailBody    - Legacy param: kept for API compatibility, ignored.
 * @returns The public URL of the uploaded file as returned by the backend.
 */
export async function uploadFile({
    file,
    folderId,
    uploadType = 'upload',
    email,
    emailSubject,
    emailBody,
}: {
    file: File;
    folderId: string;
    uploadType?: 'upload' | 'email';
    email?: string;
    emailSubject?: string;
    emailBody?: string;
}): Promise<string> {
    // Suppress unused-variable warnings for legacy params
    void folderId;
    void uploadType;
    void email;
    void emailSubject;
    void emailBody;

    const url = await storeApi.upload(file);
    console.log('✅ Uploaded via backend:', url);
    return url;
}