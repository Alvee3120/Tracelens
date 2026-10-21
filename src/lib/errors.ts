/** Typed error helpers. Every async failure in the app funnels through here. */
import type { AppError, ErrorCode } from '@/types';
import { strings } from '@/lib/strings';

const RECOVERABLE: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'CAMERA_DISMISSED',
  'CAMERA_NOT_FOUND',
  'CAMERA_OVERCONSTRAINED',
  'CAMERA_FAILED',
  'IMAGE_DECODE_FAILED',
  'IMAGE_TOO_LARGE',
  'STORAGE_FAILED',
  'WORKER_FAILED',
  'UNKNOWN',
]);

export function appError(code: ErrorCode, detail?: string): AppError {
  return {
    code,
    message: titleFor(code),
    ...(detail ? { detail } : {}),
    recoverable: RECOVERABLE.has(code),
  };
}

function titleFor(code: ErrorCode): string {
  switch (code) {
    case 'CAMERA_PERMISSION_DENIED':
      return strings.errors.permissionDeniedTitle;
    case 'CAMERA_DISMISSED':
      return strings.errors.dismissedTitle;
    case 'CAMERA_NOT_FOUND':
      return strings.errors.notFoundTitle;
    case 'CAMERA_UNSUPPORTED':
      return strings.errors.unsupportedTitle;
    case 'CAMERA_INSECURE_CONTEXT':
      return strings.errors.insecureTitle;
    case 'CAMERA_OVERCONSTRAINED':
      return strings.errors.overconstrainedTitle;
    case 'CAMERA_FAILED':
      return strings.errors.failedTitle;
    case 'IMAGE_DECODE_FAILED':
      return strings.errors.imageDecodeTitle;
    case 'IMAGE_TOO_LARGE':
      return strings.errors.imageTooLargeTitle;
    case 'STORAGE_FAILED':
      return strings.errors.storageTitle;
    case 'WORKER_FAILED':
      return strings.errors.workerTitle;
    default:
      return strings.errors.unknownTitle;
  }
}

export function bodyFor(code: ErrorCode): string {
  switch (code) {
    case 'CAMERA_PERMISSION_DENIED':
      return strings.errors.permissionDeniedBody;
    case 'CAMERA_DISMISSED':
      return strings.errors.dismissedBody;
    case 'CAMERA_NOT_FOUND':
      return strings.errors.notFoundBody;
    case 'CAMERA_UNSUPPORTED':
      return strings.errors.unsupportedBody;
    case 'CAMERA_INSECURE_CONTEXT':
      return strings.errors.insecureBody;
    case 'CAMERA_OVERCONSTRAINED':
      return strings.errors.overconstrainedBody;
    case 'CAMERA_FAILED':
      return strings.errors.failedBody;
    case 'IMAGE_DECODE_FAILED':
      return strings.errors.imageDecodeBody;
    case 'IMAGE_TOO_LARGE':
      return strings.errors.imageTooLargeBody;
    case 'STORAGE_FAILED':
      return strings.errors.storageBody;
    case 'WORKER_FAILED':
      return strings.errors.workerBody;
    default:
      return strings.errors.unknownBody;
  }
}

/** Maps a getUserMedia rejection to a typed, user-facing error. */
export function cameraErrorFromException(error: unknown): AppError {
  if (typeof error === 'object' && error !== null) {
    const named = error as { name?: string; message?: string; constraint?: string };
    const name = named.name ?? '';
    const message = named.message ?? '';

    switch (name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        // Chrome/Safari use the same error name for "denied" and "dismissed".
        if (/dismiss/i.test(message)) return appError('CAMERA_DISMISSED', message);
        return appError('CAMERA_PERMISSION_DENIED', message);
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return appError('CAMERA_NOT_FOUND', message);
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return appError('CAMERA_OVERCONSTRAINED', named.constraint ?? message);
      case 'NotReadableError':
      case 'TrackStartError':
        return appError('CAMERA_FAILED', message || 'Camera is already in use');
      case 'SecurityError':
        return appError('CAMERA_INSECURE_CONTEXT', message);
      case 'TypeError':
        return appError('CAMERA_UNSUPPORTED', message);
      default:
        return appError('CAMERA_FAILED', message);
    }
  }
  return appError('CAMERA_FAILED');
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as AppError).message === 'string'
  );
}
