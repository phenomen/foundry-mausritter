import path from "node:path";

export default {
	root: "src/",
	base: "/systems/mausritter/",
	publicDir: path.resolve(__dirname, "public"),
	server: {
		port: 30001,
		open: true,
		proxy: {
			"^(?!/systems/mausritter)": "http://localhost:30000/",
			"/socket.io": {
				target: "ws://localhost:30000",
				ws: true,
			},
		},
	},
	resolve: {
		alias: [
			{
				find: "./runtimeConfig",
				replacement: "./runtimeConfig.browser",
			},
		],
	},
	build: {
		outDir: path.resolve(__dirname, "dist"),
		emptyOutDir: false,
		sourcemap: true,
		lib: {
			name: "mausritter",
			entry: path.resolve(__dirname, "src/mausritter.js"),
			formats: ["es"],
			fileName: "mausritter",
		},
	},
	esbuild: {
		minifyIdentifiers: false,
		keepNames: true,
	},
};
