---
description: Guidelines for implementing new features or services with real-time user data
---
# PWA Data Refresh Guidelines
 Whenever a new feature or service is implemented that handles data the user needs to see updated in real-time (e.g., lists, chats, notifications, rankings, etc.), you MUST follow this procedure to ensure the data is refreshed when the PWA is resumed from the background:

1. In `c:\Users\Fonsi\Desktop\AgilityAsturias\frontend\src\app\app.ts`, locate the `handleVisibilityChange` method.
2. Inject the new service dynamically using `this.injector.get(NombeDelNuevoServicio)`.
3. Call the appropriate `fetch...()` or `load...()` methods of that service inside the `if (document.visibilityState === 'visible' && this.authService.isLoggedIn())` block.

This guarantees that when the PWA comes back to the foreground after being minimized, it will query the server and refresh the Angular Signals, repainting the screen automatically without requiring a manual page reload.
