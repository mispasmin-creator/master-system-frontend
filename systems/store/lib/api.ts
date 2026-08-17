import { API_URL, getToken } from "@/lib/auth";

const tableRouteMap: Record<string, string> = {
  "master": "master",
  "user": "user",
  "indent": "indent",
  "po_master": "po-master",
  "store_in": "store-in",
  "payments": "payment",
  "issue": "issue",
  "inventory": "inventory",
  "tally_entry": "tally-entry",
  "fullkitting": "fullkitting",
  "pc_report": "pc-report",
  "payment_history": "payment-history",
  "received": "received",
  "stock": "stock",
};

const getRoute = (table: string): string => tableRouteMap[table] || table;

// Helper to find the numeric ID from an identifier
const findIdByIdentifier = async (table: string, identifier: string | number): Promise<string | number> => {
  if (typeof identifier === 'number' || !isNaN(Number(identifier))) {
    return identifier;
  }
  // It's a non-numeric identifier like "RI-001". Let's fetch all and find the numeric id.
  const res = await storeApi.get(table);
  const list = res.data || [];
  
  // Define identifier keys for tables (which are snake_case as returned by toSnake mapping)
  const identifierKeys: Record<string, string> = {
    "indent": "indent_number",
    "store_in": "lift_number",
    "issue": "issue_no",
    "fullkitting": "indent_number",
    "po_master": "po_number",
    "user": "user_name"
  };
  
  const key = identifierKeys[table];
  if (!key) return identifier;
  
  const found = list.find((item: any) => String(item[key]).trim() === String(identifier).trim());
  return found ? found.id : identifier;
};

// Recursive converters for snake_case <-> camelCase
export const toCamel = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamel(v));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      let camelKey = key.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
      // Special mapping exception: user_name -> username
      if (camelKey === 'userName') camelKey = 'username';
      result[camelKey] = toCamel(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

export const toSnake = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnake(v));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      let snakeKey = key.replace(/([A-Z])/g, (match, char, index) => {
        // Avoid prefixing underscore if uppercase is at the beginning
        return (index === 0 ? "" : "_") + match.toLowerCase();
      }).replace(/_+/g, "_"); // Clean up any duplicate underscores
      // Special mapping exception: username -> user_name
      if (snakeKey === 'username') snakeKey = 'user_name';
      result[snakeKey] = toSnake(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      // Ignored: probably an HTML 404 fallback page
    }
    throw new Error(errorMsg);
  }
  const json = await res.json();
  // Convert backend's camelCase response to snake_case for frontend services
  if (json && json.success && json.data) {
    json.data = toSnake(json.data);
  }
  return json;
};

export const storeApi = {
  get: async (table: string) => {
    const res = await fetch(`${API_URL}/refrasynth/${getRoute(table)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(res);
  },
  getOne: async (table: string, id: string | number) => {
    const numericId = await findIdByIdentifier(table, id);
    const res = await fetch(`${API_URL}/refrasynth/${getRoute(table)}/${numericId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(res);
  },
  post: async (table: string, data: any) => {
    // If the data is an array, we handle batch insertion by executing parallel POST requests
    // since the standard backend Prisma controller only creates single records.
    if (Array.isArray(data)) {
      const results = await Promise.all(data.map(async (item) => {
        const camelData = toCamel(item);
        const res = await fetch(`${API_URL}/refrasynth/${getRoute(table)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(camelData),
        });
        const json = await handleResponse(res);
        return json.data;
      }));
      return { success: true, data: results };
    }

    const camelData = toCamel(data);
    const res = await fetch(`${API_URL}/refrasynth/${getRoute(table)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(camelData),
    });
    return handleResponse(res);
  },
  patch: async (table: string, id: string | number, data: any) => {
    // Resolve identifier to DB numeric ID first
    const numericId = await findIdByIdentifier(table, id);
    // Convert frontend's snake_case payload to camelCase for backend Prisma
    const camelData = toCamel(data);
    const res = await fetch(`${API_URL}/refrasynth/${getRoute(table)}/${numericId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(camelData),
    });
    return handleResponse(res);
  },
  delete: async (table: string, id: string | number) => {
    // Resolve identifier to DB numeric ID first
    const numericId = await findIdByIdentifier(table, id);
    const res = await fetch(`${API_URL}/refrasynth/${getRoute(table)}/${numericId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(res);
  },
  upload: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    });
    // Custom handling for upload response which doesn't wrap in success/data
    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }
    const json = await res.json();
    return json.url || json.data?.url || '';
  }
};
