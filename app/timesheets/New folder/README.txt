Sodah Timesheet UI update

Files:
- TimeSheetMain.jsx: Auto Save control restyled to match the supplied compact pill/switch reference and remains visible while the kiosk is locked.
- FaceRecognitionPanel.jsx: Kiosk lock control restyled to match the Auto Save control family. It displays only “Lock” while unlocked and only “Unlock” while locked; selecting it opens the existing PIN dialog.
- timesheet.css: styles for the matching controls, responsive sizing and dark theme.

Replace the corresponding files in the project. Keep the FaceRecognitionPanel import/path consistent with the existing project.

Note: the PIN/kiosk lock remains client-side only and is not a substitute for server-side authorization. No production build or deployment test was run in this environment.
