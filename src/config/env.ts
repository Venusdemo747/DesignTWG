import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.string().optional(),
  RUN_LIVE_TESTS: z.string().optional(),

  // Zoho CRM
  ZOHO_CRM_CLIENT_ID: z.string().optional(),
  ZOHO_CRM_CLIENT_SECRET: z.string().optional(),
  ZOHO_CRM_REFRESH_TOKEN: z.string().optional(),
  ZOHO_CRM_API_DOMAIN: z.string().optional().default("https://www.zohoapis.com/crm/v2"),
  ZOHO_CRM_ACCOUNTS_URL: z.string().optional().default("https://accounts.zoho.com"),

  // Zoho Projects
  ZOHO_PROJECTS_CLIENT_ID: z.string().optional(),
  ZOHO_PROJECTS_CLIENT_SECRET: z.string().optional(),
  ZOHO_PROJECTS_REFRESH_TOKEN: z.string().optional(),
  ZOHO_PROJECTS_API_DOMAIN: z.string().optional().default("https://projectsapi.zoho.com/restapi"),
  ZOHO_PROJECTS_PORTAL_ID: z.string().optional(),

  // QuickBooks Online (Strictly Read-Only)
  QUICKBOOKS_CLIENT_ID: z.string().optional(),
  QUICKBOOKS_CLIENT_SECRET: z.string().optional(),
  QUICKBOOKS_REFRESH_TOKEN: z.string().optional(),
  QUICKBOOKS_REALM_ID: z.string().optional(),
  QUICKBOOKS_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),

  // Microsoft 365 / Graph (SharePoint, Teams, OneDrive)
  MICROSOFT_TENANT_ID: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_SHAREPOINT_SITE_ID: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): EnvConfig {
  const result = envSchema.safeParse(input);

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration: ${result.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`,
    );
  }

  return result.data;
}
