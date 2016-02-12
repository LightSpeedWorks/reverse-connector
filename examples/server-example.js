// server-example.js

void function () {
	var assert = require('assert');
	var path = require('path');
	var net = require('net');
	var log = require('log-manager').setWriter(new require('log-writer')('server-example-%s.log')).getLogger();
	var Statistics = require('../lib/statistics');
	var constants = require('../lib/constants');

	log.info('node', process.version, path.basename(__filename));
	process.title = path.basename(__filename);
	var configs = require('./server-config.json');
	log.setLevel(configs.logLevel);

	var serverId = 30000;
	var myName = '(server)';

	var stats = new Statistics(log, myName);

	configs.servers.forEach(function (config) {
		assert(Number(config.serverPort), 'config.serverPort');

		log.info(config);

		var serverNetSvr = net.createServer(
				{allowHalfOpen:true},
				function connectionTarget(c) {
			log.debug(myName, 'connected.');
			var received = false;
			c.on('error', function error(err) {
				log.warn(myName, 'error', err);
				c.destroy();
			});
			c.on('end', function end() {
				log.debug(myName, 'disconnected');
				if (!received) {
					log.warn(myName, 'client has gone!');
				}
			});
			c.on('readable', function () {
				var buff = c.read();
				if (!buff) return;

				received = true;
				var words = buff.toString().trim().split(' ');
				log.trace(myName, 'read.', words.join(' '));
				setTimeout(function () {
					log.trace(myName, 'write.', words.join(' '));
					c.write('RESULT-SERVER ' + words[1] + ' ' + words[2] + '=' + eval(words[2]) + '\r\n');
					c.end();
					stats.countUp();
				}, 1000);
			});
		}).listen(config.serverPort, function listeningServer() {
			log.debug(myName, 'server bound. port', config.serverPort);
		});

	}); // configs.forEach

}();
