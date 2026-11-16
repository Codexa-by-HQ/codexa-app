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
 * Plugins this host installs, in dependency order. OAuth Base is pinned to a
 * pushed commit. OAuth App installs from its sibling source folder, so local
 * edits reach the host on every run.
 */
const PLUGINS: readonly ManagedPlugin[] = [
	{
		id: 'oauth',
		repository: 'https://github.com/Codexa-by-HQ/oauth-base.git',
		ref: '70f8eb9325a974230b91c0f2f2b09e233f79a0d9',
	},
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
	const result = await installPlugin({
		projectRoot,
		...source,
		runDenoCheck: true,
		runDenoInstall: false,
	} satisfies PluginInstallOptions);
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
		if (!isRecord(value)) throw new Error(`Expected a JSON object: ${path}`);
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
