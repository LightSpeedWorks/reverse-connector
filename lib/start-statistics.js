// statistics.js

void function () {

	var N = 10;
	var INTERVAL = N * 1000;

	function Statistics(log, myName) {
		var total = 0, txn = 0, n = N, i = 0;
		setTimeout(showStatistics, INTERVAL);
		this.countUp = countUp;

		function countUp() { ++txn; }

		function showStatistics() {
			total += txn;
			i += N;
			if (txn === 0) {
				if (i >= n) {
					log.info(myName, 'total:', total, 'no txns - in', i, 'secs.');
					n *= 2;
					i = 0;
				}
			}
			else {
				log.info(myName, 'total:', total, 'txn:', txn, 'txn/s:', (txn/i).toFixed(2), '- in', i, 'secs.');
				n = N;
				i = 0;
			}
			txn = 0;
			setTimeout(showStatistics, INTERVAL);
		}

	}

	module.exports = Statistics;

}();
