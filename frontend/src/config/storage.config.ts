// Demo-only storage config - simplified for demo purposes
// Tokens are now session-based and generated dynamically

// This will be set when the demo session is created
let currentDemoToken: string | null = null;

export const setDemoToken = (token: string) => {
  currentDemoToken = token;
};

export const getDemoToken = (): string | null => {
  return currentDemoToken;
};

export const clearDemoToken = () => {
  currentDemoToken = null;
};