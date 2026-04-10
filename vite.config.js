export default {
	base: "/systems/mausritter/",
	publicDir: "public",
	build: {
		outDir: "dist",
		emptyOutDir: false,
		sourcemap: true,
		lib: {
			name: "mausritter",
			entry: "./src/mausritter.js",
			formats: ["es"],
			fileName: "mausritter",
		},
	},
};
