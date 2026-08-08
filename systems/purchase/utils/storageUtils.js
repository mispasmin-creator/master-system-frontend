import { API_URL } from '@/lib/auth';

/**
 * Upload a file to the backend
 * @param {File} file - The file to upload
 * @param {string} bucket - Bucket name (unused now, kept for compatibility)
 * @param {string} path - Optional folder path within bucket (unused now)
 * @returns {Promise<{url: string, path: string}>} Public URL and storage path
 */
export async function uploadFileToStorage(file, bucket = 'image', path = '') {
    try {
        if (!file) {
            throw new Error('No file provided for upload');
        }

        console.log(`Uploading file to local backend...`);

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData,
        });

        const json = await response.json();

        if (!response.ok || !json.success) {
            throw new Error(json.message || 'Failed to upload to backend');
        }

        console.log(`File uploaded successfully: ${json.data.url}`);

        return {
            url: json.data.url,
            path: json.data.path
        };
    } catch (error) {
        console.error('Error uploading file to local backend:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }
}

/**
 * Delete a file from Storage (Stubbed for now, as local deletion might require backend endpoint)
 * @param {string} filePath - Path to the file in storage
 * @param {string} bucket - Bucket name
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFileFromStorage(filePath, bucket = 'image') {
    console.log('deleteFileFromStorage is a stub for local file uploads', filePath);
    return true;
}
