# Face recognition API contract

The updated client expects two authenticated, same-origin Next.js API routes. They are intentionally not stubbed as successful endpoints: recognition must only be marked successful after a real server-side match.

## `POST /api/timesheets/face/enroll`

Request JSON:

```json
{
  "image": "<base64 JPEG frame>",
  "employee": {
    "name": "Employee Name",
    "employeeId": "EMP-001"
  },
  "consent": true
}
```

Expected success JSON:

```json
{
  "success": true,
  "message": "Face profile enrolled."
}
```

Server responsibilities:
- Authenticate the signed-in manager and authorize enrollment for this business.
- Validate that consent is true and record the consent timestamp and policy version.
- Validate image size/type and face quality; reject zero-face or multi-face captures.
- Create a biometric template with a supported recognition provider.
- Encrypt template data at rest and associate it with the business ID and employee ID.
- Do not log or persist the raw image unless there is a separately approved, documented need.
- Apply retention, employee deletion, and re-enrollment controls.

## `POST /api/timesheets/face/verify`

Request JSON:

```json
{
  "image": "<base64 JPEG frame>"
}
```

Expected match JSON:

```json
{
  "success": true,
  "matched": true,
  "employee": {
    "name": "Employee Name",
    "employeeId": "EMP-001"
  }
}
```

Expected no-match JSON:

```json
{
  "success": true,
  "matched": false,
  "message": "No enrolled employee matched this scan."
}
```

Server responsibilities:
- Authenticate the device/session and scope matching to the correct business.
- Perform face detection, quality checks, and a liveness/anti-spoof check before matching.
- Apply a documented confidence threshold and rate limits; do not return a match on weak confidence.
- Return only the matched employee identity, never biometric templates.
- Add an audit record for successful attendance verification without storing the camera frame.

The client then calls the existing timesheet check-in/check-out action for the matched employee, so current shift and minimum-checkout rules remain in force.

## Provider decision needed
Choose and configure a provider (for example, a managed cloud face verification service or a self-hosted face model). Keep provider secrets server-side in environment variables. Do not put provider keys in the browser bundle. Confirm the applicable employee notice, consent, data-protection, retention, and cross-border processing requirements for the business location before enabling enrollment.

## Attendance write contract required for shared kiosk use

After verification, the server must resolve the matched employee against the current business and today's attendance record, then perform the requested `check-in` or `check-out` against the same authoritative attendance table used by the admin Employee Timesheet. The write must be atomic (for example, a database transaction or conditional update) so two kiosk requests cannot create duplicate open check-ins. Check-in must fail when an open check-in already exists; check-out must fail when there is no open check-in or a check-out is already recorded. The existing manual/automatic minimum checkout rules must be enforced on the server as well as reflected in the UI. The server response should return the updated attendance row and action timestamp.

The current frontend snapshot still stores its timesheets in browser `localStorage`; it therefore cannot provide cross-device shared records until the authoritative attendance database/API is connected.
