import { storeApi } from '../lib/api';
import { allPermissionKeys, type UserPermissions } from '@/types/sheets';

/**
 * User Service
 * Handles all Supabase operations for user management and administration.
 */

export interface UserRecord extends UserPermissions {
    id: number;
    timestamp: string;
}

/**
 * Fetch all users from Supabase
 */
export async function fetchUsers(): Promise<UserRecord[]> {
    try {
        const response = await storeApi.get('user');
        const data = response.data;

        

        return (data || []).map((r: any) => {
            const user: any = {
                id: r.id,
                timestamp: r.timestamp || '',
                username: r.user_name || '',
                password: r.password || '',
                name: r.name || '',
                firmNameMatch: r.firm_name_match || '',
                rowIndex: r.id, // Using ID as a fallback for rowIndex since it's used in and out of tables
            };

            // Map each permission key from snake_case in DB to camelCase in UserPermissions
            allPermissionKeys.forEach((key) => {
                const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                const value = r[dbKey];

                // Handle "true"/"TRUE"/true results
                user[key] = value === true ||
                    (typeof value === 'string' && value.toLowerCase() === 'true');
            });

            return user as UserRecord;
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
}

/**
 * Create a new user in Supabase
 */
export async function createUser(userData: Partial<UserPermissions>) {
    try {
        const dbRow: any = {
            user_name: userData.username,
            name: userData.name,
            password: userData.password,
            firm_name_match: userData.firmNameMatch || '',
            timestamp: new Date().toISOString(),
        };

        // Map camelCase permissions to snake_case for DB
        allPermissionKeys.forEach(key => {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            const value = userData[key as keyof UserPermissions];

            dbRow[dbKey] = String(value || false).toUpperCase();
        });

        const response = await storeApi.post('user', [dbRow]);
        const data = response.data;

        return data;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

/**
 * Update an existing user in Supabase
 */
export async function updateUser(id: number, userData: Partial<UserPermissions>) {
    try {
        const dbRow: any = {
            user_name: userData.username,
            name: userData.name,
            password: userData.password,
            firm_name_match: userData.firmNameMatch || '',
        };

        // Map camelCase permissions to snake_case for DB
        allPermissionKeys.forEach(key => {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            const value = userData[key as keyof UserPermissions];
            if (value !== undefined) {
                dbRow[dbKey] = String(value).toUpperCase();
            } else {
                dbRow[dbKey] = 'FALSE';
            }
        });

        const response = await storeApi.patch('user', id, dbRow);

        
        return true;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}

/**
 * Delete a user from Supabase
 */
export async function deleteUser(id: number) {
    try {
        const response = await storeApi.delete('user', id);

        
        return true;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
}

/**
 * Authenticate a user with username and password
 */
export async function authenticateUser(username: string, password: string): Promise<UserRecord | null> {
    try {
        const response = await storeApi.get('user');
        const users = response.data || [];
        const r = users.find((u: any) => u.user_name === username && u.password === password);

        if (!r) return null;

        const user: any = {
            id: r.id,
            timestamp: r.timestamp || '',
            username: r.user_name || '',
            password: r.password || '',
            name: r.name || '',
            firmNameMatch: r.firm_name_match || '',
            rowIndex: r.id,
        };

        // Map permission keys
        allPermissionKeys.forEach((key) => {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            const value = r[dbKey];
            user[key] = value === true ||
                (typeof value === 'string' && value.toLowerCase() === 'true');
        });

        return user as UserRecord;
    } catch (error) {
        console.error('Error authenticating user:', error);
        return null;
    }
}
/**
 * Fetch a user by username (for session restoration)
 */
export async function getUserByUsername(username: string): Promise<UserRecord | null> {
    try {
        const response = await storeApi.get('user');
        const users = response.data || [];
        const r = users.find((u: any) => u.user_name === username);

        if (!r) return null;

        const user: any = {
            id: r.id,
            timestamp: r.timestamp || '',
            username: r.user_name || '',
            password: r.password || '',
            name: r.name || '',
            firmNameMatch: r.firm_name_match || '',
            rowIndex: r.id,
        };

        // Map permission keys
        allPermissionKeys.forEach((key) => {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            const value = r[dbKey];
            user[key] = value === true ||
                (typeof value === 'string' && value.toLowerCase() === 'true');
        });

        return user as UserRecord;
    } catch (error) {
        console.error('Error fetching user by username:', error);
        return null;
    }
}
