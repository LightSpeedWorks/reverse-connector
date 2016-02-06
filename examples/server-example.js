// server-example.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');

	var x = process.argv[2] || '37';
	x = '\x1b[' + x + 'm';
	var y = '\x1b[m';
	var basename = path.basename(__filename);
	console.log(basename);
	var configs = require('./server-config.json');

	var serverId = 30000;

	configs.forEach(function (config) {
		assert(Number(config.serverPort), 'config.serverPort');
		config = {serverPort: config.serverPort};

		console.log(x, new Date().toLocaleString(), basename, process.version, y);
		console.log(config);

		var serverNetSvr = net.createServer(function connectionTarget(c) {
			// connection listener
			console.log(x, new Date().toLocaleString(), basename,
				'(server) connected.', y);
			c.on('end', function() {
				console.log(x, new Date().toLocaleString(), basename,
					'(server) disconnected', y);
			});
			c.write('example-server-message ' + (++serverId) + ' - Z\r\n');
			c.pipe(c);
		}).listen(config.serverPort, function() {
			// listening listener
			console.log(x, new Date().toLocaleString(), basename,
				'(server) server bound. port', config.serverPort, y);
		});

	}); // configs.forEach

}();
