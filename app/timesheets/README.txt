Sodah Face Attendance Update

Replace only these two existing files in your project:
1. TimeSheetMain.jsx -> your existing TimeSheetMain component file
2. FaceRecognitionPanel.jsx -> the imported FaceRecognitionPanel component file

What changed:
- PIN create/unlock prompt is styled as a centered screen modal.
- Locking switches the face panel to Attendance Kiosk and hides admin enrollment.
- Existing locked-state toolbar/menu/search hiding remains in TimeSheetMain.
- A face scan captures a still image and shows that captured image while processing.
- A successful match automatically determines Check In vs Check Out from the matched employee's attendance row and calls the existing attendance handler.
- Success feedback includes a time-appropriate greeting, employee name, action and time.
- The existing AWS face enrollment and verification API routes are unchanged.
- Existing timesheet sheets, settings, reports, analytics, autosave and spreadsheet functionality are not intentionally changed.

Important:
- Apply the update to the same source paths used by your current imports.
- This is a code update, not a verified production build or live camera/AWS test.
- Kiosk PIN is currently browser-local and is not a substitute for server-side device authentication on a publicly accessible kiosk.
