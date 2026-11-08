Sodah.io Voice Settings UI update

Files:
- page.jsx: Updated Voice Settings page. Replace the existing page component file with this file, keeping the same route/location in your Next.js project.
- voice-settings-route.updated.js: Included as a reference copy of the existing API route; it was not changed for this visual redesign.
- voice-settings-design-reference.png: Approved visual design reference.

Preservation notes:
- Existing product and promotion management logic, product/promotion currency selectors, image capacity indicators, subscription restrictions, save behavior, WhatsApp connection status, and existing controls were preserved in page.jsx.
- Updated the hero to the dark green/black visual style with white text and green accents.
- Added a voice preview button using browser SpeechSynthesis. It speaks a short sample using the selected gender/accent language approximation. Browser voices vary and this preview may not exactly match the server-generated WhatsApp voice.

Validation:
- JSX/JavaScript transpile parse passed using TypeScript's JSX parser.
- API route passed `node --check`.
- Not tested against a live Supabase database or WhatsApp provider.
