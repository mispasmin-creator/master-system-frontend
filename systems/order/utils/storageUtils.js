import { supabase } from '../supabase';

/**
 * Upload a file to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} bucket - Bucket name (default: 'images')
 * @param {string} path - Optional folder path within bucket
 * @returns {Promise<{url: string, path: string}>} Public URL and storage path
 */
export async function uploadFileToStorage(file, bucket = 'images', path = '') {
    try {
        if (!file) {
            throw new Error('No file provided for upload');
        }

        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = path ? `${path}/${fileName}` : fileName;

        // Convert File to ArrayBuffer to avoid HTTP2 protocol errors in some environments
        const fileBuffer = await file.arrayBuffer();

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, fileBuffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return {
            url: publicUrl,
            path: filePath
        };
    } catch (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
    }
}

/**
 * Delete a file from Supabase Storage
 * @param {string} filePath - Path to the file in storage
 * @param {string} bucket - Bucket name (default: 'images')
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFileFromStorage(filePath, bucket = 'images') {
    try {
        if (!filePath) {
            throw new Error('No file path provided for deletion');
        }

        const { error } = await supabase.storage
            .from(bucket)
            .remove([filePath]);

        if (error) {
            throw error;
        }

        return true;
    } catch (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
    }
}
