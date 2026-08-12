import { API_URL } from '@/lib/auth';

/**
 * Upload a file to the backend's local /uploads folder (master-system-backend/uploads).
 * Signature/return shape matches the previous Supabase-backed version so callers
 * (Order.jsx, TC.jsx, MaterialReturn.jsx, DebitNote.jsx, Invoice.jsx, LoadMaterial.jsx,
 * Logistic.jsx) do not need to change.
 * @param {File} file - The file to upload
 * @param {string} bucket - Unused, kept for call-site compatibility
 * @param {string} path - Unused, kept for call-site compatibility
 * @returns {Promise<{url: string, path: string}>} Public URL and storage path
 */
export async function uploadFileToStorage(file, bucket = 'images', path = '') {
    try {
        if (!file) {
            throw new Error('No file provided for upload');
        }

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData,
        });

        const result = await res.json().catch(() => null);

        if (!res.ok || !result?.success) {
            throw new Error(result?.message || `Upload failed (${res.status})`);
        }

        return {
            url: result.data.url,
            path: result.data.path,
        };
    } catch (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
    }
}

/**
 * No-op: the backend has no delete-by-path endpoint for uploaded files (unused
 * by any order component today). Kept so the export doesn't break existing imports.
 * @param {string} filePath - Path to the file in storage
 * @param {string} bucket - Unused, kept for call-site compatibility
 * @returns {Promise<boolean>} Always true
 */
export async function deleteFileFromStorage(filePath, bucket = 'images') {
    return true;
}
