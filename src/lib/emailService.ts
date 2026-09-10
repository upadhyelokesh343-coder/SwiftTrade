/**
 * Sends a welcome email to the newly signed in / signed up user via the backend API.
 * Passes dynamic parameters:
 *  - toName: User's display name or email prefix
 *  - toEmail: User's email address
 */
export async function sendWelcomeEmail(toName: string, toEmail: string): Promise<boolean> {
  if (!toEmail) {
    console.warn('[Welcome Email] Skip sending: No target email provided.');
    return false;
  }

  try {
    console.log(`[Welcome Email] Attempting to send welcome email to ${toEmail} (${toName})...`);

    // In browser context, we can just use relative /api/email/welcome, 
    // or absolute if VITE_APP_URL is present. 
    // Using relative path ensures it hits the same host serving the frontend.
    const apiUrl = '/api/email/welcome';
    
    console.log(`[Welcome Email] Fetching from URL: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ toEmail, toName }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('[Welcome Email] Email sent successfully via backend!', data);
      return true;
    } else {
      console.error('[Welcome Email] Backend returned an error:', data.message || response.statusText);
      return false;
    }
  } catch (error: any) {
    console.error('[Welcome Email] Network or parsing error:', error?.message || error);
    return false;
  }
}


