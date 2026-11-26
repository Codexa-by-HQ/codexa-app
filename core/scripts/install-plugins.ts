import {
	installPlugin,
	listInstalledPlugins,
	type PluginInstallOptions,
} from '@codexa/cli';

/**
 * Installs official plugins through the Codexa CLI, in dependency order, and
 * builds the frontend of every installed plugin that has one (OAuth's setup
 * wizard, OAuth App). `--base` is required and decides where plugins come
 * from. Plugin names: oauth, oauth-mfa, oauth-passkey, oauth-magic-link,
 * oauth-sso, oauth-oidc, oauth-device, media, oauth-app.
 *
 * Without --name, every plugin installs:
 *
 *   deno task install:plugins --base=version
 *     each plugin's latest release tag on GitHub
 *
 *   deno task install:plugins --base=commit
 *     each plugin's latest commit on its default branch on GitHub
 *
 *   deno task install:plugins --base=local
 *     each plugin's folder from LOCAL_PATHS below
 *
 * With --name, only the named plugins install, each at the base's latest
 * unless a value follows it:
 *
 *   deno task install:plugins --base=version --name=media
 *     only media, at its latest release
 *
 *   deno task install:plugins --base=version --name=oauth --version=1.0.0
 *     only OAuth, at release 1.0.0 (v1.0.0 works too)
 *
 *   deno task install:plugins --base=commit --name=oauth --commit=b4d0fa8
 *     only OAuth, at that commit
 *
 *   deno task install:plugins --base=local --name=oauth --path=../my-oauth
 *     only OAuth, from that folder instead of LOCAL_PATHS
 *
 *   deno task install:plugins --base=version --name=oauth --version=1.0.0
 *     --name=media --name=oauth-app --path=../oauth-app
 *     OAuth at 1.0.0, media at its latest release, OAuth App from a folder
 *
 * --build names a folder inside the plugin named before it, and builds that
 * folder in the plugin's installed copy (plugins/<plugin>/<folder>): npm ci,
 * npm run build, then its node_modules is removed. It needs --base and a
 * --name, never runs on its own, runs even when the plugin is up to date, and
 * can repeat for several folders. A folder that is not in the plugin, or has
 * no package.json, is skipped with a message:
 *
 *   deno task install:plugins --base=version --name=oauth --build=app/setup
 *     OAuth at its latest release, then its setup wizard built
 *
 *   deno task install:plugins --base=version --name=oauth --version=1.0.0
 *     --build=app/setup
 *     OAuth at 1.0.0, then plugins/oauth/app/setup built
 *
 *   deno task install:plugins --base=commit --name=oauth --commit=b4d0fa8
 *     --build=app/setup
 *     OAuth at that commit, then its setup wizard built
 *
 *   deno task install:plugins --base=local --name=oauth-app --path=../oauth-app
 *     --build=app
 *     OAuth App from that folder, then plugins/oauth-app/app built
 *
 * A plugin's own frontend (OAuth's app/setup, OAuth App's app) also builds
 * automatically whenever that plugin is newly installed.
 *
 * --version only fits --base=version and --commit only fits --base=commit.
 * --path fits any base, to try released plugins against local work. Anything
 * else stops before installing.
 *
 * How a version or commit is installed: the Codexa CLI's `ref` option takes
 * any git ref, so a release installs with its tag (`v1.0.0`) and a commit with
 * its SHA. The CLI clones the repository at that ref and records both the ref
 * and the commit it resolved to in `.codexa/plugins.json`. A plugin already
 * installed at the same repository and ref, or at that commit, is skipped.
 *
 * A plugin that cannot be resolved, such as one with no release tag yet or no
 * repository, is skipped with a message and the others continue. npm output is
 * shown only when a frontend build fails.
 */

const GITHUB = 'https://github.com/Codexa-by-HQ';

/** Every official plugin in dependency order, with its repository name. */
const PLUGINS = [
	{ id: 'oauth', repository: 'oauth-base', frontend: 'app/setup' },
	{ id: 'oauth-mfa', repository: 'oauth-mfa' },
	{ id: 'oauth-passkey', repository: 'oauth-passkey' },
	{ id: 'oauth-magic-link', repository: 'oauth-magic-link' },
	{ id: 'oauth-sso', repository: 'oauth-sso' },
	{ id: 'oauth-oidc', repository: 'oauth-oidc' },
	{ id: 'oauth-device', repository: 'oauth-device' },
	{ id: 'media', repository: 'media' },
	{ id: 'oauth-app', repository: 'oauth-app', frontend: 'app' },
] as const satisfies readonly {
	id: string;
	repository: string;
	/** A frontend built in the installed copy after every install. */
	frontend?: string;
}[];

/**
 * Where each plugin's source lives for `--base=local`, relative to Codexa
 * App. Set these up once for your checkout.
 */
const LOCAL_PATHS: Readonly<Record<PluginId, string>> = {
	oauth: '../oauth-base',
	'oauth-mfa': '../oauth-mfa',
	'oauth-passkey': '../oauth-passkey',
	'oauth-magic-link': '../oauth-magic-link',
	'oauth-sso': '../oauth-sso',
	'oauth-oidc': '../oauth-oidc',
	'oauth-device': '../oauth-device',
	'media': '../media',
	'oauth-app': '../oauth-app',
};

