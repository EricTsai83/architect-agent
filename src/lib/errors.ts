function getStructuredErrorData(error: unknown) {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return null;
  }

  if (typeof error.data === 'object' && error.data !== null) {
    return error.data;
  }

  if (typeof error.data === 'string') {
    try {
      const parsed = JSON.parse(error.data);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function getStructuredErrorMessage(error: unknown) {
  const data = getStructuredErrorData(error);
  if (data && 'message' in data && typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }

  return null;
}

export function toUserErrorMessage(error: unknown, fallback: string) {
  const structuredMessage = getStructuredErrorMessage(error);
  if (structuredMessage) {
    return structuredMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
