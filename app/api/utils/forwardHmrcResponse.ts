export async function forwardHmrcResponse(response: Response, operation: string, logBody = true): Promise<Response> {
  const body = await response.text();

  if (!response.ok) {
    console.error(`HMRC ${operation} failed`, logBody
      ? { status: response.status, body: body || undefined }
      : { status: response.status });
  }

  const headers = new Headers();
  const contentType = response.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  return new Response(body || null, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
