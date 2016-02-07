// server-example.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var log = require('log-manager').getLogger();

	log.info('node', process.version, path.basename(__filename));
	process.title = path.basename(__filename);
	var configs = require('./server-config.json');
	log.setLevel(configs.logLevel);

	var serverId = 30000;
	var myName = '(server)';

	configs.servers.forEach(function (config) {
		assert(Number(config.serverPort), 'config.serverPort');

		log.info(config);

		var serverNetSvr = net.createServer(
				{allowHalfOpen:true},
				function connectionTarget(c) {
			log.debug(myName, 'connected.');
			var receivied = false;
			c.on('error', function error(err) {
				log.warn(myName, 'error', err);
				c.destroy();
			});
			c.on('end', function end() {
				log.debug(myName, 'disconnected');
				if (!receivied) {
					log.warn(myName, 'client has gone!');
				}
			});
			c.on('readable', function () {
				var buff = c.read();
				if (!buff) return;

				receivied = true;
				var words = buff.toString().trim().split(' ');
				log.trace(myName, 'read.', words.join(' '));
				setTimeout(function () {
					log.trace(myName, 'write.', words.join(' '));
					c.write('RESULT-SERVER ' + words[1] + ' ' + words[2] + '=' + eval(words[2]) + '\r\n');
					c.end();
				}, 2000);
			});
		}).listen(config.serverPort, function listeningServer() {
			log.debug(myName, 'server bound. port', config.serverPort);
		});

	}); // configs.forEach

}();
