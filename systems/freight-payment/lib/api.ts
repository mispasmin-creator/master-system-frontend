import { API_URL, getToken } from "@/lib/auth";

const tableRouteMap: Record<string, string> = {
  "entry": "entry",
  "kitting": "kitting",
  "audit": "audit",
  "posting": "posting",
  "release": "release",
  "dashboard": "dashboard",
};

const getRoute = (table: string): string => tableRouteMap[table] || table;

// Recursive converters for snake_case <-> camelCase
export const toCamel = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamel(v));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      let camelKey = key.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
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
      let snakeKey = key.replace(/([A-Z0-9])/g, (match, char, index) => {
        return (index === 0 ? "" : "_") + match.toLowerCase();
      }).replace(/_+/g, "_");
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
      // Ignored
    }
    throw new Error(errorMsg);
  }
  const json = await res.json();
  if (json && json.success && json.data) {
    json.data = toSnake(json.data);
  }
  return json;
};

export const freightPaymentApi = {
  get: async (table: string) => {
    const res = await fetch(`${API_URL}/freightpayment/${getRoute(table)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(res);
  },
  getOne: async (table: string, id: string | number) => {
    const res = await fetch(`${API_URL}/freightpayment/${getRoute(table)}/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(res);
  },
  post: async (table: string, data: any) => {
    if (Array.isArray(data)) {
      const results = await Promise.all(data.map(async (item) => {
        const camelData = toCamel(item);
        const res = await fetch(`${API_URL}/freightpayment/${getRoute(table)}`, {
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
    const res = await fetch(`${API_URL}/freightpayment/${getRoute(table)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(camelData),
    });
    return handleResponse(res);
  },
  patch: async (table: string, id: string | number, action: string, data?: any) => {
    const camelData = data ? toCamel(data) : {};
    const res = await fetch(`${API_URL}/freightpayment/${getRoute(table)}/${id}/${action}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(camelData),
    });
    return handleResponse(res);
  },
  getDispatchInfo: async (liftId: string) => {
    const res = await fetch(`${API_URL}/freightpayment/entry/dispatch-lookup/${encodeURIComponent(liftId)}`, {
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
    if (!res.ok) throw new Error('File upload failed');
    const json = await res.json();
    return json.url || json.fileUrl || json.path || '';
  },
};
