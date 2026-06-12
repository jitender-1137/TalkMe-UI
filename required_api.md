# TalkMe — Complete Backend API Specification

**Version:** 1.0.0  
**Base URL:** `https://api.talkme.app/api/v1`  
**Protocol:** HTTPS + WSS  
**Content-Type:** `application/json` (unless otherwise noted)

---

## Table of Contents

1. [Standard Response Envelope](#standard-response-envelope)
2. [Pagination Standards](#pagination-standards)
3. [File Upload Standards](#file-upload-standards)
4. [Validation Rules](#validation-rules)
5. [Authentication APIs](#1-authentication-apis)
6. [User Profile APIs](#2-user-profile-apis)
7. [Contact APIs](#3-contact-apis)
8. [Chat APIs](#4-chat-apis)
9. [Message APIs](#5-message-apis)
10. [Message Attachment APIs](#6-message-attachment-apis)
11. [Group APIs](#7-group-apis)
12. [Presence APIs](#8-presence-apis)
13. [Notification APIs](#9-notification-apis)
14. [Status / Stories APIs](#10-status--stories-apis)
15. [Feed APIs](#11-feed-apis)
16. [Discover APIs](#12-discover-apis)
17. [Friend / Contact Request APIs](#13-friend--contact-request-apis)
18. [Random Match APIs](#14-random-match-apis)
19. [Search APIs](#15-search-apis)
20. [Settings APIs](#16-settings-apis)
21. [Call APIs](#17-call-apis)
22. [Guest Mode APIs](#18-guest-mode-apis)
23. [Admin APIs](#19-admin-apis)
24. [WebSocket API](#20-websocket-api)
25. [Data Models](#21-data-models)

---

## Standard Response Envelope

Every REST response wraps its payload in this envelope.

```ts
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string; // ISO 8601
}

interface ApiError {
  success: false;
  message: string;
  error: {
    code: string;        // e.g. "INVALID_CREDENTIALS"
    details?: unknown;   // field-level validation errors
  };
  timestamp: string;
}
```

---

## Pagination Standards

All list endpoints that may return large datasets support cursor-based pagination.

### Query Parameters

```ts
interface PaginationQuery {
  cursor?: string;   // opaque cursor from previous response
  limit?: number;    // default: 20, max: 100
  // Legacy offset-based (used for admin endpoints only)
  page?: number;
  size?: number;
}
```

### Paginated Response

```ts
interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    cursor: string | null;     // cursor to fetch next page
    hasNext: boolean;
    hasPrevious: boolean;
    total?: number;            // total count (expensive, omit unless needed)
  };
}
```

---

## File Upload Standards

### Multipart Upload (direct)

```http
POST /api/v1/uploads
Content-Type: multipart/form-data

file: <binary>
type: "image" | "video" | "audio" | "document"
chatId?: string   // optional — associate with a chat for cleanup
```

### Limits

| Type     | Max Size | Allowed Formats                          |
|----------|----------|------------------------------------------|
| Image    | 16 MB    | jpg, jpeg, png, webp, gif, heic          |
| Video    | 64 MB    | mp4, mov, avi, webm                      |
| Audio    | 16 MB    | mp3, ogg, m4a, wav, opus, aac            |
| Document | 100 MB   | pdf, doc, docx, xls, xlsx, ppt, pptx, txt, zip |
| Avatar   | 5 MB     | jpg, jpeg, png, webp                     |

### Upload Response

```ts
interface UploadResponse {
  url: string;
  thumbnail?: string;   // auto-generated for images and videos
  fileName: string;
  fileSize: number;     // bytes
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;    // seconds, for audio/video
}
```

---

## Validation Rules

| Field        | Rule                                                                 |
|--------------|----------------------------------------------------------------------|
| username     | 3–30 chars, alphanumeric + underscores, no spaces                    |
| email        | RFC 5322 format                                                      |
| password     | 6–128 chars, at least one letter and one digit                       |
| name         | 1–60 chars                                                           |
| bio          | max 300 chars                                                        |
| group name   | 1–100 chars                                                          |
| message text | 1–4096 chars                                                         |
| image upload | max 16 MB                                                            |
| video upload | max 64 MB                                                            |
| audio upload | max 16 MB                                                            |
| doc upload   | max 100 MB                                                           |
| age          | integer 18–99                                                        |
| phone        | E.164 format (+15551234567)                                          |

---

## 1. Authentication APIs

### Authentication Architecture

TalkMe uses a secure JWT-based authentication system with the following components:

| Component | Storage | Lifetime | Purpose |
|-----------|---------|----------|---------|
| **Access Token** | Memory only (never localStorage) | 15 minutes | Bearer token for API authorization |
| **Refresh Token** | HTTP-only, Secure, SameSite=Strict cookie | 30 days (7 days for guests) | Silent token refresh |
| **CSRF Token** | Non-HttpOnly cookie (readable by JS) | Per-session | Prevent CSRF attacks on state-changing requests |

### Security Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. LOGIN / SIGNUP                                                           │
│     ┌──────────┐         POST /auth/login          ┌──────────┐             │
│     │  Client  │ ─────────────────────────────────▶│  Server  │             │
│     │          │   { email, password }             │          │             │
│     │          │                                   │          │             │
│     │          │◀───────────────────────────────── │          │             │
│     │          │   Response Body:                  │          │             │
│     │          │   • accessToken                   │          │             │
│     │          │   • expiresIn                     │          │             │
│     │          │                                   │          │             │
│     │          │   Response Cookies (Set-Cookie):  │          │             │
│     │          │   • refreshToken (HttpOnly)       │          │             │
│     │          │   • csrf_token (non-HttpOnly)     │          │             │
│     └──────────┘                                   └──────────┘             │
│                                                                              │
│  2. AUTHENTICATED REQUESTS                                                   │
│     ┌──────────┐       Any API Request             ┌──────────┐             │
│     │  Client  │ ─────────────────────────────────▶│  Server  │             │
│     │          │   Headers:                        │          │             │
│     │          │   • Authorization: Bearer <token> │          │             │
│     │          │   • X-CSRF-Token: <csrf>          │          │             │
│     │          │                                   │          │             │
│     │          │   Cookies (automatic):            │          │             │
│     │          │   • refreshToken                  │          │             │
│     │          │   • csrf_token                    │          │             │
│     └──────────┘                                   └──────────┘             │
│                                                                              │
│  3. TOKEN REFRESH (automatic on 401)                                         │
│     ┌──────────┐       POST /auth/refresh          ┌──────────┐             │
│     │  Client  │ ─────────────────────────────────▶│  Server  │             │
│     │          │   Cookies: refreshToken, csrf     │          │             │
│     │          │                                   │          │             │
│     │          │◀───────────────────────────────── │          │             │
│     │          │   Response Body:                  │          │             │
│     │          │   • New accessToken               │          │             │
│     │          │   • expiresIn                     │          │             │
│     │          │                                   │          │             │
│     │          │   Response Cookies (Set-Cookie):  │          │             │
│     │          │   • New refreshToken (rotated)    │          │             │
│     │          │   • New csrf_token                │          │             │
│     └──────────┘                                   └──────────┘             │
│                                                                              │
│  4. LOGOUT                                                                   │
│     ┌──────────┐       POST /auth/logout           ┌──────────┐             │
│     │  Client  │ ─────────────────────────────────▶│  Server  │             │
│     │          │                                   │          │             │
│     │          │◀───────────────────────────────── │          │             │
│     │          │   Clear cookies:                  │          │             │
│     │          │   • refreshToken (Max-Age=0)      │          │             │
│     │          │   • csrf_token (Max-Age=0)        │          │             │
│     │          │   • Invalidate session in DB      │          │             │
│     └──────────┘                                   └──────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Token Details

#### Access Token (JWT)
```ts
// Header
{ "alg": "RS256", "typ": "JWT" }

// Payload
{
  "sub": "user_id",           // User ID
  "email": "user@example.com",
  "name": "John Doe",
  "isGuest": false,
  "iat": 1234567890,          // Issued at
  "exp": 1234568790,          // Expires at (15 min from iat)
  "jti": "unique_token_id"    // JWT ID for revocation
}
```

#### Refresh Token Cookie
```http
Set-Cookie: refreshToken=<opaque_token>; 
  HttpOnly; 
  Secure; 
  SameSite=Strict; 
  Path=/api/v1/auth; 
  Max-Age=2592000
```

#### CSRF Token Cookie
```http
Set-Cookie: csrf_token=<random_token>; 
  Secure; 
  SameSite=Strict; 
  Path=/; 
  Max-Age=2592000
```

**Note:** The CSRF token cookie is **NOT HttpOnly** so JavaScript can read it via `document.cookie` and send it as the `X-CSRF-Token` header on state-changing requests.

- Generated per session using cryptographically secure random bytes
- Must be included in `X-CSRF-Token` header for: POST, PUT, PATCH, DELETE
- Server validates CSRF token header matches the csrf_token cookie value
- Returns `403 CSRF_TOKEN_INVALID` on mismatch

---

### 1.1 Login

#### Endpoint
```http
POST /api/v1/auth/login
```

#### Description
Authenticate with email and password. Returns access token in response body. Sets refresh token and CSRF token as cookies.

#### Authentication Required
```text
No
```

#### Request Body
```ts
{
  email: string;
  password: string;
  rememberMe?: boolean;  // If true, refresh token lasts 30 days; otherwise 7 days
}
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    user: AuthUser;
    tokens: {
      accessToken: string;   // JWT, store in memory only
      expiresIn: number;     // seconds (900 = 15 min)
    };
  };
}
```

#### Response Cookies
```http
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000
Set-Cookie: csrf_token=<token>; Secure; SameSite=Strict; Path=/; Max-Age=2592000
```

#### Error Responses
```text
400 — Validation error (missing fields)
401 — Invalid credentials (INVALID_CREDENTIALS)
403 — Account suspended (ACCOUNT_SUSPENDED)
423 — Account locked due to too many failed attempts (ACCOUNT_LOCKED)
429 — Too many login attempts (RATE_LIMITED)
500 — Server error
```

#### Frontend Components
- `LoginModal`
- `AuthContext` (`login()`)
- `src/api/services/auth.service.ts`

---

### 1.2 Signup

#### Endpoint
```http
POST /api/v1/auth/signup
```

#### Description
Create a new account. Returns tokens same as login. Sends a verification email.

#### Authentication Required
```text
No
```

#### Request Body
```ts
{
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}
```

#### Success Response `201`
```ts
{
  success: true;
  data: {
    user: AuthUser;
    tokens: {
      accessToken: string;
      expiresIn: number;
    };
  };
}
```

#### Response Cookies
```http
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000
Set-Cookie: csrf_token=<token>; Secure; SameSite=Strict; Path=/; Max-Age=2592000
```

#### Error Responses
```text
400 — Validation error (PASSWORD_TOO_WEAK, INVALID_EMAIL)
409 — Email already registered (EMAIL_EXISTS)
429 — Rate limited
500 — Server error
```

#### Frontend Components
- `SignupModal`
- `AuthContext` (`signup()`)

---

### 1.3 Logout

#### Endpoint
```http
POST /api/v1/auth/logout
```

#### Description
Invalidate the current session. Server clears the refresh token cookie and invalidates the session in the database.

#### Authentication Required
```text
Yes — Bearer token + CSRF token
```

#### Request Headers
```http
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
Cookie: refreshToken=<token>
```

#### Success Response `200`
```ts
{ "success": true, "message": "Logged out successfully" }
```

#### Response Cookies
```http
Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=0
Set-Cookie: csrf_token=; Secure; SameSite=Strict; Path=/; Max-Age=0
```

#### Error Responses
```text
401 — Unauthorized
403 — CSRF token invalid
500 — Server error
```

#### Frontend Components
- `AuthContext` (`logout()`)
- `DesktopSidebar` (logout button)
- `SettingsPage` (logout button)

---

### 1.4 Refresh Token

#### Endpoint
```http
POST /api/v1/auth/refresh
```

#### Description
Use the HTTP-only refresh token cookie to obtain a new access token. Also rotates the refresh token (issues new one, invalidates old). Called automatically by the API client on 401 responses.

#### Authentication Required
```text
No — uses HttpOnly cookie
```

#### Request Headers
```http
Cookie: refreshToken=<token>
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    accessToken: string;
    expiresIn: number;
  };
}
```

#### Response Cookies
```http
Set-Cookie: refreshToken=<new_token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000
Set-Cookie: csrf_token=<new_token>; Secure; SameSite=Strict; Path=/; Max-Age=2592000
```

#### Error Responses
```text
401 — Refresh token invalid, expired, or revoked (SESSION_EXPIRED)
403 — Refresh token reuse detected (potential theft) — all sessions revoked (TOKEN_REUSE_DETECTED)
500 — Server error
```

#### Security Notes
- **Token Rotation**: Each refresh issues a new refresh token and invalidates the previous one
- **Reuse Detection**: If an old (already-rotated) refresh token is used, all user sessions are invalidated as a security measure
- **Proactive Refresh**: Frontend should refresh tokens before expiry (e.g., at 80% of lifetime)

#### Frontend Components
- `src/api/client.ts` (axios interceptor — automatic silent refresh)
- `AuthContext` (proactive refresh interval)

---

### 1.5 Get Current User

#### Endpoint
```http
GET /api/v1/auth/me
```

#### Description
Return the profile of the currently authenticated user.

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: AuthUser;
}
```

#### Error Responses
```text
401 — Unauthorized
```

#### Frontend Components
- `AuthContext` (bootstrap on app load)
- `useMe` hook

---

### 1.7 List Active Sessions

#### Endpoint
```http
GET /api/v1/auth/sessions
```

#### Description
List all active sessions for the current user. Useful for "logged in devices" UI.

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    sessions: Session[];
  };
}
```

#### Session Model
```ts
interface Session {
  id: string;
  userId: string;
  userAgent: string;       // "Chrome 120.0 on Windows 11"
  ipAddress: string;       // "192.168.1.1"
  location?: string;       // "San Francisco, CA" (geo-IP lookup)
  lastActiveAt: string;    // ISO 8601
  createdAt: string;
  isCurrent: boolean;      // true if this is the requesting session
}
```

#### Frontend Components
- `SettingsPage` (security section)
- `useSessions` hook

---

### 1.8 Revoke Session

#### Endpoint
```http
DELETE /api/v1/auth/sessions/:sessionId
```

#### Description
Revoke a specific session (log out that device).

#### Authentication Required
```text
Yes — Bearer token + CSRF token
```

#### Path Parameters
```text
sessionId: string — The session ID to revoke
```

#### Success Response `200`
```ts
{ "success": true, "message": "Session revoked" }
```

#### Error Responses
```text
401 — Unauthorized
403 — CSRF token invalid
404 — Session not found
```

#### Frontend Components
- `SettingsPage` (security section)
- `useRevokeSession` hook

---

### 1.9 Revoke All Other Sessions

#### Endpoint
```http
POST /api/v1/auth/sessions/revoke-all
```

#### Description
Revoke all sessions except the current one. Useful for "log out everywhere else" functionality.

#### Authentication Required
```text
Yes — Bearer token + CSRF token
```

#### Success Response `200`
```ts
{ "success": true, "message": "All other sessions revoked", "data": { "revokedCount": 3 } }
```

#### Frontend Components
- `SettingsPage` (security section)
- `useRevokeAllSessions` hook

---

### 1.10 Forgot Password

#### Endpoint
```http
POST /api/v1/auth/forgot-password
```

#### Description
Send a password reset link to the provided email address.

#### Authentication Required
```text
No
```

#### Request Body
```ts
{ email: string; }
```

#### Success Response `200`
```ts
{ "success": true, "message": "Reset link sent if account exists" }
```

#### Error Responses
```text
400 — Invalid email format
429 — Rate limited
```

#### Security Notes
- Always returns success even if email doesn't exist (prevents email enumeration)
- Rate limit: 3 requests per email per hour

#### Frontend Components
- `ProfileContent` (forgot password form)
- `SettingsPage` (forgot password form)

---

### 1.11 Reset Password

#### Endpoint
```http
POST /api/v1/auth/reset-password
```

#### Description
Set a new password using the one-time token received via email.

#### Authentication Required
```text
No
```

#### Request Body
```ts
{
  token: string;
  password: string;
  confirmPassword: string;
}
```

#### Success Response `200`
```ts
{ "success": true, "message": "Password updated" }
```

#### Error Responses
```text
400 — Validation error or passwords do not match
401 — Token invalid or expired (RESET_TOKEN_INVALID)
```

#### Security Notes
- Token expires in 1 hour
- Token is single-use
- All existing sessions are revoked after password reset

#### Frontend Components
- Reset password page (linked from email)

---

### 1.12 Change Password

#### Endpoint
```http
POST /api/v1/auth/change-password
```

#### Description
Change password for an authenticated user who knows their current password.

#### Authentication Required
```text
Yes — Bearer token + CSRF token
```

#### Request Body
```ts
{
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
```

#### Success Response `200`
```ts
{ "success": true, "message": "Password changed" }
```

#### Error Responses
```text
400 — Validation error (PASSWORD_TOO_WEAK, PASSWORDS_DONT_MATCH)
401 — Current password incorrect (INCORRECT_PASSWORD)
403 — CSRF token invalid
```

#### Security Notes
- Optionally revoke all other sessions after password change (configurable via query param `?revokeOtherSessions=true`)

#### Frontend Components
- `ProfileContent` (change password form)
- `SettingsPage` (change password form)

---

### 1.13 Verify Email

#### Endpoint
```http
POST /api/v1/auth/verify-email
```

#### Description
Verify email address using the token sent after registration.

#### Authentication Required
```text
No
```

#### Request Body
```ts
{ token: string; }
```

#### Success Response `200`
```ts
{ "success": true, "message": "Email verified" }
```

#### Error Responses
```text
400 — Token missing
401 — Token invalid or expired
```

---

### 1.10 Resend Verification Email

#### Endpoint
```http
POST /api/v1/auth/resend-verification
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{ "success": true, "message": "Verification email sent" }
```

#### Error Responses
```text
400 — Email already verified
429 — Rate limited (max 3 per hour)
```

---

### 1.11 Delete Account

#### Endpoint
```http
DELETE /api/v1/auth/account
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{ password: string; }
```

#### Success Response `200`
```ts
{ "success": true, "message": "Account scheduled for deletion" }
```

#### Error Responses
```text
401 — Wrong password
```

#### Frontend Components
- `SettingsPage` (danger zone section)

---

### 1.12 List Active Sessions

#### Endpoint
```http
GET /api/v1/auth/sessions
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: Array<{
    id: string;
    deviceName: string;
    deviceType: "mobile" | "desktop" | "tablet";
    browser: string;
    os: string;
    ipAddress: string;
    location?: string;
    lastActive: string;
    isCurrent: boolean;
  }>;
}
```

#### Frontend Components
- `SettingsPage` (security / sessions tab)

---

### 1.13 Revoke Session

#### Endpoint
```http
DELETE /api/v1/auth/sessions/{sessionId}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{ "success": true, "message": "Session revoked" }
```

---

## 2. User Profile APIs

### 2.1 Get Own Profile

#### Endpoint
```http
GET /api/v1/users/me
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: User; // see Data Models
}
```

#### Frontend Components
- `ProfileContent`
- `SettingsPage`
- `DesktopSidebar`

---

### 2.2 Update Profile

#### Endpoint
```http
PATCH /api/v1/users/me
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{
  name?: string;
  bio?: string;
  phone?: string;
  age?: number;
  country?: string;
  city?: string;
  interests?: string[];
}
```

#### Success Response `200`
```ts
{
  success: true;
  data: User;
}
```

#### Error Responses
```text
400 — Validation error
401 — Unauthorized
```

#### Frontend Components
- `ProfileContent` (edit form save)
- `SettingsPage` (edit form save)

---

### 2.3 Upload Avatar

#### Endpoint
```http
POST /api/v1/users/me/avatar
Content-Type: multipart/form-data
```

#### Authentication Required
```text
Yes
```

#### Request Body
```text
file: <image binary>  (jpg/png/webp/heic, max 5 MB)
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    avatarUrl: string;
  };
}
```

#### Error Responses
```text
400 — Invalid file type or size
401 — Unauthorized
413 — File too large
```

#### Frontend Components
- `ProfileContent` (camera icon on avatar)
- `SettingsPage` (camera icon on avatar)

---

### 2.4 Remove Avatar

#### Endpoint
```http
DELETE /api/v1/users/me/avatar
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{ "success": true, "message": "Avatar removed" }
```

---

### 2.5 Get User by ID

#### Endpoint
```http
GET /api/v1/users/{userId}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: User;
}
```

#### Error Responses
```text
404 — User not found
```

#### Frontend Components
- `UserProfileModal`
- `DiscoverDashboard` profile modal
- `AllFriends`

---

### 2.6 Search Users

#### Endpoint
```http
GET /api/v1/users/search?q={query}&limit={limit}&cursor={cursor}
```

#### Authentication Required
```text
Yes
```

#### Query Parameters
```ts
{
  q: string;      // min 2 chars
  limit?: number; // default 20
  cursor?: string;
}
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<User>;
}
```

#### Frontend Components
- `DiscoverDashboard` search
- `SecondaryPanel` search
- `AddGroupMember`

---

### 2.7 Block User

#### Endpoint
```http
POST /api/v1/users/{userId}/block
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{ "success": true, "message": "User blocked" }
```

#### Error Responses
```text
404 — User not found
409 — Already blocked
```

#### Frontend Components
- `ChatArea` → `handleBlockContact`
- `MessageContextMenu`
- `ConversationContextMenu`
- `UserProfileModal`

---

### 2.8 Unblock User

#### Endpoint
```http
DELETE /api/v1/users/{userId}/block
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{ "success": true, "message": "User unblocked" }
```

---

### 2.9 Get Blocked Users

#### Endpoint
```http
GET /api/v1/users/blocked
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<BlockedUser>;
}
```

#### Frontend Components
- `SettingsPage` (privacy section)

---

### 2.10 Report User

#### Endpoint
```http
POST /api/v1/users/{userId}/report
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{
  reason: "spam" | "harassment" | "inappropriate_content" | "impersonation" | "other";
  description?: string;
}
```

#### Success Response `201`
```ts
{ "success": true, "message": "Report submitted" }
```

#### Frontend Components
- `UserProfileModal` (more options)
- `StrangerChatHeader` (report button)

---

### 2.11 Update Privacy Settings

#### Endpoint
```http
PATCH /api/v1/settings/privacy
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{
  showLastSeen?: "everyone" | "contacts" | "nobody";
  showOnlineStatus?: "everyone" | "contacts" | "nobody";
  showProfilePhoto?: "everyone" | "contacts" | "nobody";
  readReceipts?: boolean;
  ghostMode?: boolean;
  invisibleMode?: boolean;
  hideLastSeen?: boolean;
}
```

#### Success Response `200`
```ts
{
  success: true;
  data: PrivacySettings;
}
```

#### Frontend Components
- `PresenceSettings` (ghost mode, hide last seen, invisible mode toggles)
- `SettingsPage` (privacy section)

---

## 3. Contact APIs

### 3.1 Get Contact List

#### Endpoint
```http
GET /api/v1/contacts?cursor={cursor}&limit={limit}&q={query}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<Contact>;
}
```

#### Frontend Components
- `AllFriends`
- `SecondaryPanel`
- `useContacts` hook

---

### 3.2 Send Contact Request

#### Endpoint
```http
POST /api/v1/contacts/requests
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{ userId: string; }
```

#### Success Response `201`
```ts
{
  success: true;
  data: {
    requestId: string;
    status: "pending";
  };
}
```

#### Error Responses
```text
404 — Target user not found
409 — Request already sent or already contacts
```

#### Frontend Components
- `DiscoverDashboard` (chat / connect button)
- `DiscoverPeople` (add friend button)

---

### 3.3 Accept Contact Request

#### Endpoint
```http
POST /api/v1/contacts/requests/{requestId}/accept
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: Contact;
}
```

#### Error Responses
```text
404 — Request not found
```

#### Frontend Components
- `FriendRequests` (accept button)

---

### 3.4 Decline Contact Request

#### Endpoint
```http
POST /api/v1/contacts/requests/{requestId}/decline
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{ "success": true }
```

#### Frontend Components
- `FriendRequests` (decline button)

---

### 3.5 Get Pending Contact Requests

#### Endpoint
```http
GET /api/v1/contacts/requests?type=received&cursor={cursor}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<{
    id: string;
    sender: User;
    createdAt: string;
    mutualFriendsCount: number;
  }>;
}
```

#### Frontend Components
- `FriendRequests`
- `FriendsDashboard` (pending count badge)

---

### 3.6 Get Sent Contact Requests

#### Endpoint
```http
GET /api/v1/contacts/requests?type=sent&cursor={cursor}
```

#### Authentication Required
```text
Yes
```

---

### 3.7 Remove Contact

#### Endpoint
```http
DELETE /api/v1/contacts/{contactId}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{ "success": true, "message": "Contact removed" }
```

#### Frontend Components
- `AllFriends` (remove friend button)

---

## 4. Chat APIs

### 4.1 Get Chat List

#### Endpoint
```http
GET /api/v1/chats?filter={filter}&cursor={cursor}&limit={limit}
```

#### Query Parameters
```ts
{
  filter?: "all" | "unread" | "archived" | "pinned" | "muted"; // default: "all"
  cursor?: string;
  limit?: number;
}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<Chat>;
}
```

#### Frontend Components
- `SecondaryPanel`
- `useChats` hook

---

### 4.2 Create Direct Chat

#### Endpoint
```http
POST /api/v1/chats
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{
  participantId: string;
  type: "direct";
}
```

#### Success Response `201`
```ts
{
  success: true;
  data: Chat;
}
```

#### Error Responses
```text
400 — Cannot create chat with yourself
404 — Participant not found
409 — Chat already exists (returns existing chat)
```

#### Frontend Components
- `DiscoverDashboard` (message button)
- `AllFriends` (message button)
- `UserProfileModal` (message button)

---

### 4.3 Get Chat by ID

#### Endpoint
```http
GET /api/v1/chats/{chatId}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: Chat;
}
```

#### Error Responses
```text
403 — Not a participant
404 — Chat not found
```

---

### 4.4 Archive Chat

#### Endpoint
```http
POST /api/v1/chats/{chatId}/archive
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{ "success": true }
```

#### Frontend Components
- `ConversationContextMenu` (archive)

---

### 4.5 Unarchive Chat

#### Endpoint
```http
DELETE /api/v1/chats/{chatId}/archive
```

#### Authentication Required
```text
Yes
```

---

### 4.6 Pin Chat

#### Endpoint
```http
POST /api/v1/chats/{chatId}/pin
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{ "success": true }
```

#### Frontend Components
- `ConversationContextMenu` (pin)

---

### 4.7 Unpin Chat

#### Endpoint
```http
DELETE /api/v1/chats/{chatId}/pin
```

---

### 4.8 Mute Chat

#### Endpoint
```http
POST /api/v1/chats/{chatId}/mute
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{
  duration: number | null; // seconds; null = indefinite
}
```

#### Frontend Components
- `ConversationContextMenu` (mute)
- `ChatArea` → `handleMuteNotifications`
- `ChatHeader` (more menu → mute)

---

### 4.9 Unmute Chat

#### Endpoint
```http
DELETE /api/v1/chats/{chatId}/mute
```

---

### 4.10 Mark Chat as Read

#### Endpoint
```http
POST /api/v1/chats/{chatId}/read
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{ "success": true }
```

#### Frontend Components
- `ChatArea` (on open)
- `ConversationContextMenu` (mark unread)

---

### 4.11 Mark Chat as Unread

#### Endpoint
```http
POST /api/v1/chats/{chatId}/unread
```

#### Frontend Components
- `ConversationContextMenu` (mark unread)

---

### 4.12 Clear Chat

#### Endpoint
```http
DELETE /api/v1/chats/{chatId}/messages
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{ "success": true }
```

#### Frontend Components
- `ChatArea` → `handleClearChat`
- `ChatHeader` (more menu → clear chat)

---

### 4.13 Delete Chat

#### Endpoint
```http
DELETE /api/v1/chats/{chatId}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{ "success": true }
```

#### Frontend Components
- `ConversationContextMenu` (delete)

---

### 4.14 Search Chats

#### Endpoint
```http
GET /api/v1/chats/search?q={query}&cursor={cursor}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<Chat>;
}
```

#### Frontend Components
- `SecondaryPanel` (search bar)

---

## 5. Message APIs

### 5.1 Get Messages

#### Endpoint
```http
GET /api/v1/chats/{chatId}/messages?cursor={cursor}&limit={limit}&direction={direction}
```

#### Query Parameters
```ts
{
  cursor?: string;
  limit?: number;       // default: 30
  direction?: "before" | "after"; // default: "before" (load older)
}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<Message>;
}
```

#### Frontend Components
- `ChatArea` (initial load + infinite scroll)
- `VirtualizedChatList` (load more)
- `useMessages` hook

---

### 5.2 Send Message

#### Endpoint
```http
POST /api/v1/chats/{chatId}/messages
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{
  content: string;
  type?: "text" | "image" | "video" | "audio" | "document" | "sticker";
  replyToId?: string;
  media?: {
    url: string;
    type: "image" | "video" | "audio" | "document";
    fileName?: string;
    fileSize?: string;
    mimeType?: string;
    duration?: number;
    width?: number;
    height?: number;
    thumbnail?: string;
  };
}
```

#### Success Response `201`
```ts
{
  success: true;
  data: Message;
}
```

#### Error Responses
```text
400 — Validation error
403 — Not a participant or user is blocked
404 — Chat not found
```

#### Frontend Components
- `MessageInput` (send button / Enter key)
- `ChatArea` → `handleSend`

---

### 5.3 Edit Message

#### Endpoint
```http
PATCH /api/v1/chats/{chatId}/messages/{messageId}
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{ content: string; }
```

#### Success Response `200`
```ts
{
  success: true;
  data: Message;
}
```

#### Error Responses
```text
403 — Not the message author or edit window expired (>15 min)
404 — Message not found
```

#### Frontend Components
- `MessageContextMenu` (edit option — future)

---

### 5.4 Delete Message

#### Endpoint
```http
DELETE /api/v1/chats/{chatId}/messages/{messageId}
```

#### Authentication Required
```text
Yes
```

#### Query Parameters
```ts
{
  scope: "me" | "everyone"; // "me" = soft delete for self only
}
```

#### Success Response `200`
```ts
{ "success": true }
```

#### Error Responses
```text
403 — Delete for everyone only allowed within 60s for non-admins
404 — Message not found
```

#### Frontend Components
- `MessageContextMenu` (delete)
- `ChatArea` → `handleMessageDelete`

---

### 5.5 React to Message

#### Endpoint
```http
POST /api/v1/chats/{chatId}/messages/{messageId}/reactions
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{ emoji: string; }
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    reactions: Reaction[];
  };
}
```

#### Frontend Components
- `MessageContextMenu` (emoji row)
- `ChatArea` → `handleReactionClick`
- `MessageReactions`

---

### 5.6 Remove Reaction

#### Endpoint
```http
DELETE /api/v1/chats/{chatId}/messages/{messageId}/reactions/{emoji}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: { reactions: Reaction[] };
}
```

#### Frontend Components
- `MessageReactions` (click existing reaction to toggle off)
- `ChatArea` → `handleReactionClick` (toggle)

---

### 5.7 Forward Message

#### Endpoint
```http
POST /api/v1/chats/{chatId}/messages/{messageId}/forward
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{ targetChatIds: string[]; }
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    forwarded: number; // count of successfully forwarded copies
  };
}
```

#### Frontend Components
- `MessageContextMenu` (forward)

---

### 5.8 Star / Unstar Message

#### Endpoint
```http
POST /api/v1/chats/{chatId}/messages/{messageId}/star
DELETE /api/v1/chats/{chatId}/messages/{messageId}/star
```

#### Authentication Required
```text
Yes
```

#### Frontend Components
- `MessageContextMenu` (star)

---

### 5.9 Pin / Unpin Message

#### Endpoint
```http
POST /api/v1/chats/{chatId}/messages/{messageId}/pin
DELETE /api/v1/chats/{chatId}/messages/{messageId}/pin
```

#### Authentication Required
```text
Yes (admin/owner for groups)
```

#### Frontend Components
- `MessageContextMenu` (pin)

---

### 5.10 Get Message Info (Read Receipts)

#### Endpoint
```http
GET /api/v1/chats/{chatId}/messages/{messageId}/info
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    deliveredTo: ReadReceipt[];
    readBy: ReadReceipt[];
  };
}
```

#### Frontend Components
- `MessageContextMenu` (info)

---

### 5.11 Mark Message Delivered

#### Endpoint
```http
POST /api/v1/chats/{chatId}/messages/{messageId}/delivered
```

#### Authentication Required
```text
Yes
```

---

### 5.12 Mark Message Read

#### Endpoint
```http
POST /api/v1/chats/{chatId}/messages/{messageId}/read
```

#### Authentication Required
```text
Yes
```

---

### 5.13 Get Starred Messages

#### Endpoint
```http
GET /api/v1/messages/starred?cursor={cursor}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<Message>;
}
```

---

## 6. Message Attachment APIs

### 6.1 Upload Attachment

#### Endpoint
```http
POST /api/v1/uploads
Content-Type: multipart/form-data
```

#### Authentication Required
```text
Yes
```

#### Request Body
```text
file: <binary>
type: "image" | "video" | "audio" | "document"
chatId?: string
```

#### Success Response `201`
```ts
{
  success: true;
  data: UploadResponse;
}
```

#### Frontend Components
- `MessageInput` (attachment menu: document, camera, gallery, video)

---

### 6.2 Upload Voice Note

#### Endpoint
```http
POST /api/v1/uploads/voice
Content-Type: multipart/form-data
```

#### Authentication Required
```text
Yes
```

#### Request Body
```text
file: <audio binary>  (opus/ogg/m4a, max 16 MB)
duration: number      (seconds)
waveform?: number[]   (amplitude array for visualization)
```

#### Success Response `201`
```ts
{
  success: true;
  data: UploadResponse;
}
```

#### Frontend Components
- `MessageInput` (mic button → record → send)

---

### 6.3 Delete Attachment

#### Endpoint
```http
DELETE /api/v1/uploads/{uploadId}
```

#### Authentication Required
```text
Yes
```

---

### 6.4 Get Chat Media / Docs / Links

#### Endpoint
```http
GET /api/v1/chats/{chatId}/media?type={type}&cursor={cursor}
```

#### Query Parameters
```ts
{
  type: "image" | "video" | "audio" | "document" | "link";
  cursor?: string;
}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<{
    messageId: string;
    media: MediaAttachment;
    timestamp: string;
  }>;
}
```

#### Frontend Components
- `ChatHeader` (more menu → media, links, docs)

---

## 7. Group APIs

### 7.1 Get Groups

#### Endpoint
```http
GET /api/v1/groups?cursor={cursor}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<Group>;
}
```

---

### 7.2 Create Group

#### Endpoint
```http
POST /api/v1/groups
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{
  name: string;
  description?: string;
  participantIds: string[];  // min 1, max 256
  avatar?: string;           // URL from upload
}
```

#### Success Response `201`
```ts
{
  success: true;
  data: Group;
}
```

#### Frontend Components
- `SecondaryPanel` (+ new chat button → new group)
- `useGroups` hook

---

### 7.3 Get Group by ID

#### Endpoint
```http
GET /api/v1/groups/{groupId}
```

---

### 7.4 Update Group

#### Endpoint
```http
PATCH /api/v1/groups/{groupId}
```

#### Authentication Required
```text
Yes (admin or owner only)
```

#### Request Body
```ts
{
  name?: string;
  description?: string;
  avatar?: string;
}
```

#### Frontend Components
- `UserProfileModal` (group info edit)

---

### 7.5 Delete Group

#### Endpoint
```http
DELETE /api/v1/groups/{groupId}
```

#### Authentication Required
```text
Yes (owner only)
```

---

### 7.6 Get Group Members

#### Endpoint
```http
GET /api/v1/groups/{groupId}/members
```

---

### 7.7 Add Group Member

#### Endpoint
```http
POST /api/v1/groups/{groupId}/members
```

#### Request Body
```ts
{ userId: string; }
```

---

### 7.8 Remove Group Member

#### Endpoint
```http
DELETE /api/v1/groups/{groupId}/members/{userId}
```

#### Authentication Required
```text
Yes (admin or owner)
```

---

### 7.9 Leave Group

#### Endpoint
```http
POST /api/v1/groups/{groupId}/leave
```

#### Authentication Required
```text
Yes
```

---

### 7.10 Promote to Admin

#### Endpoint
```http
POST /api/v1/groups/{groupId}/members/{userId}/promote
```

#### Authentication Required
```text
Yes (owner only)
```

---

### 7.11 Demote Admin

#### Endpoint
```http
POST /api/v1/groups/{groupId}/members/{userId}/demote
```

#### Authentication Required
```text
Yes (owner only)
```

---

### 7.12 Get Group Invite Link

#### Endpoint
```http
GET /api/v1/groups/{groupId}/invite
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    inviteLink: string;
    expiresAt: string | null;
  };
}
```

---

### 7.13 Join Group via Invite

#### Endpoint
```http
POST /api/v1/groups/join/{inviteCode}
```

---

### 7.14 Reset Invite Link

#### Endpoint
```http
POST /api/v1/groups/{groupId}/invite/reset
```

#### Authentication Required
```text
Yes (admin or owner)
```

---

### 7.15 Update Group Permissions

#### Endpoint
```http
PATCH /api/v1/groups/{groupId}/permissions
```

#### Authentication Required
```text
Yes (owner only)
```

#### Request Body
```ts
{
  sendMessages: "all" | "admins";
  editInfo: "all" | "admins";
  addMembers: "all" | "admins";
}
```

---

## 8. Presence APIs

### 8.1 Get User Presence

#### Endpoint
```http
GET /api/v1/presence/{userId}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    userId: string;
    status: "online" | "idle" | "offline";
    lastSeen: string | null;
    isTyping: boolean;
  };
}
```

#### Frontend Components
- `ChatHeader`
- `AvatarStatusBadge`

---

### 8.2 Get Bulk Presence

#### Endpoint
```http
POST /api/v1/presence/bulk
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{ userIds: string[]; }
```

#### Success Response `200`
```ts
{
  success: true;
  data: Record<string, {
    status: "online" | "idle" | "offline";
    lastSeen: string | null;
  }>;
}
```

#### Frontend Components
- `SecondaryPanel` (conversation list)
- `AllFriends`

---

### 8.3 Update Own Presence

#### Endpoint
```http
PATCH /api/v1/presence/me
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{
  status: "online" | "idle" | "offline";
}
```

#### Frontend Components
- `usePresenceTracker` (auto-called on visibility/focus change)

---

### 8.4 Start Typing

#### Endpoint
```http
POST /api/v1/presence/typing/{chatId}/start
```

#### Authentication Required
```text
Yes
```

#### Frontend Components
- `MessageInput` (on input change)

---

### 8.5 Stop Typing

#### Endpoint
```http
POST /api/v1/presence/typing/{chatId}/stop
```

#### Authentication Required
```text
Yes
```

#### Frontend Components
- `MessageInput` (on blur, on send, on 3s debounce)

---

## 9. Notification APIs

### 9.1 Get Notifications

#### Endpoint
```http
GET /api/v1/notifications?cursor={cursor}&limit={limit}&unreadOnly={bool}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<Notification>;
}
```

---

### 9.2 Mark Notification Read

#### Endpoint
```http
POST /api/v1/notifications/{notificationId}/read
```

#### Authentication Required
```text
Yes
```

---

### 9.3 Mark All Notifications Read

#### Endpoint
```http
POST /api/v1/notifications/read-all
```

---

### 9.4 Delete Notification

#### Endpoint
```http
DELETE /api/v1/notifications/{notificationId}
```

---

### 9.5 Get Notification Settings

#### Endpoint
```http
GET /api/v1/notifications/settings
```

#### Success Response `200`
```ts
{
  success: true;
  data: NotificationSettings;
}
```

#### Frontend Components
- `SettingsPage` (notification settings section)

---

### 9.6 Update Notification Settings

#### Endpoint
```http
PATCH /api/v1/notifications/settings
```

#### Request Body
```ts
{
  push?: boolean;
  email?: boolean;
  sms?: boolean;
  messagePreview?: boolean;
  groupNotifications?: boolean;
  mentionNotifications?: boolean;
  reactionNotifications?: boolean;
  sound?: boolean;
  vibration?: boolean;
}
```

#### Frontend Components
- `SettingsPage` (notification toggles)

---

### 9.7 Register Push Token

#### Endpoint
```http
POST /api/v1/notifications/push-token
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{
  token: string;
  platform: "web" | "ios" | "android";
}
```

---

### 9.8 Unregister Push Token

#### Endpoint
```http
DELETE /api/v1/notifications/push-token
```

#### Request Body
```ts
{ token: string; }
```

---

## 10. Status / Stories APIs

### 10.1 Create Status

#### Endpoint
```http
POST /api/v1/status
Content-Type: multipart/form-data
```

#### Authentication Required
```text
Yes
```

#### Request Body
```text
file: <image or video binary>
caption?: string
privacy: "all" | "contacts" | "selected"
selectedUserIds?: string[]   // only when privacy = "selected"
duration?: number            // story duration in seconds (default: 5)
```

#### Success Response `201`
```ts
{
  success: true;
  data: Story;
}
```

#### Frontend Components
- `StoriesCarousel` (add story button)

---

### 10.2 Get Status Feed

#### Endpoint
```http
GET /api/v1/status?cursor={cursor}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<StoryGroup>;
}
```

#### Frontend Components
- `StoriesCarousel`
- `NewsDashboard`

---

### 10.3 Delete Status

#### Endpoint
```http
DELETE /api/v1/status/{storyId}
```

#### Authentication Required
```text
Yes (own status only)
```

---

### 10.4 Mark Status Viewed

#### Endpoint
```http
POST /api/v1/status/{storyId}/view
```

#### Authentication Required
```text
Yes
```

#### Frontend Components
- `StoryViewer` → `onStoryViewed`

---

### 10.5 Get Status Viewers

#### Endpoint
```http
GET /api/v1/status/{storyId}/viewers
```

#### Authentication Required
```text
Yes (own status only)
```

#### Success Response `200`
```ts
{
  success: true;
  data: Array<{
    user: User;
    viewedAt: string;
    reaction?: string;
  }>;
}
```

---

### 10.6 React to Status

#### Endpoint
```http
POST /api/v1/status/{storyId}/reactions
```

#### Request Body
```ts
{ emoji: string; }
```

---

## 11. Feed APIs

### 11.1 Get Feed Posts

#### Endpoint
```http
GET /api/v1/feed?cursor={cursor}&limit={limit}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<Post>;
}
```

#### Frontend Components
- `MainFeed` (initial load + infinite scroll)
- `NewsDashboard`

---

### 11.2 Create Post

#### Endpoint
```http
POST /api/v1/posts
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{
  content: string;
  media?: Array<{
    url: string;
    type: "image" | "video";
    thumbnail?: string;
    aspectRatio?: number;
  }>;
}
```

#### Success Response `201`
```ts
{
  success: true;
  data: Post;
}
```

---

### 11.3 Get Post by ID

#### Endpoint
```http
GET /api/v1/posts/{postId}
```

---

### 11.4 Delete Post

#### Endpoint
```http
DELETE /api/v1/posts/{postId}
```

#### Authentication Required
```text
Yes (own post only)
```

---

### 11.5 Like Post

#### Endpoint
```http
POST /api/v1/posts/{postId}/like
```

#### Authentication Required
```text
Yes
```

#### Frontend Components
- `FeedPost` (like button)
- `MainFeed` → `onLike`

---

### 11.6 Unlike Post

#### Endpoint
```http
DELETE /api/v1/posts/{postId}/like
```

#### Frontend Components
- `FeedPost` (like button toggle)

---

### 11.7 Bookmark Post

#### Endpoint
```http
POST /api/v1/posts/{postId}/bookmark
DELETE /api/v1/posts/{postId}/bookmark
```

#### Frontend Components
- `FeedPost` (bookmark button)
- `MainFeed` → `onBookmark`

---

### 11.8 Share Post

#### Endpoint
```http
POST /api/v1/posts/{postId}/share
```

#### Request Body
```ts
{
  targetType: "chat" | "profile" | "external";
  targetId?: string;  // chatId if targetType = "chat"
}
```

#### Frontend Components
- `FeedPost` (share button)
- `MainFeed` → `onShare`

---

### 11.9 Get Post Comments

#### Endpoint
```http
GET /api/v1/posts/{postId}/comments?cursor={cursor}
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<PostComment>;
}
```

#### Frontend Components
- `FeedPost` (comment section)

---

### 11.10 Create Comment

#### Endpoint
```http
POST /api/v1/posts/{postId}/comments
```

#### Request Body
```ts
{ content: string; }
```

#### Frontend Components
- `FeedPost` (comment input)
- `MainFeed` → `onComment`

---

### 11.11 Like Comment

#### Endpoint
```http
POST /api/v1/posts/{postId}/comments/{commentId}/like
DELETE /api/v1/posts/{postId}/comments/{commentId}/like
```

---

### 11.12 Delete Comment

#### Endpoint
```http
DELETE /api/v1/posts/{postId}/comments/{commentId}
```

#### Authentication Required
```text
Yes (own comment or post owner)
```

---

### 11.13 Get User Posts

#### Endpoint
```http
GET /api/v1/users/{userId}/posts?cursor={cursor}
```

#### Frontend Components
- `ProfileExplorer`

---

### 11.14 Get User Profile (Public)

#### Endpoint
```http
GET /api/v1/users/{userId}/profile
```

#### Success Response `200`
```ts
{
  success: true;
  data: UserProfile;
}
```

#### Frontend Components
- `ProfileExplorer`
- `NewsDashboard`

---

## 12. Discover APIs

### 12.1 Get Discover Profiles

#### Endpoint
```http
GET /api/v1/discover?q={query}&interests={csv}&distance={km}&cursor={cursor}
```

#### Authentication Required
```text
Yes
```

#### Query Parameters
```ts
{
  q?: string;
  interests?: string;     // comma-separated list
  distance?: number;      // km radius
  verified?: boolean;
  isOnline?: boolean;
  cursor?: string;
  limit?: number;
}
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<DiscoverProfile>;
}
```

#### Frontend Components
- `DiscoverDashboard`

---

### 12.2 Like / Unlike Discover Profile

#### Endpoint
```http
POST /api/v1/discover/{userId}/like
DELETE /api/v1/discover/{userId}/like
```

#### Authentication Required
```text
Yes
```

#### Frontend Components
- `DiscoverDashboard` (heart button)
- `ProfileModal` (heart button)

---

## 13. Friend / Contact Request APIs

See Section 3 (Contact APIs) for full request/accept/decline/remove endpoints.

### 13.1 Get Mutual Friends

#### Endpoint
```http
GET /api/v1/users/{userId}/mutual-friends
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    count: number;
    users: User[];
  };
}
```

#### Frontend Components
- `FriendRequests` (mutual friends count)
- `DiscoverPeople`

---

### 13.2 Get Suggested Friends

#### Endpoint
```http
GET /api/v1/contacts/suggestions?cursor={cursor}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<{
    user: User;
    mutualCount: number;
    reason: string; // "mutual friends" | "shared interests" | "nearby"
  }>;
}
```

#### Frontend Components
- `DiscoverPeople`

---

## 14. Random Match APIs

### 14.1 Start Matching (Find Stranger)

#### Endpoint
```http
POST /api/v1/match/start
```

#### Authentication Required
```text
No (guest token accepted)
```

#### Request Body
```ts
{
  filters: {
    ageRange: [number, number];
    gender: "any" | "male" | "female" | "other";
    interests: string[];
    region: string;
  };
}
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    sessionId: string;   // WebSocket session key for this match queue
    queuePosition?: number;
  };
}
```

#### Frontend Components
- `MatchDashboard` (`startSearch`)
- `GuestMatchForm`

---

### 14.2 Cancel Matching

#### Endpoint
```http
POST /api/v1/match/cancel
```

#### Authentication Required
```text
No (guest token accepted)
```

#### Frontend Components
- `MatchDashboard` (`stopSearch`)

---

### 14.3 Skip Stranger

#### Endpoint
```http
POST /api/v1/match/skip
```

#### Request Body
```ts
{ sessionId: string; }
```

#### Frontend Components
- `StrangerChatScreen` (skip / next button)
- `MatchDashboard` → `handleSkip`

---

### 14.4 Report Stranger

#### Endpoint
```http
POST /api/v1/match/report
```

#### Request Body
```ts
{
  sessionId: string;
  reason: "spam" | "harassment" | "inappropriate" | "other";
  description?: string;
}
```

#### Frontend Components
- `StrangerChatScreen` (report button)
- `MatchDashboard` → `handleReport`

---

### 14.5 Block Stranger

#### Endpoint
```http
POST /api/v1/match/block
```

#### Request Body
```ts
{ sessionId: string; }
```

#### Frontend Components
- `StrangerChatScreen` (block button)
- `MatchDashboard` → `handleBlock`

---

### 14.6 Send Stranger Message

Delivered via WebSocket. See WebSocket section `send_stranger_message` event.

---

### 14.7 Get Online Match Users Count

#### Endpoint
```http
GET /api/v1/match/online-count
```

#### Authentication Required
```text
No
```

#### Success Response `200`
```ts
{
  success: true;
  data: { count: number; }
}
```

#### Frontend Components
- `MatchDashboard` (online users badge)

---

### 14.8 Upgrade Guest Account

#### Endpoint
```http
POST /api/v1/guest/upgrade
```

#### Authentication Required
```text
Yes (guest token)
```

#### Request Body
```ts
{
  email: string;
  password: string;
  name: string;
}
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    user: AuthUser;
    tokens: AuthTokens;
  };
}
```

#### Frontend Components
- `GuestBanner` (upgrade account button)
- `GuestMatchForm` (sign in / sign up links)

---

## 15. Search APIs

### 15.1 Global Search

#### Endpoint
```http
GET /api/v1/search?q={query}&types={csv}&cursor={cursor}
```

#### Query Parameters
```ts
{
  q: string;           // min 2 chars
  types?: string;      // "users,chats,messages,groups" (default: all)
  cursor?: string;
  limit?: number;
}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    users: User[];
    chats: Chat[];
    messages: Message[];
    groups: Group[];
  };
}
```

---

### 15.2 Search Messages in Chat

#### Endpoint
```http
GET /api/v1/chats/{chatId}/messages/search?q={query}&cursor={cursor}
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<Message>;
}
```

#### Frontend Components
- `ChatHeader` → `handleSearchInChat`

---

### 15.3 Search Attachments

#### Endpoint
```http
GET /api/v1/search/attachments?q={query}&type={type}&cursor={cursor}
```

#### Query Parameters
```ts
{
  q?: string;
  type?: "image" | "video" | "audio" | "document";
  cursor?: string;
}
```

---

## 16. Settings APIs

### 16.1 Get Settings

#### Endpoint
```http
GET /api/v1/settings
```

#### Authentication Required
```text
Yes
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    app: AppSettings;
    privacy: PrivacySettings;
    notifications: NotificationSettings;
  };
}
```

#### Frontend Components
- `SettingsPage`
- `AppearanceSettings`

---

### 16.2 Update App Settings

#### Endpoint
```http
PATCH /api/v1/settings
```

#### Request Body
```ts
{
  theme?: "light" | "dark" | "system";
  language?: string;
  notifications?: boolean;
  soundEnabled?: boolean;
  fontSize?: "small" | "medium" | "large";
}
```

#### Frontend Components
- `AppearanceSettings`
- `SettingsPage`

---

### 16.3 Export User Data

#### Endpoint
```http
POST /api/v1/settings/export
```

#### Authentication Required
```text
Yes
```

#### Success Response `202`
```ts
{
  success: true;
  data: {
    jobId: string;
    estimatedReadyAt: string;
  };
}
```

---

### 16.4 Get Data Export Status

#### Endpoint
```http
GET /api/v1/settings/export/{jobId}
```

#### Success Response `200`
```ts
{
  success: true;
  data: {
    status: "pending" | "ready" | "expired";
    downloadUrl?: string;
    expiresAt?: string;
  };
}
```

---

## 17. Call APIs

> These endpoints are designed for future WebRTC-based calling infrastructure. The frontend already has `CallModal` built with audio/video call states.

### 17.1 Initiate Call

#### Endpoint
```http
POST /api/v1/calls
```

#### Authentication Required
```text
Yes
```

#### Request Body
```ts
{
  chatId: string;
  type: "audio" | "video";
}
```

#### Success Response `201`
```ts
{
  success: true;
  data: {
    callId: string;
    iceServers: Array<{
      urls: string | string[];
      username?: string;
      credential?: string;
    }>;
    offer?: RTCSessionDescriptionInit;
  };
}
```

#### Frontend Components
- `ChatArea` → `handleAudioCall` / `handleVideoCall`
- `CallModal`

---

### 17.2 Answer Call

#### Endpoint
```http
POST /api/v1/calls/{callId}/answer
```

#### Request Body
```ts
{
  answer: RTCSessionDescriptionInit;
}
```

---

### 17.3 Reject Call

#### Endpoint
```http
POST /api/v1/calls/{callId}/reject
```

---

### 17.4 End Call

#### Endpoint
```http
POST /api/v1/calls/{callId}/end
```

---

### 17.5 Send ICE Candidate

#### Endpoint
```http
POST /api/v1/calls/{callId}/ice-candidate
```

#### Request Body
```ts
{
  candidate: RTCIceCandidateInit;
}
```

---

### 17.6 Get Call History

#### Endpoint
```http
GET /api/v1/calls?cursor={cursor}
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<{
    id: string;
    type: "audio" | "video";
    status: "answered" | "missed" | "rejected";
    duration: number; // seconds
    participants: User[];
    startedAt: string;
    endedAt: string;
  }>;
}
```

#### Frontend Components
- `CallModal` (call history — future tab)

---

### 17.7 Get Missed Calls

#### Endpoint
```http
GET /api/v1/calls?status=missed&cursor={cursor}
```

---

## 18. Guest Mode APIs

### 18.1 Guest Login

#### Endpoint
```http
POST /api/v1/auth/guest
```

#### Authentication Required
```text
No
```

#### Request Body
```ts
{
  name: string;    // display nickname, 1–20 chars
  age: number;     // 18–99
  gender: "male" | "female" | "other";
}
```

#### Success Response `201`
```ts
{
  success: true;
  data: {
    user: AuthUser;   // isGuest: true
    tokens: AuthTokens;
  };
}
```

#### Frontend Components
- `GuestMatchForm`
- `AuthContext` ��� `loginAsGuest`

---

### 18.2 Upgrade Guest to Full Account

See Section 14.8.

---

### 18.3 Guest Anonymous Chat (Match-based)

Guest users can only chat within the random match flow. All messaging uses the WebSocket protocol described in Section 20.

---

## 19. Admin APIs

> Require `role: "admin"` or `role: "superadmin"` on the user record.

### 19.1 Get All Users

#### Endpoint
```http
GET /api/v1/admin/users?q={query}&status={status}&cursor={cursor}
```

#### Authentication Required
```text
Yes — Admin role
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<User & { reportCount: number; suspendedAt: string | null }>;
}
```

---

### 19.2 Suspend User

#### Endpoint
```http
POST /api/v1/admin/users/{userId}/suspend
```

#### Request Body
```ts
{
  reason: string;
  durationDays?: number; // null = permanent
}
```

---

### 19.3 Unsuspend User

#### Endpoint
```http
DELETE /api/v1/admin/users/{userId}/suspend
```

---

### 19.4 Get Reports

#### Endpoint
```http
GET /api/v1/admin/reports?status={status}&cursor={cursor}
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<{
    id: string;
    reporter: User;
    reportedUser: User;
    reason: string;
    description: string;
    status: "pending" | "resolved" | "dismissed";
    createdAt: string;
  }>;
}
```

---

### 19.5 Resolve Report

#### Endpoint
```http
POST /api/v1/admin/reports/{reportId}/resolve
```

#### Request Body
```ts
{
  action: "warn" | "suspend" | "dismiss";
  notes?: string;
}
```

---

### 19.6 Get Analytics

#### Endpoint
```http
GET /api/v1/admin/analytics?from={date}&to={date}&metric={metric}
```

#### Query Parameters
```ts
{
  from: string;        // ISO date
  to: string;          // ISO date
  metric: "users" | "messages" | "calls" | "matches" | "retention";
  granularity?: "hour" | "day" | "week" | "month";
}
```

---

### 19.7 Get Audit Logs

#### Endpoint
```http
GET /api/v1/admin/audit?cursor={cursor}&action={action}
```

#### Success Response `200`
```ts
{
  success: true;
  data: PaginatedResponse<{
    id: string;
    actor: User;
    action: string;
    target: string;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
}
```

---

## 20. WebSocket API

### Connection

```
wss://api.talkme.app/ws?token={accessToken}
```

The access token is passed as a query parameter. On expiry the client should silently re-auth and reconnect.

### Transport

All frames use JSON. Each frame must include an `event` field and a `payload` field.

```ts
interface WsFrame {
  event: string;
  payload: Record<string, unknown>;
}
```

---

### Client → Server Events

#### `join_chat`
Subscribe to real-time events for a specific chat.

```ts
{
  event: "join_chat";
  payload: {
    chatId: string;
  };
}
```

---

#### `leave_chat`
Unsubscribe from a chat's real-time events.

```ts
{
  event: "leave_chat";
  payload: {
    chatId: string;
  };
}
```

---

#### `send_message`
Send a new message (alternative to REST — prefer REST for reliability).

```ts
{
  event: "send_message";
  payload: {
    chatId: string;
    tempId: string;        // client-generated UUID for optimistic updates
    content: string;
    type: MessageType;
    replyToId?: string;
    media?: MediaAttachment;
  };
}
```

---

#### `typing_start`
Notify others the current user has started typing.

```ts
{
  event: "typing_start";
  payload: {
    chatId: string;
  };
}
```

---

#### `typing_stop`
Notify others the current user has stopped typing.

```ts
{
  event: "typing_stop";
  payload: {
    chatId: string;
  };
}
```

---

#### `mark_read`
Mark all messages in a chat as read up to a specific message.

```ts
{
  event: "mark_read";
  payload: {
    chatId: string;
    upToMessageId: string;
  };
}
```

---

#### `add_reaction`
Add an emoji reaction to a message.

```ts
{
  event: "add_reaction";
  payload: {
    chatId: string;
    messageId: string;
    emoji: string;
  };
}
```

---

#### `remove_reaction`
Remove an emoji reaction.

```ts
{
  event: "remove_reaction";
  payload: {
    chatId: string;
    messageId: string;
    emoji: string;
  };
}
```

---

#### `send_stranger_message`
Send a message in a random match session.

```ts
{
  event: "send_stranger_message";
  payload: {
    sessionId: string;
    tempId: string;
    content: string;
    media?: {
      type: "image" | "video";
      url: string;
      thumbnail?: string;
      isBlurred: boolean;
    };
  };
}
```

---

#### `reveal_media`
Unlock blurred media in a stranger chat.

```ts
{
  event: "reveal_media";
  payload: {
    sessionId: string;
    messageId: string;
  };
}
```

---

#### `call_offer`
Send a WebRTC offer to initiate a call.

```ts
{
  event: "call_offer";
  payload: {
    callId: string;
    offer: RTCSessionDescriptionInit;
  };
}
```

---

#### `call_answer`
Send a WebRTC answer.

```ts
{
  event: "call_answer";
  payload: {
    callId: string;
    answer: RTCSessionDescriptionInit;
  };
}
```

---

#### `call_ice_candidate`
Exchange ICE candidates.

```ts
{
  event: "call_ice_candidate";
  payload: {
    callId: string;
    candidate: RTCIceCandidateInit;
  };
}
```

---

#### `call_end`
Hang up a call.

```ts
{
  event: "call_end";
  payload: {
    callId: string;
  };
}
```

---

### Server → Client Events

#### `new_message`
A new message was sent in a subscribed chat.

```ts
{
  event: "new_message";
  payload: Message & { tempId?: string }; // tempId present only for sender
}
```

**Frontend handlers:** `ChatArea`, `VirtualizedChatList`, `SecondaryPanel` (last message update)

---

#### `message_updated`
An existing message was edited.

```ts
{
  event: "message_updated";
  payload: Message;
}
```

**Frontend handlers:** `VirtualizedChatList`

---

#### `message_deleted`
A message was deleted.

```ts
{
  event: "message_deleted";
  payload: {
    chatId: string;
    messageId: string;
    deletedFor: "me" | "everyone";
    isDeleted: boolean;
  };
}
```

**Frontend handlers:** `VirtualizedChatList`

---

#### `reaction_updated`
Reactions on a message changed.

```ts
{
  event: "reaction_updated";
  payload: {
    chatId: string;
    messageId: string;
    reactions: Reaction[];
  };
}
```

**Frontend handlers:** `MessageReactions`, `ChatBubble`

---

#### `user_online`
A contact came online.

```ts
{
  event: "user_online";
  payload: {
    userId: string;
    status: "online";
    lastSeen: null;
  };
}
```

**Frontend handlers:** `AvatarStatusBadge`, `ChatHeader`, `SecondaryPanel`

---

#### `user_offline`
A contact went offline.

```ts
{
  event: "user_offline";
  payload: {
    userId: string;
    status: "offline";
    lastSeen: string; // ISO timestamp
  };
}
```

---

#### `user_idle`
A contact became idle.

```ts
{
  event: "user_idle";
  payload: {
    userId: string;
    status: "idle";
  };
}
```

---

#### `typing_started`
Another user started typing in a chat.

```ts
{
  event: "typing_started";
  payload: {
    chatId: string;
    userId: string;
    userName: string;
  };
}
```

**Frontend handlers:** `ChatHeader` (typing indicator), `VirtualizedChatList`

---

#### `typing_stopped`
Another user stopped typing.

```ts
{
  event: "typing_stopped";
  payload: {
    chatId: string;
    userId: string;
  };
}
```

---

#### `message_read`
Another participant read messages.

```ts
{
  event: "message_read";
  payload: {
    chatId: string;
    userId: string;
    upToMessageId: string;
    readAt: string;
  };
}
```

**Frontend handlers:** `MessageStatus` (tick icons)

---

#### `message_delivered`
Message confirmed delivered to a device.

```ts
{
  event: "message_delivered";
  payload: {
    chatId: string;
    messageId: string;
    userId: string;
    deliveredAt: string;
  };
}
```

**Frontend handlers:** `MessageStatus`

---

#### `notification_received`
A new notification arrived.

```ts
{
  event: "notification_received";
  payload: Notification;
}
```

---

#### `chat_updated`
Chat metadata changed (mute, pin, archive, name).

```ts
{
  event: "chat_updated";
  payload: Chat;
}
```

**Frontend handlers:** `SecondaryPanel`

---

#### `contact_request_received`
A new friend request arrived.

```ts
{
  event: "contact_request_received";
  payload: {
    requestId: string;
    sender: User;
    createdAt: string;
  };
}
```

**Frontend handlers:** `FriendsDashboard` (request count badge)

---

#### `match_found`
A random chat stranger was matched.

```ts
{
  event: "match_found";
  payload: {
    sessionId: string;
    stranger: Stranger;
  };
}
```

**Frontend handlers:** `MatchDashboard` (`setStatus("matched")`)

---

#### `stranger_message`
A message from the matched stranger.

```ts
{
  event: "stranger_message";
  payload: StrangerMessage;
}
```

**Frontend handlers:** `StrangerChatScreen`

---

#### `stranger_typing_started`
Stranger started typing.

```ts
{
  event: "stranger_typing_started";
  payload: { sessionId: string; }
}
```

---

#### `stranger_typing_stopped`
Stranger stopped typing.

```ts
{
  event: "stranger_typing_stopped";
  payload: { sessionId: string; }
}
```

---

#### `stranger_disconnected`
Stranger ended the session.

```ts
{
  event: "stranger_disconnected";
  payload: { sessionId: string; reason: "skip" | "block" | "disconnect" }
}
```

**Frontend handlers:** `MatchDashboard` (reset state)

---

#### `call_incoming`
Incoming call notification.

```ts
{
  event: "call_incoming";
  payload: {
    callId: string;
    caller: User;
    type: "audio" | "video";
  };
}
```

**Frontend handlers:** `CallModal`

---

#### `call_answered`
Remote party answered the call.

```ts
{
  event: "call_answered";
  payload: {
    callId: string;
    answer: RTCSessionDescriptionInit;
  };
}
```

---

#### `call_rejected`
Remote party rejected the call.

```ts
{
  event: "call_rejected";
  payload: { callId: string; }
}
```

---

#### `call_ended`
Call was terminated.

```ts
{
  event: "call_ended";
  payload: {
    callId: string;
    duration: number; // seconds
  };
}
```

---

#### `ice_candidate`
WebRTC ICE candidate from remote peer.

```ts
{
  event: "ice_candidate";
  payload: {
    callId: string;
    candidate: RTCIceCandidateInit;
  };
}
```

---

## 21. Data Models

### AuthUser

```ts
interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  isVerified: boolean;
  isGuest: boolean;
  createdAt: string;
}
```

---

### User (full)

```ts
interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  phone: string | null;
  age?: number;
  country?: string;
  city?: string;
  interests?: string[];
  occupation?: string;
  education?: string;
  isVerified: boolean;
  isGuest: boolean;
  isBlocked: boolean;
  presence: "online" | "idle" | "offline";
  lastSeen: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

### GuestUser

```ts
interface GuestUser {
  id: string;
  name: string;        // display nickname
  age: number;
  gender: "male" | "female" | "other";
  isGuest: true;
  sessionToken: string;
  createdAt: string;
  expiresAt: string;
}
```

---

### AuthTokens

```ts
interface AuthTokens {
  accessToken: string;   // JWT, 15 min TTL
  refreshToken: string;  // opaque, 30 day TTL, HttpOnly cookie
  expiresIn: number;     // seconds
}
```

---

### Chat

```ts
interface Chat {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatar: string | null;
  participants: User[];
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    type: MessageType;
    timestamp: string;
    isDeleted: boolean;
  } | null;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  mutedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

### Group

```ts
interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  inviteLink: string | null;
  ownerId: string;
  members: GroupMember[];
  memberCount: number;
  permissions: {
    sendMessages: "all" | "admins";
    editInfo: "all" | "admins";
    addMembers: "all" | "admins";
  };
  createdAt: string;
  updatedAt: string;
}

interface GroupMember {
  userId: string;
  name: string;
  avatar: string | null;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}
```

---

### Message

```ts
type MessageType = "text" | "image" | "video" | "audio" | "document" | "sticker" | "system";
type MessageStatus = "sending" | "sent" | "delivered" | "seen" | "failed";

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  type: MessageType;
  status: MessageStatus;
  reactions: Reaction[];
  replyTo: ReplyTo | null;
  media: MediaAttachment | null;
  readReceipts: ReadReceipt[];
  isDeleted: boolean;
  isEdited: boolean;
  isPinned: boolean;
  isForwarded: boolean;
  isStarred: boolean;
  timestamp: string;    // ISO 8601
  editedAt: string | null;
  deletedAt: string | null;
}
```

---

### MediaAttachment

```ts
interface MediaAttachment {
  type: "image" | "video" | "document" | "audio";
  url: string;
  thumbnail?: string;
  fileName?: string;
  fileSize?: string;    // human-readable e.g. "2.4 MB"
  fileSizeBytes?: number;
  mimeType?: string;
  duration?: number;    // seconds
  width?: number;
  height?: number;
  waveform?: number[];  // for voice notes
}
```

---

### Reaction

```ts
interface Reaction {
  emoji: string;
  count: number;
  users: string[];      // user IDs
  hasReacted: boolean;  // current user
}
```

---

### ReplyTo

```ts
interface ReplyTo {
  id: string;
  senderName: string;
  content: string;
  type: MessageType;
  media?: MediaAttachment;
}
```

---

### ReadReceipt

```ts
interface ReadReceipt {
  userId: string;
  name: string;
  readAt: string;
}
```

---

### Contact

```ts
interface Contact {
  id: string;
  userId: string;
  name: string;
  avatar: string | null;
  phone: string | null;
  email: string | null;
  isBlocked: boolean;
  presence: PresenceStatus;
  lastSeen: string | null;
  addedAt: string;
}
```

---

### Notification

```ts
interface Notification {
  id: string;
  type:
    | "message"
    | "reaction"
    | "mention"
    | "group_invite"
    | "contact_request"
    | "call_missed"
    | "status_view";
  title: string;
  body: string;
  avatarUrl?: string;
  data: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}
```

---

### NotificationSettings

```ts
interface NotificationSettings {
  push: boolean;
  email: boolean;
  sms: boolean;
  messagePreview: boolean;
  groupNotifications: boolean;
  mentionNotifications: boolean;
  reactionNotifications: boolean;
  sound: boolean;
  vibration: boolean;
}
```

---

### Story

```ts
interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  timestamp: string;
  expiresAt: string;    // 24h after creation
  viewed: boolean;
  viewCount: number;
  duration: number;     // seconds (default: 5)
  privacy: "all" | "contacts" | "selected";
}

interface StoryGroup {
  userId: string;
  userName: string;
  userAvatar: string | null;
  stories: Story[];
  hasUnviewed: boolean;
}
```

---

### Post

```ts
interface Post {
  id: string;
  author: PostAuthor;
  content: string;
  media: PostMedia[];
  likes: number;
  comments: PostComment[];
  commentCount: number;
  shares: number;
  liked: boolean;
  bookmarked: boolean;
  timestamp: string;
}

interface PostAuthor {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  verified: boolean;
  status: PresenceStatus;
}

interface PostMedia {
  id: string;
  url: string;
  type: "image" | "video";
  aspectRatio?: number;
  thumbnail?: string;
}

interface PostComment {
  id: string;
  author: PostAuthor;
  content: string;
  timestamp: string;
  likes: number;
  liked: boolean;
}
```

---

### DiscoverProfile

```ts
interface DiscoverProfile {
  id: string;
  name: string;
  age: number;
  username: string;
  bio: string;
  location: string;
  distance?: string;         // "2 miles away"
  distanceKm?: number;
  occupation?: string;
  education?: string;
  interests: string[];
  images: string[];
  isVerified: boolean;
  isOnline: boolean;
  isLiked: boolean;
  isFriend: boolean;
  mutualFriendsCount: number;
}
```

---

### Stranger (Random Match)

```ts
interface Stranger {
  id: string;
  anonymousName: string;
  interests: string[];
  region?: string;
  isTyping: boolean;
  isRecording: boolean;
}

interface StrangerMessage {
  id: string;
  content: string;
  timestamp: number;
  time: string;           // formatted e.g. "2:30 PM"
  isFromStranger: boolean;
  media?: {
    type: "image" | "video";
    url: string;
    thumbnail?: string;
    isBlurred: boolean;
  };
}
```

---

### PrivacySettings

```ts
interface PrivacySettings {
  showLastSeen: "everyone" | "contacts" | "nobody";
  showOnlineStatus: "everyone" | "contacts" | "nobody";
  showProfilePhoto: "everyone" | "contacts" | "nobody";
  readReceipts: boolean;
  ghostMode: boolean;
  hideLastSeen: boolean;
  invisibleMode: boolean;
}
```

---

### AppSettings

```ts
interface AppSettings {
  theme: "light" | "dark" | "system";
  language: string;         // BCP 47 e.g. "en-US"
  notifications: boolean;
  soundEnabled: boolean;
  fontSize: "small" | "medium" | "large";
}
```

---

### BlockedUser

```ts
interface BlockedUser {
  id: string;
  name: string;
  avatar: string | null;
  blockedAt: string;
}
```

---

### Session

```ts
interface Session {
  id: string;
  deviceName: string;
  deviceType: "mobile" | "desktop" | "tablet";
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  lastActive: string;
  isCurrent: boolean;
  createdAt: string;
}
```

---

### Call

```ts
interface Call {
  id: string;
  type: "audio" | "video";
  status: "initiated" | "ringing" | "answered" | "missed" | "rejected" | "ended";
  initiatorId: string;
  participants: User[];
  duration: number;    // seconds
  startedAt: string;
  endedAt: string | null;
}
```

---

*End of TalkMe API Specification v1.0.0*
