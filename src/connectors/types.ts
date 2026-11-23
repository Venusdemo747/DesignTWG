export type SystemId =
  | "zoho-crm"
  | "zoho-projects"
  | "quickbooks"
  | "microsoft-365";

export type ConnectionStatus =
  | "operational"
  | "degraded"
  | "rate_limited"
  | "disconnected";

export type ConnectionState =
  | "MOCK"
  | "CONFIGURED"
  | "CONNECTED"
  | "FAILED"
  | "NOT_CONFIGURED";

export interface ConnectionTestResult {
  systemId: SystemId;
  systemName: string;
  state: ConnectionState;
  isLiveVerified: boolean;
  latencyMs: number;
  message: string;
  checkedAt: string;
  endpoint: string;
  missingCredentials: string[];
  requiredScopes: string[];
  isReadOnly: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

export interface SystemHealthInfo {
  id: SystemId;
  name: string;
  category: "CRM" | "Project Management" | "Accounting & ERP" | "Collaboration & Documents";
  status: ConnectionStatus;
  connectionState: ConnectionState;
  isLiveVerified: boolean;
  latencyMs: number;
  lastCheckedAt: string;
  lastSuccessfulSyncAt?: string;
  tokenExpiresInHours: number;
  quotaUsed: number;
  quotaLimit: number;
  activeRecordsCount: number;
  endpoint: string;
  simulated: boolean;
  isReadOnly: boolean;
  supportedOperations: string[];
  requiredScopes: string[];
  missingCredentials: string[];
  notes: string;
}

export interface ConnectorResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  latencyMs: number;
  timestamp: string;
  isLive: boolean;
}

export interface BaseConnector {
  readonly id: SystemId;
  readonly name: string;
  readonly isReadOnly: boolean;
  getConnectionState(): ConnectionState;
  getRequiredScopes(): string[];
  getMissingCredentials(): string[];
  checkHealth(): Promise<SystemHealthInfo>;
  testConnection(): Promise<ConnectionTestResult>;
}
