module.exports = {
	apps: [
		{
			name: 'garden-planner',
			script: 'build/index.js',
			env: {
				NODE_ENV: 'production',
				PORT: 3010,
				ORIGIN: 'https://garden.elchert.net',
				BODY_SIZE_LIMIT: '25M'
			}
		}
	]
};
