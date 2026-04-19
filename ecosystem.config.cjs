const path = require('path');

const appRoot = __dirname;

module.exports = {
	apps: [
		{
			name: 'garden-planner',
			cwd: appRoot,
			script: 'build/index.js',
			node_args: '--require dotenv/config',
			env: {
				NODE_ENV: 'production',
				PORT: 3010,
				ORIGIN: 'https://garden.elchert.net',
				BODY_SIZE_LIMIT: '25M',
				DOTENV_CONFIG_PATH: path.join(appRoot, '.env')
			},
			// Logging — syslog style with timestamps
			out_file: path.join(appRoot, 'logs/out.log'),
			error_file: path.join(appRoot, 'logs/error.log'),
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
			merge_logs: true,
			log_type: 'raw'
		}
	]
};
