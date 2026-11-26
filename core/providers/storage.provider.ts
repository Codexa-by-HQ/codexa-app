import { buildStorageConfig } from '@codexa/core/config';
import {
	createStorageManager,
	type StorageManager,
} from '@codexa/core/storage';
import type { HostEnvironment } from '../validations/environment.validation.ts';

/**
 * The storage the media plugin uploads to, through Codexa Core's provider
 * for it. Unset leaves media off, so nothing can be uploaded.
 */
export function createHostStorage(
	environment: HostEnvironment,
): StorageManager | undefined {
	if (environment.MEDIA_STORAGE_PROVIDER !== 'cloudinary') return undefined;
	return createStorageManager(buildStorageConfig({
		STORAGE_PROVIDER: 'cloudinary',
		CLOUDINARY_CLOUD_NAME: environment.MEDIA_CLOUDINARY_CLOUD_NAME ?? '',
		CLOUDINARY_API_KEY: environment.MEDIA_CLOUDINARY_API_KEY ?? '',
		CLOUDINARY_API_SECRET: environment.MEDIA_CLOUDINARY_API_SECRET ?? '',
	}));
}

/** The origins a browser sends uploads to, which OAuth App's CSP allows. */
export function storageUploadOrigins(environment: HostEnvironment): string[] {
	return environment.MEDIA_STORAGE_PROVIDER === 'cloudinary'
		? ['https://api.cloudinary.com']
		: [];
}
