const desktopUrl = process.env.NEXT_PUBLIC_DESKTOP_URL || 'http://127.0.0.1:5174';

export function buildDesktopAuthRedirect(params?: {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
}) {
  const target = new URL(desktopUrl);

  if (params?.accessToken && params.refreshToken) {
    target.searchParams.set('access_token', params.accessToken);
    target.searchParams.set('refresh_token', params.refreshToken);
  } else if (params?.code) {
    target.searchParams.set('code', params.code);
  }

  return target.toString();
}

export function redirectToDesktop(params?: {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
}) {
  const url = buildDesktopAuthRedirect(params);
  window.location.href = url;
}
