const testingAllowedEmailsValue = process.env.TESTING_ALLOWED_USER_EMAILS;
const allowedTestingEmails = testingAllowedEmailsValue
  ? testingAllowedEmailsValue
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  : [];

if (process.env.NODE_ENV !== 'production' && testingAllowedEmailsValue === undefined) {
  throw new Error('TESTING_ALLOWED_USER_EMAILS is required in non-production environments.');
}

export function canAccessTesting(email?: string | null): boolean {
  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  return Boolean(email && allowedTestingEmails.includes(email.toLowerCase()));
}
