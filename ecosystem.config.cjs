module.exports = {
	apps: [
		{
			name: 'garden-planner',
			script: 'build/index.js',
			env: {
				NODE_ENV: 'production',
				PORT: 3000,
				ORIGIN: 'http://localhost:3000'
			}
		}
	]
};
