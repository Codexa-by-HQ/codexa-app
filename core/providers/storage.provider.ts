import { buildStorageConfig } from '@codexa/core/config';
import {
	createStorageManager,
	type StorageManager,
} from '@codexa/core/storage';
import type { HostEnvironment } from '../validations/environment.validation.ts';

/**
 * The storage OAuth uploads profile pictures and other media to, through
 * Codexa Core's provider for it. Unset keeps pictures as small inlined
 * images and turns the media service off.
 */
export function createHostStorage(
	environment: HostEnvironment,
): StorageManager | undefined {
	if (environment.OAUTH_STORAGE_PROVIDER !== 'cloudinary') return undefined;
	return createStorageManager(buildStorageConfig({
		STORAGE_PROVIDER: 'cloudinary',
		CLOUDINARY_CLOUD_NAME: environment.OAUTH_CLOUDINARY_CLOUD_NAME ?? '',
		CLOUDINARY_API_KEY: environment.OAUTH_CLOUDINARY_API_KEY ?? '',
		CLOUDINARY_API_SECRET: environment.OAUTH_CLOUDINARY_API_SECRET ?? '',
	}));
}
