
void function () {

	function startStatistics(log, myName) {
		var total = 0, txn = 0, n = 1, i = 0;
		setTimeout(showStatistics, 1000);

		return {countUp: countUp};

		function countUp() { ++txn; }

		function showStatistics() {
			total += txn;
			if (txn === 0) {
				if (++i >= n) {
					log.info(myName, 'total:', total, 'no txns - in', i, 'secs.');
					n *= 2;
					i = 0;
				}
			}
			else {
				++i;
				log.info(myName, 'total:', total, 'txn:', txn, 'txn/s:', txn/i, '- in', i, 'secs.');
				n = 1;
				i = 0;
			}
			txn = 0;
			setTimeout(showStatistics, 1000);
		}

	}

	module.exports = startStatistics;

}();