type Plugin = (typeof PLUGINS)[number];
type PluginId = Plugin['id'];
type Base = 'version' | 'commit' | 'local';
type Choice =
	| { readonly kind: 'latest' }
	| { readonly kind: 'version' | 'commit' | 'path'; readonly value: string };
type Source =
	| { readonly sourceDirectory: string }
	| { readonly repository: string; readonly ref: string };

const USAGE =
	'Usage: deno task install:plugins --base=version|commit|local [--name=<plugin> [--version=<x.y.z> | --commit=<sha> | --path=<folder>] [--build=<folder in that plugin>]...]...';

const { base, choices, builds } = ((): ReturnType<typeof readArguments> => {
	try {
		return readArguments(Deno.args);
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		Deno.exit(1);
	}
})();

const projectRoot = Deno.cwd();
const installed = new Map(
	(await listInstalledPlugins(projectRoot)).map((plugin) => [
		plugin.id,
		plugin,
	]),
);
// No --name installs every plugin, and named plugins install alone.
const selected = choices.size
	? PLUGINS.filter((plugin) => choices.has(plugin.id))
	: PLUGINS;
const skipped: string[] = [];

for (const plugin of selected) {
	const source = await resolveSource(
		plugin,
		base,
		choices.get(plugin.id) ?? { kind: 'latest' },
	);
	if (typeof source === 'string') {
		console.warn(`Skipped ${plugin.id}: ${source}`);
		skipped.push(plugin.id);
		continue;
	}
	const requested = builds.get(plugin.id) ?? [];
	const current = installed.get(plugin.id);
	if (
		'ref' in source && current?.repository === source.repository &&
		(current.ref === source.ref || current.commit === source.ref)
	) {
		console.log(`Up to date: ${plugin.id} at ${source.ref}`);
		// Asked for builds run even when nothing was installed.
		for (const folder of requested) await buildFrontend(plugin.id, folder);
		continue;
	}

	// The CLI cannot refresh an install, so reverse the old one first.
	await uninstallPlugin(projectRoot, plugin.id);
	const result = await installPlugin(
		{
			projectRoot,
			...source,
			runDenoCheck: true,
			runDenoInstall: false,
		} satisfies PluginInstallOptions,
	);
	const from = 'ref' in source
		? ` at ${source.ref}${
			result.commit && result.commit !== source.ref
				? ` (${result.commit.slice(0, 7)})`
				: ''
		}`
		: ` from ${source.sourceDirectory}`;
	console.log(`Installed ${result.name}@${result.version}${from}`);
	// A plugin's own frontend builds in its installed copy, so its dist always
	// matches the code just installed. Asked for folders build after it.
	const folders = new Set<string>(requested);
	if ('frontend' in plugin) folders.add(plugin.frontend);
	for (const folder of folders) await buildFrontend(plugin.id, folder);
}

if (skipped.length) {
	console.warn(`Not installed: ${skipped.join(', ')}.`);
}

/**
 * Where one plugin comes from, or why it cannot be installed. A pinned value
 * wins, otherwise the base decides.
 */
async function resolveSource(
	plugin: Plugin,
	base: Base,
	choice: Choice,
): Promise<Source | string> {
	if (choice.kind === 'path') return { sourceDirectory: choice.value };
	if (base === 'local') return { sourceDirectory: LOCAL_PATHS[plugin.id] };

	const repository = `${GITHUB}/${plugin.repository}.git`;
	const refs = await remoteRefs(repository);
	if (!refs) return `${repository} does not exist.`;
	if (choice.kind === 'commit') return { repository, ref: choice.value };
	if (choice.kind === 'version') {
		const tag = refs.tags.find((name) =>
			name.replace(/^v/, '') === choice.value.replace(/^v/, '')
		);
		return tag
			? { repository, ref: tag }
			: `it has no release ${choice.value}.`;
	}
	if (base === 'commit') return { repository, ref: refs.head };
	const latest = refs.tags.at(-1);
	return latest ? { repository, ref: latest } : 'it has no release tag yet.';
}

/**
 * A repository's release tags, oldest first by semantic version, and its
 * default branch's latest commit. Undefined when the repository is missing.
 */
async function remoteRefs(
	repository: string,
): Promise<{ tags: string[]; head: string } | undefined> {
	const { success, stdout, stderr } = await new Deno.Command('git', {
		args: ['ls-remote', repository],
		stdout: 'piped',
		stderr: 'piped',
		env: { GIT_TERMINAL_PROMPT: '0' },
	}).output();
	const failure = new TextDecoder().decode(stderr).trim();
	// Only a repository GitHub says does not exist counts as missing. Any other
	// failure, such as no network, stops the run instead.
	if (!success && /repository .* not found/i.test(failure)) return undefined;
	if (!success) throw new Error(`Could not read ${repository}: ${failure}`);
	const lines = new TextDecoder().decode(stdout).trim().split('\n')
		.map((line) => line.split('\t'));
	const head = lines.find(([, name]) => name === 'HEAD')?.[0];
	if (!head) throw new Error(`${repository} has no default branch.`);
	const tags = lines.map(([, name]) => name?.replace('refs/tags/', ''))
		.filter((name): name is string => /^v?\d+\.\d+\.\d+$/.test(name ?? ''))
		.sort(compareVersions);
	return { tags, head };
}

