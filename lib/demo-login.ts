export const DEMO_LOGIN_USERNAME = "zgrh001";
export const DEMO_LOGIN_SESSION_KEY = "phytochemistry-demo-authenticated";
export const DEMO_LOGIN_TRANSITION_MS = 1000;

const DEMO_LOGIN_PASSWORD = "abc123456";

export function validateDemoCredentials(username: string, password: string) {
  return username.trim() === DEMO_LOGIN_USERNAME && password === DEMO_LOGIN_PASSWORD;
}
