import { Amplify } from 'aws-amplify';

let amplifyConfigured = false;

export async function initializeAmplify() {
  try {
    const response = await fetch('/amplify_outputs.json', {
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        configured: false,
        message:
          'Amplify backend outputs were not found. Run `npm run amplify:dev` to connect the dashboard to your sandbox backend.',
      };
    }

    const outputs = await response.json();
    Amplify.configure(outputs);
    amplifyConfigured = true;

    return {
      configured: true,
      message: null,
    };
  } catch (error) {
    return {
      configured: false,
      message:
        error instanceof Error
          ? error.message
          : 'Amplify configuration could not be loaded.',
    };
  }
}

export function isAmplifyConfigured() {
  return amplifyConfigured;
}
