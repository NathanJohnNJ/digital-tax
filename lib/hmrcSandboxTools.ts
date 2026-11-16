export function sandboxTestToolsEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
    || process.env.HMRC_ENABLE_SANDBOX_TEST_TOOLS === 'true';
}
