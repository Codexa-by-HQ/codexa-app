import {
	installPlugin,
	listInstalledPlugins,
	type PluginInstallOptions,
} from '@codexa/cli';

type PluginSource =
	| { readonly sourceDirectory: string }
	| { readonly repository: string; readonly ref: string };

type ManagedPlugin = { readonly id: string } & PluginSource;

/**
 * Official plugins pinned to pushed commits, in dependency order: OAuth first,
 * then the optional sign in plugins, which depend only on OAuth. Each entry
 * names the plugin ID, its sibling source folder and its GitHub repository.
 */
const PINNED = [
	['oauth', 'oauth-base', 'f1d93de24684842bb50938ca41b1d1b14a8567eb'],
	['oauth-mfa', 'oauth-mfa', '35e8e27eb3bb79217f010bac23952d73e1020cb5'],
	[
		'oauth-passkey',
		'oauth-passkey',
		'90df1392a58fe0f201ecd0c8305d631100399e71',
	],
	[
		'oauth-magic-link',
		'oauth-magic-link',
		'e9556f437e674f1e74642aa7818ad1a6a51bcb74',
	],
	['oauth-sso', 'oauth-sso', '2f6bdfce81f11c504cdad244d9db483c9746967a'],
	['oauth-oidc', 'oauth-oidc', 'f2cf259b7b328d95a69a45c0abf084ab9f6086ca'],
	[
		'oauth-device',
		'oauth-device',
		'32f43e166e187dea0e5c9a7dcfb3241ede6e51bf',
	],
] as const;

/**
 * `--source=oauth,oauth-sso` installs the named plugins from their sibling
 * source folders instead of their pinned commits, to verify changes before
 * they are pushed. Running without it restores every pinned commit.
 */
const fromSource = new Set(
	Deno.args.find((arg) => arg.startsWith('--source='))
		?.slice('--source='.length).split(',').map((id) => id.trim()) ?? [],
);
for (const id of fromSource) {
	if (!PINNED.some(([pinned]) => pinned === id)) {
		throw new Error(`--source names an unknown plugin: ${id}`);
	}
}

/**
 * Plugins this host installs, in dependency order. Media and OAuth App install
 * from their sibling source folders, so local edits reach the host on every
 * run. Media moves into PINNED once its repository is pushed.
 */
const PLUGINS: readonly ManagedPlugin[] = [
	...PINNED.map(([id, folder, ref]): ManagedPlugin =>
		fromSource.has(id) ? { id, sourceDirectory: `../${folder}` } : {
			id,
			repository: `https://github.com/Codexa-by-HQ/${folder}.git`,
			ref,
		}
	),
	{ id: 'media', sourceDirectory: '../media' },
	{ id: 'oauth-app', sourceDirectory: '../oauth-app' },
];

const projectRoot = Deno.cwd();
const installed = new Map(
	(await listInstalledPlugins(projectRoot)).map((plugin) => [
		plugin.id,
		plugin,
	]),
);

for (const plugin of PLUGINS) {
	const current = installed.get(plugin.id);
	if ('ref' in plugin && current?.commit === plugin.ref) {
		console.log(`Up to date: ${plugin.id} at ${plugin.ref.slice(0, 7)}`);
		continue;
	}

	// The CLI cannot refresh an install, so reverse the old one first.
	await uninstallPlugin(projectRoot, plugin.id);
	const { id: _id, ...source } = plugin;
	const result = await installPlugin(
		{
			projectRoot,
			...source,
			runDenoCheck: true,
			runDenoInstall: false,
		} satisfies PluginInstallOptions,
	);
	const at = result.commit ? ` at ${result.commit.slice(0, 7)}` : '';
	console.log(
		`Installed ${result.name}@${result.version} in ${result.directory}${at}`,
	);
}

/**
 * Reverse one CLI installation, since @codexa/cli has no remove command yet.
 * Only this plugin's workspace member, registry entry and tree change. Safe to
 * run when the plugin is missing or only partly installed.
 */
async function uninstallPlugin(root: string, id: string): Promise<void> {
	const member = `./plugins/${id}`;

	const configPath = `${root}/deno.json`;
	const config = await readJson(configPath);
	if (!config) throw new Error(`Host deno.json is missing: ${configPath}`);
	const workspace = config.workspace;
	const members = isRecord(workspace) ? workspace.members : workspace;
	if (Array.isArray(members) && members.includes(member)) {
		const kept = members.filter((value) => value !== member);
		config.workspace = isRecord(workspace)
			? { ...workspace, members: kept }
			: kept;
		await writeJson(configPath, config);
	}

	const registryPath = `${root}/.codexa/plugins.json`;
	const registry = await readJson(registryPath);
	if (
		registry && isRecord(registry.plugins) &&
		Object.hasOwn(registry.plugins, id)
	) {
		delete registry.plugins[id];
		await writeJson(registryPath, registry);
	}

	try {
		await Deno.remove(`${root}/plugins/${id}`, { recursive: true });
	} catch (error) {
		if (!(error instanceof Deno.errors.NotFound)) throw error;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readJson(
	path: string,
): Promise<Record<string, unknown> | undefined> {
	try {
		const value: unknown = JSON.parse(await Deno.readTextFile(path));
		if (!isRecord(value)) {
			throw new Error(`Expected a JSON object: ${path}`);
		}
		return value;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) return undefined;
		throw error;
	}
}

/** Same layout the CLI writes, so its own reads stay consistent. */
async function writeJson(path: string, value: unknown): Promise<void> {
	await Deno.writeTextFile(path, JSON.stringify(value, null, '\t') + '\n');
}
