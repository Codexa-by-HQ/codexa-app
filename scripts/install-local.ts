import { installPlugin, listInstalledPlugins } from '@codexa/cli';

const projectRoot = Deno.cwd();
const installed = await listInstalledPlugins(projectRoot);
const plugins = [
	{ id: 'oauth', sourceDirectory: '../oauth-base' },
	{ id: 'oauth-app', sourceDirectory: '../oauth-app' },
];

for (const { id, sourceDirectory } of plugins) {
	if (installed.some((plugin) => plugin.id === id)) {
		console.log(`Already installed: ${id}`);
		continue;
	}

	const plugin = await installPlugin({
		projectRoot,
		sourceDirectory,
		runDenoCheck: true,
		runDenoInstall: false,
	});
	console.log(`Installed ${plugin.name} in ${plugin.directory}`);
}
