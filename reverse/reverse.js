// reverse.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');

	var x = process.argv[2] || '37';
	x = '\x1b[' + x + 'm';
	var y = '\x1b[m';
	var basename = path.basename(__filename);
	console.log(basename);
	var configs = require('./reverse-config.json');

	var systemPoolSockets = {};

	assert(Number(configs.systemPort), 'config.systemPort');

	var systemNetSvr = net.createServer(function connectionSystem(c) {

		// connection listener
		console.log(x, new Date().toLocaleString(), basename,
			'(system) connected.', y);

		var using = false;
		c.on('readable', function readable() {
			var buff = c.read();
			if (!buff) return;

			if (!using) {
				var words;
				if (buff[0] === 0x52 &&
						(words = buff.toString().split(' '), words[0]) === 'REVERSE') {
					var targetName = words[1];
					if (systemPoolSockets[targetName]) {
						systemPoolSockets[targetName].push(c);
						console.log(x, new Date().toLocaleString(), basename,
							'(system) connected. ' + targetName + ' remain ' +
							systemPoolSockets[targetName].length, y);

						c.on('error', function error(err) {
							console.log(x, new Date().toLocaleString(), basename,
								'(system) error', err, y);
							c.destroy();
							remove();
						});

						c.on('end', end);

						function end() {
							console.log(x, new Date().toLocaleString(), basename,
								'(system) disconnected.', y);
							remove();
						}

						function remove() {
							systemPoolSockets[targetName] = systemPoolSockets[targetName].filter(s => s !== c);
						}
					}
					else {
						console.log(x, new Date().toLocaleString(), basename,
							'(system) targetName ' + targetName + ' not found!', y);
						//c.write('wrong!!!\r\n');
						c.destroy();
					}

				}
				else {
					var s = net.connect(configs.serverPort, configs.serverHost, function connectionServer() {
						s.write(buff);
						c.pipe(s);
						s.pipe(c);
					});

					s.on('error', function error(err) {
						console.log(x, new Date().toLocaleString(), basename,
							'(server) error', err, y);
						s.destroy(); // end?
						c.destroy(); // end?
					});
				} // if REVERSE

				c.removeListener('readable', readable);
				using = true;
			}
		});

		c.on('error', function error(err) {
			console.log(x, new Date().toLocaleString(), basename,
				'(system) error', err, y);
			c.destroy();
			//remove();
		});

		c.on('end', end);

		function end() {
			console.log(x, new Date().toLocaleString(), basename,
				'(system) disconnected. (1)', y);
		}

	}).listen(configs.systemPort, function() {
		// listening listener
		console.log(x, new Date().toLocaleString(), basename,
			'(system) server bound. port', configs.systemPort, y);
	});

	configs.clients.forEach(function (config) {
		assert(       config.targetName,  'config.targetName');
		assert(Number(config.clientPort), 'config.clientPort');
		config = {targetName:config.targetName, clientPort:config.clientPort, systemPort:configs.systemPort};

		systemPoolSockets[config.targetName] = [];

		console.log(x, new Date().toLocaleString(), basename, process.version, y);
		console.log(config);

		var clientNetSvr = net.createServer(function connectionClient(c) {
			var s, a = systemPoolSockets[config.targetName];
			if (!a || !(a instanceof Array) || !(s = a.shift())) {
				console.log(x, new Date().toLocaleString(), basename,
					'(client) no pool, connection rejected!', y);
				return c.destroy();
			}

			// connection listener
			console.log(x, new Date().toLocaleString(), basename,
				'(client) client connected. remain', systemPoolSockets[config.targetName].length, y);
			c.on('error', function (err) {
				console.log(x, new Date().toLocaleString(), basename,
					'(client) error', err, y);
			});
			c.on('end', function() {
				console.log(x, new Date().toLocaleString(), basename,
					'(client) disconnected', y);
			});
			s.on('end', function() {
				console.log(x, new Date().toLocaleString(), basename,
					'(client) system disconnected', y);
			});
			c.pipe(s);
			s.pipe(c);
		}).listen(config.clientPort, function() {
			// listening listener
			console.log(x, new Date().toLocaleString(), basename,
				'(client) server bound. port', config.clientPort, y);
		});

	}); // configs.forEach

}();
