/**
 * Lightweight version check utility for multi-tab data conflict detection.
 * Before saving, check if the server-side `updated_at` is newer than the local copy.
 */

import { toast } from 'sonner';

interface VersionedRecord {
  id: string;
  updated_at?: string | null;
}

/**
 * Check if a record has been updated since the local copy was loaded.
 * Returns true if conflict detected (server is newer), false if safe to save.
 */
export async function checkVersionConflict(
  authFetch: (url: string, init?: RequestInit) => Promise<Response>,
  apiPath: string,
  localRecord: VersionedRecord,
  localUpdatedAt: string | null | undefined,
): Promise<boolean> {
  if (!localRecord.id || !localUpdatedAt) {
    // No existing record or no timestamp, safe to proceed (new record or first save)
    return false;
  }

  try {
    const res = await authFetch(`${apiPath}?id=${localRecord.id}`);
    if (!res.ok) return false; // Can't check, allow save
    const data = await res.json();
    const serverRecord = Array.isArray(data?.data) ? data.data[0] : data?.data;
    if (!serverRecord?.updated_at) return false;

    const serverTime = new Date(serverRecord.updated_at).getTime();
    const localTime = new Date(localUpdatedAt).getTime();

    if (serverTime > localTime) {
      // Conflict detected - ask user
      return new Promise((resolve) => {
        const overwrite = confirm(
          '数据已被其他操作更新，是否覆盖？\n点击"确定"覆盖，点击"取消"放弃本次修改'
        );
        resolve(!overwrite); // true = conflict blocking, false = user chose to overwrite
      });
    }
    return false; // No conflict
  } catch {
    // Can't check version, allow save
    return false;
  }
}

/**
 * Show a generic conflict warning toast (for batch operations where confirm is too heavy)
 */
export function showConflictToast() {
  toast.error('数据已被其他操作更新，请刷新页面后重试');
}
