import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function read(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

/** Public practice targets. Override them with a local .env file. */
export const env = {
  baseURL: read('BASE_URL', 'https://www.saucedemo.com'),
  apiBaseURL: read('API_BASE_URL', 'https://restful-booker.herokuapp.com'),
  apiUsername: read('API_USERNAME', 'admin'),
  apiPassword: read('API_PASSWORD', 'password123'),
} as const;
