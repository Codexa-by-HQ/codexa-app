import type { MediaConfigInput, MediaInstallConfig } from '@codexa/media';
import { AVATAR_PURPOSE } from '@codexa/media/config';
import type { HostDeployment } from '../lib/environment.ts';
import { createHostStorage } from '../providers/storage.provider.ts';
import type { OptionalPluginConfig } from '../types/host.types.ts';

const MB = 1024 * 1024;

/**
 * What may be uploaded, purpose by purpose. A purpose fixes its types and
 * size, so no caller picks its own limits. Add a purpose here to offer a new
 * kind of upload, such as a product video.
 */
export const MEDIA_CONFIG = {
	folder: 'media',
	purposes: {
		// The account area saves a cropped photo as the first type it allows.
		[AVATAR_PURPOSE]: {
			assetType: 'image',
			contentTypes: ['image/webp', 'image/jpeg', 'image/png'],
			maxBytes: 2 * MB,
		},
	},
} satisfies MediaConfigInput;

/** Media stores files only when the host has a storage provider. */
export function createMediaInstallConfig(
	{ environment }: HostDeployment,
): OptionalPluginConfig<MediaInstallConfig> {
	const storage = createHostStorage(environment);
	if (!storage) return { off: 'set MEDIA_STORAGE_PROVIDER to store uploads' };
	return { config: { requirements: { storage }, config: MEDIA_CONFIG } };
}
