import { useRouter, usePathname, useSegments } from 'expo-router';
import { useCallback } from 'react';

/**
 * Hook for handling login redirects with return URL support
 * After successful login, users will be redirected back to the page they came from
 */
export function useLoginRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();

  /**
   * Navigate to login page with optional return URL
   * @param returnUrl - Custom return URL (defaults to current page)
   */
  const goToLogin = useCallback((returnUrl?: string) => {
    // Determine the return URL
    const redirect = returnUrl || pathname || '/';
    
    // Don't redirect back to login page itself
    if (redirect === '/login' || redirect === '/register') {
      router.push('/login');
      return;
    }
    
    // Navigate to login with redirect parameter
    router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
  }, [router, pathname]);

  /**
   * Replace current page with login (for protected routes)
   * @param returnUrl - Custom return URL (defaults to current page)
   */
  const replaceWithLogin = useCallback((returnUrl?: string) => {
    const redirect = returnUrl || pathname || '/';
    
    if (redirect === '/login' || redirect === '/register') {
      router.replace('/login');
      return;
    }
    
    router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
  }, [router, pathname]);

  return {
    goToLogin,
    replaceWithLogin,
    currentPath: pathname,
  };
}

export default useLoginRedirect;
