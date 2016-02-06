// target-example.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');

	var x = process.argv[2] || '37';
	x = '\x1b[' + x + 'm';
	var y = '\x1b[m';
	var basename = path.basename(__filename);
	console.log(basename);
	var configs = require('./target-config.json');

	var targetId = 20000;

	configs.forEach(function (config) {
		assert(       config.targetName,  'config.targetName');
		assert(Number(config.targetPort), 'config.targetPort');
		config = {targetName:config.targetName,
		          targetPort:config.targetPort};

		console.log(x, new Date().toLocaleString(), basename, process.version, y);
		console.log(config);

		var targetNetSvr = net.createServer(function connectionTarget(c) {
			// connection listener
			console.log(x, new Date().toLocaleString(), basename,
				'(target) connected.', y);
			c.on('end', function() {
				console.log(x, new Date().toLocaleString(), basename,
					'(target) disconnected', y);
			});
			c.write('example-target-message ' + (++targetId) + ' ' + config.targetName + '\r\n');
			c.pipe(c);
		}).listen(config.targetPort, function() {
			// listening listener
			console.log(x, new Date().toLocaleString(), basename,
				'(target) server bound. port', config.targetPort, y);
		});

	}); // configs.forEach

}();
