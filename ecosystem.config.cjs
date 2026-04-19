module.exports = {
	apps: [
		{
			name: 'garden-planner',
			script: 'build/index.js',
			node_args: '--require dotenv/config',
			env: {
				NODE_ENV: 'production',
				PORT: 3010,
				ORIGIN: 'https://garden.elchert.net',
				BODY_SIZE_LIMIT: '25M',
				DOTENV_CONFIG_PATH: '.env'
			},
			// Logging — syslog style with timestamps
			out_file: 'logs/out.log',
			error_file: 'logs/error.log',
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
			merge_logs: true,
			log_type: 'raw'
		}
	]
};