function compareVersions(left: string, right: string): number {
	const parts = (tag: string) => tag.replace(/^v/, '').split('.').map(Number);
	const [a, b] = [parts(left), parts(right)];
	return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/** The required base and the named plugins, checked before anything runs. */
function readArguments(args: readonly string[]): {
	base: Base;
	choices: Map<PluginId, Choice>;
	builds: Map<PluginId, string[]>;
} {
	const value = (arg: string, flag: string) =>
		arg.startsWith(`--${flag}=`) ? arg.slice(flag.length + 3) : undefined;
	const ids = new Set<string>(PLUGINS.map((plugin) => plugin.id));

	let base: Base | undefined;
	// The plugin later --build flags belong to, until the next --name.
	let named: PluginId | undefined;
	// The plugin a --version, --commit or --path may still be given for.
	let name: PluginId | undefined;
	const choices = new Map<PluginId, Choice>();
	const builds = new Map<PluginId, string[]>();
	for (const arg of args) {
		const buildValue = value(arg, 'build');
		if (buildValue !== undefined) {
			if (!named) {
				throw new Error(`--build needs a --name before it.\n${USAGE}`);
			}
			const folder = buildValue.replace(/\\/g, '/').replace(/\/+$/, '');
			// The folder stays inside the plugin's installed copy.
			if (
				!folder || folder.startsWith('/') || /^[a-z]:/i.test(folder) ||
				folder.split('/').includes('..')
			) {
				throw new Error(
					`--build takes a folder inside ${named}, such as app.\n${USAGE}`,
				);
			}
			builds.set(named, [...(builds.get(named) ?? []), folder]);
			continue;
		}
		const baseValue = value(arg, 'base');
		const nameValue = value(arg, 'name');
		if (baseValue !== undefined) {
			if (!['version', 'commit', 'local'].includes(baseValue)) {
				throw new Error(
					`--base must be version, commit or local.\n${USAGE}`,
				);
			}
			base = baseValue as Base;
			continue;
		}
		if (nameValue !== undefined) {
			if (!ids.has(nameValue)) {
				throw new Error(
					`--name must be one of ${[...ids].join(', ')}.\n${USAGE}`,
				);
			}
			name = nameValue as PluginId;
			named = name;
			choices.set(name, { kind: 'latest' });
			continue;
		}
		const found = (['version', 'commit', 'path'] as const)
			.map((kind) => ({ kind, value: value(arg, kind) }))
			.find((entry) => entry.value !== undefined);
		if (!found?.value) {
			throw new Error(`Unknown or empty argument ${arg}.\n${USAGE}`);
		}
		if (!name) {
			throw new Error(
				`--${found.kind} needs a --name before it.\n${USAGE}`,
			);
		}
		choices.set(name, { kind: found.kind, value: found.value });
		name = undefined;
	}
	if (!base) throw new Error(`--base is required.\n${USAGE}`);
	for (const [id, choice] of choices) {
		if (
			(choice.kind === 'version' && base !== 'version') ||
			(choice.kind === 'commit' && base !== 'commit')
		) {
			throw new Error(
				`--${choice.kind} for ${id} does not fit --base=${base}.\n${USAGE}`,
			);
		}
	}
	return { base, choices, builds };
}

/**
 * Build one folder of an installed plugin: install its locked dependencies,
 * build its `dist`, then remove the dependencies. Only `dist` is served, and
 * an editor extension that loads a native module from a left over
 * node_modules would lock the next reinstall. A folder without a package.json
 * is skipped with a message. npm's output shows only when a step fails.
 */
async function buildFrontend(id: string, folder: string): Promise<void> {
	const directory = `${projectRoot}/plugins/${id}/${folder}`;
	if (!(await exists(`${directory}/package.json`))) {
		console.warn(
			`Skipped building ${id}/${folder}: it has no package.json.`,
		);
		return;
	}
	for (const args of [['ci'], ['run', 'build']]) {
		const { success, stdout, stderr } = await new Deno.Command(
			Deno.build.os === 'windows' ? 'npm.cmd' : 'npm',
			{ args, cwd: directory, stdout: 'piped', stderr: 'piped' },
		).output();
		if (!success) {
			const decode = (bytes: Uint8Array) =>
				new TextDecoder().decode(bytes);
			console.error(decode(stdout) + decode(stderr));
			throw new Error(
				`npm ${args.join(' ')} failed for ${id} in ${directory}`,
			);
		}
	}
	await Deno.remove(`${directory}/node_modules`, { recursive: true });
	console.log(`Built ${id}/${folder}`);
}

async function exists(path: string): Promise<boolean> {
	try {
		await Deno.stat(path);
		return true;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) return false;
		throw error;
	}
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
