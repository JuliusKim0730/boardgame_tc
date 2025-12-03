/**
 * 안전한 localStorage/sessionStorage 접근 유틸리티
 * iframe, 시크릿 모드, 서드파티 쿠키 차단 등의 환경에서도 에러 없이 동작
 */

export function getSafeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null; // SSR 대비
  
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (e) {
    console.warn("LocalStorage is not available in this context:", e);
    return null;
  }
}

export function getSafeSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null; // SSR 대비
  
  try {
    const testKey = "__storage_test__";
    window.sessionStorage.setItem(testKey, "1");
    window.sessionStorage.removeItem(testKey);
    return window.sessionStorage;
  } catch (e) {
    console.warn("SessionStorage is not available in this context:", e);
    return null;
  }
}

/**
 * 안전하게 localStorage에서 값 가져오기
 */
export function safeGetItem(key: string): string | null {
  const storage = getSafeLocalStorage();
  if (!storage) return null;
  
  try {
    return storage.getItem(key);
  } catch (e) {
    console.warn(`Failed to get item "${key}" from localStorage:`, e);
    return null;
  }
}

/**
 * 안전하게 localStorage에 값 저장하기
 */
export function safeSetItem(key: string, value: string): boolean {
  const storage = getSafeLocalStorage();
  if (!storage) return false;
  
  try {
    storage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`Failed to set item "${key}" in localStorage:`, e);
    return false;
  }
}

/**
 * 안전하게 localStorage에서 값 삭제하기
 */
export function safeRemoveItem(key: string): boolean {
  const storage = getSafeLocalStorage();
  if (!storage) return false;
  
  try {
    storage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`Failed to remove item "${key}" from localStorage:`, e);
    return false;
  }
}

/**
 * 안전하게 localStorage 전체 비우기
 */
export function safeClear(): boolean {
  const storage = getSafeLocalStorage();
  if (!storage) return false;
  
  try {
    storage.clear();
    return true;
  } catch (e) {
    console.warn("Failed to clear localStorage:", e);
    return false;
  }
}
