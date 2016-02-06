// client-example.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');

	var x = process.argv[2] || '37';
	x = '\x1b[' + x + 'm';
	var y = '\x1b[m';
	var basename = path.basename(__filename);
	console.log(basename);
	var configs = require('./client-config.json');

	var clientId = 10000;

	configs.forEach(function (config) {
		assert(       config.clientHost,  'config.clientHost');
		assert(Number(config.clientPort), 'config.clientPort');
		assert(Number(config.clientPool), 'config.clientPool');
		config = {clientHost:config.clientHost,
		          clientPort:config.clientPort,
		          clientPool:config.clientPool};

		console.log(x, new Date().toLocaleString(), basename, process.version, y);
		console.log(config);

		var clientPoolSockets = [];

		while (clientPoolSockets.length < config.clientPool)
			connectPool();

		function connectPool() {
			if (clientPoolSockets.length >= config.clientPool)
				return;

			var c = net.connect(config.clientPort, config.clientHost, function connectionClient() {
				console.log(x, new Date().toLocaleString(), basename,
					'(client) using.', y);

				var cNo = ++clientId;
				c.write('example-client-message ' + cNo + ' - 1\r\n');
				setTimeout(function () {
					c.write('example-client-message ' + cNo + ' - 2\r\n');
				}, 1000);
				setTimeout(function () {
					c.end();
					remove();
				}, 3000);

				c.on('readable', function () {
					var buff = c.read();
					if (!buff) return;

					console.log(x, new Date().toLocaleString(), basename,
						'(client) read. ' + buff.toString().trim(), y);
					//process.stdout.write(buff);
				});
			});
			clientPoolSockets.push(c);

			c.on('error', error);
			c.on('end', end);

			function error(err) {
				console.log(x, new Date().toLocaleString(), basename,
					'(client) error', err, y);
				remove(err);
			}

			function end() {
				console.log(x, new Date().toLocaleString(), basename,
					'(client) disconnected. remain', clientPoolSockets.length, y);
				remove();
			}

			function remove(err) {
				clientPoolSockets = clientPoolSockets.filter(s => s !== c);
				if (err && (
						err.code === 'ECONNREFUSED' ||
						err.code === 'EPIPE' ||
						err.code === 'ECONNRESET'))
					setTimeout(connectPool, 10 * 1000); // 10 sec
				else
					setTimeout(connectPool, 1000); // 1 sec
			}

		}

	}); // configs.forEach

}();
