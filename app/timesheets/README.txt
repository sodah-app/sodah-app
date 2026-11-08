Sodah Face Recognition PIN Dialog and Stable Layout Update

Included:
- FaceRecognitionPanel.jsx
- timesheet.css

Changes:
- Lock/Unlock opens a centered, fixed-position PIN popup overlay.
- The popup asks only for a 4-12 digit numeric PIN. No email, Gmail, or account field is shown or requested.
- Clicking the backdrop or pressing Escape closes the popup without changing the lock state.
- The popup locks background page scrolling while open and does not occupy page layout space, preventing the kiosk page from shifting.
- The reference images are not included in the application bundle; no extra image is rendered by this update.

Replace the matching files in your project. The PIN remains browser-local in this implementation; this is not server-side authentication or a secure multi-device lock.
