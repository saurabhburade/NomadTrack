import Constants from "expo-constants";
import { TokenResponse, type TokenResponseConfig } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const tokenKey = "google_drive_access_token";
const googleDriveScopes = ["openid", "email", "profile", "https://www.googleapis.com/auth/drive.file"];

export class GoogleLoginRequiredError extends Error {
  constructor(message = "Please log in with Google. Backup won't work unless Google Drive is connected.") {
    super(message);
    this.name = "GoogleLoginRequiredError";
  }
}

function hasValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function getGoogleDriveAuthSetup() {
  const extra = Constants.expoConfig?.extra ?? {};
  const executionEnvironment = Constants.executionEnvironment;
  const isExpoGo = executionEnvironment === "storeClient";
  const hasIosClientId = hasValue(extra.googleIosClientId);
  const hasIosUrlScheme = hasValue(extra.googleIosUrlScheme);
  const hasAndroidClientId = hasValue(extra.googleAndroidClientId);
  const hasWebClientId = hasValue(extra.googleWebClientId);
  const hasPlatformClient =
    Platform.OS === "ios"
      ? hasIosClientId && hasIosUrlScheme
      : Platform.OS === "android"
        ? hasAndroidClientId
        : Platform.OS === "web"
          ? hasWebClientId
          : false;

  return {
    isExpoGo,
    executionEnvironment,
    hasIosClientId,
    hasIosUrlScheme,
    hasAndroidClientId,
    hasWebClientId,
    canUseGoogleAuth: !isExpoGo && hasPlatformClient
  };
}

export function useGoogleDriveAuthRequest() {
  const extra = Constants.expoConfig?.extra ?? {};
  const googleIosUrlScheme = extra.googleIosUrlScheme;
  const nativeRedirectUri = hasValue(googleIosUrlScheme) ? `${googleIosUrlScheme}:/oauthredirect` : undefined;

  return Google.useAuthRequest(
    {
      iosClientId: extra.googleIosClientId as string | undefined,
      androidClientId: extra.googleAndroidClientId as string | undefined,
      webClientId: extra.googleWebClientId as string | undefined,
      scopes: googleDriveScopes,
      extraParams: {
        access_type: "offline",
        include_granted_scopes: "true",
        prompt: "consent"
      }
    },
    nativeRedirectUri ? { native: nativeRedirectUri } : undefined
  );
}

export async function storeGoogleTokenResponse(tokenResponse: TokenResponse) {
  const existingToken = await readStoredGoogleToken();
  await storeGoogleTokenConfig({
    ...tokenResponse.getRequestConfig(),
    refreshToken: tokenResponse.refreshToken ?? existingToken?.refreshToken
  });
}

export async function getGoogleAccessToken() {
  const storedToken = await readStoredGoogleToken();
  if (!storedToken || !isDurableTokenShape(storedToken)) return null;

  const token = new TokenResponse(storedToken);
  if (hasExpiryMetadata(storedToken) && TokenResponse.isTokenFresh(token)) return token.accessToken;
  if (!token.refreshToken) return null;

  const clientId = getGoogleDriveClientId();
  if (!clientId) return null;

  try {
    await token.refreshAsync({ clientId, scopes: googleDriveScopes }, Google.discovery);
    await storeGoogleTokenConfig(token.getRequestConfig());
    return token.accessToken;
  } catch (error) {
    console.warn(`[google-auth] Token refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    await clearGoogleAccessToken();
    return null;
  }
}

export async function clearGoogleAccessToken() {
  await SecureStore.deleteItemAsync(tokenKey);
}

export async function getGoogleDriveConnectionState() {
  const storedToken = await readStoredGoogleToken();
  if (!storedToken) {
    return {
      isConnected: false,
      needsLogin: true,
      hasRefreshToken: false,
      expiresAt: undefined as string | undefined
    };
  }

  const hasRefreshToken = hasValue(storedToken.refreshToken);
  const token = isDurableTokenShape(storedToken) ? new TokenResponse(storedToken) : null;
  const isFresh = token && hasExpiryMetadata(storedToken) ? TokenResponse.isTokenFresh(token) : false;
  const expiresAt =
    hasExpiryMetadata(storedToken)
      ? new Date((storedToken.issuedAt + storedToken.expiresIn) * 1000).toISOString()
      : undefined;
  const isConnected = hasRefreshToken || isFresh;

  return {
    isConnected,
    needsLogin: !isConnected,
    hasRefreshToken,
    expiresAt
  };
}

export function assertGoogleAccessToken(accessToken: string | null): asserts accessToken is string {
  if (!accessToken) throw new GoogleLoginRequiredError();
}

function getGoogleDriveClientId() {
  const extra = Constants.expoConfig?.extra ?? {};
  const clientId =
    Platform.OS === "ios"
      ? extra.googleIosClientId
      : Platform.OS === "android"
        ? extra.googleAndroidClientId
        : Platform.OS === "web"
          ? extra.googleWebClientId
          : undefined;
  return hasValue(clientId) ? clientId : undefined;
}

async function storeGoogleTokenConfig(tokenConfig: TokenResponseConfig) {
  await SecureStore.setItemAsync(tokenKey, JSON.stringify(tokenConfig));
}

async function readStoredGoogleToken(): Promise<TokenResponseConfig | null> {
  const rawToken = await SecureStore.getItemAsync(tokenKey);
  if (!rawToken) return null;

  try {
    const parsed = JSON.parse(rawToken) as unknown;
    if (isTokenResponseConfig(parsed)) return parsed;
  } catch {
    return { accessToken: rawToken };
  }

  return null;
}

function isTokenResponseConfig(value: unknown): value is TokenResponseConfig {
  return typeof value === "object" && value !== null && hasValue((value as { accessToken?: unknown }).accessToken);
}

function isDurableTokenShape(token: TokenResponseConfig) {
  return Boolean(token.refreshToken || hasExpiryMetadata(token));
}

function hasExpiryMetadata(token: TokenResponseConfig): token is TokenResponseConfig & { expiresIn: number; issuedAt: number } {
  return typeof token.expiresIn === "number" && typeof token.issuedAt === "number";
}
