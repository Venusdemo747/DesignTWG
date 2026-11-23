# 03 — Provider Registration and OAuth 2.0 Setup

## 1. Zoho CRM & Zoho Projects Setup

1. Sign in to the [Zoho API Console](https://api-console.zoho.com/).
2. Click **Add Client** and select **Server-based Applications**.
3. Set **Client Name**: `Design TWG Integration Bus`.
4. Set **Authorized Redirect URI**: `https://localhost:3027/oauth/callback/zoho` (or your registered webhook receiver).
5. Generate Grant Token:
   ```text
   Scope: ZohoCRM.modules.deals.READ,ZohoCRM.modules.contacts.READ,ZohoProjects.projects.READ,ZohoProjects.milestones.READ
   ```
6. Exchange Grant Token for a persistent Refresh Token via HTTP POST:
   ```bash
   curl -X POST https://accounts.zoho.com/oauth/v2/token \
     -d "grant_type=authorization_code" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "redirect_uri=YOUR_REDIRECT_URI" \
     -d "code=YOUR_GRANT_TOKEN"
   ```
7. Store `ZOHO_CRM_CLIENT_ID`, `ZOHO_CRM_CLIENT_SECRET`, and `ZOHO_CRM_REFRESH_TOKEN` in your private `.env` (never commit).

---

## 2. QuickBooks Online (Intuit) Setup

1. Sign in to the [Intuit Developer Portal](https://developer.intuit.com/).
2. Create an App under **Accounting** and enable the **OAuth 2.0** protocol.
3. In App Settings, note your **Client ID**, **Client Secret**, and **Development/Sandbox Realm ID**.
4. Generate initial OAuth tokens using Intuit OAuth Playground:
   - Scopes selected: `com.intuit.quickbooks.accounting` (**Strictly Read-Only**).
5. Set `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_REFRESH_TOKEN`, and `QUICKBOOKS_REALM_ID`.
6. Confirm `QUICKBOOKS_ENVIRONMENT=sandbox` during testing.

---

## 3. Microsoft 365 / Microsoft Graph (Azure AD) Setup

1. Sign in to the [Microsoft Entra ID (Azure AD) Admin Center](https://entra.microsoft.com/).
2. Navigate to **App Registrations** &rarr; **New Registration**.
3. Name: `Design TWG Integration Bus`.
4. Under **Certificates & Secrets**, generate a new **Client Secret**.
5. Under **API Permissions**, add Application permissions for **Microsoft Graph**:
   - `Sites.Read.All`
   - `Files.Read.All`
6. Click **Grant admin consent for Design TWG**.
7. Note your `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, and `MICROSOFT_CLIENT_SECRET`.
