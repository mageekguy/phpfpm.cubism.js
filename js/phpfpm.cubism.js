;(function(alias) {
'use strict';

var phpfpm = alias.phpfpm = {}

phpfpm.url = function(url) {
	this.url = url;

	this.addQueryString = function(name, value) {
		var queryString = new RegExp("([?|&])" + name + "=.*?(&|#|$)(.*)", "gi");

		if (queryString.test(this.url)) {
			this.url = this.url.replace(queryString, '$1' + name + (!value ? '' : '=' + value) + '$2$3');
		} else {
			var url = this.url.split('#');

			this.url = url[0] + (this.url.indexOf('?') !== -1 ? '&' : '?') + name;
			
			if (value) {
				this.url += '=' + value;
			}

			if (url[1]) {
				this.url += '#' + url[1];
			}
		}

		return this;
	};

	this.toString = function() {
		return this.url;
	}

	return this;
};

phpfpm.status = function(url, delay) {
	this.url = phpfpm.url(url).addQueryString('json').toString();

	this.delay = delay;
	this.data =  {};
	this.previousData = {};
	this.dataBeforeError = {};
	this.lastFetch = null;
	this.fetchNumber = 0;
	this.fetchInProgress = false;
	this.callback = null;
	this.error = null;

	this.fetch = function() {
		if (!this.fetchInProgress) {
			this.lastFetch = +(new Date());
			this.fetchNumber++;
			this.fetchInProgress = true;

			var status = this;

			d3.json(this.url, function(error, data) {
					if (error) {
						status.error = error;
						status.dataBeforeError = status.data;
						status.previousData = {};
						status.data = {};
					} else {
						if (!status.error) {
							status.previousData = status.data;
						} else {
							status.error = null;
							status.previousData = status.dataBeforeError;
							status.dataBeforeError = {};
						}

						if (status.previousData['accepted conn'] && data['accepted conn'] < status.previousData['accepted conn']) {
							status.fetchNumber = 1;
						}

						status.data = data;
						status.data['accepted conn'] -= status.fetchNumber;

					}

					if (status.callback) {
						status.callback(status);
					}

					status.fetchInProgress = false;
				}
			);
		}

		return this;
	}

	this.get = function() {
		var now = +(new Date());

		if (!this.lastFetch || ((this.lastFetch + this.delay) < now)) {
			this.fetch();
		}

		return this.data;
	}

	this.getPrevious = function() {
		return this.previousData;
	}

	return this;
};

phpfpm.message = function(target, cssClass) {
	this.target = target;
	this.cssClass = cssClass;
	this.container = null;

	this.show = function(message) {
		if (!this.container) {
			this.container = this.target
				.append('div')
					.attr('class', this.cssClass)
					.style('position', 'absolute')
					.style('top', 0)
					.style('left', 0)
					.style('width', this.target.style('width'))
					.style('height', this.target.style('height'))
					.style('line-height', this.target.style('height'))
					.style('z-index', 1)
			;
		}

		this.container.text(message);

		return this;
	};

	this.hide = function() {
		if (this.container) {
			this.container.remove();
			this.container = null;
		}

		return this;
	}

	return this;
};

phpfpm.monitoring = function(url, step) {
	if (!step) {
		step = 1000;
	}

	this.start = +(new Date());
	this.status = phpfpm.status(url, step);
	this.context = cubism.context()
		.serverDelay(0)
		.clientDelay(0)
		.step(step)
	;

	this.getMetric = function(name, metricName) {
		var monitoring = this;

		return this.context.metric(function(start, stop, step, callback) {
				var values = [];

				start = +start;

				if (start >= monitoring.start) {
					stop = +stop;

					while (start < stop) {
						start += step;

						var value = monitoring.status.get()[name];

						if (value) {
							values.push(value);
						}
					}
				}

				callback(null, values);
			},
			(metricName ? metricName : name)
		);
	};

	this.getDiffMetric = function(name, metricName) {
		var monitoring = this;

		return this.context.metric(function(start, stop, step, callback) {
				var values = [];

				start = +start;

				if (start >= monitoring.start) {
					stop = +stop;

					while (start < stop) {
						start += step;

						var value = monitoring.status.get()[name] - monitoring.status.getPrevious()[name];

						if (value) {
							values.push(value);
						}
					}
				}

				callback(null, values);
			},
			metricName
		);
	};

	this.getData = function() {
		return [
			this.getMetric('accepted conn', 'total conn'),
			this.getDiffMetric('accepted conn', '~ total conn'),
			this.getMetric('active processes'),
			this.getDiffMetric('active processes', '~ active processes'),
			this.getMetric('idle processes'),
			this.getDiffMetric('idle processes', '~ idle processes'),
			this.getMetric('total processes'),
			this.getDiffMetric('total processes', '~ total processes'),
			this.getMetric('max active processes'),
			this.getMetric('max children reached'),
			this.getMetric('listen queue'),
			this.getDiffMetric('listen queue', '~ listen queue'),
			this.getMetric('max listen queue')
		];
	};

	this.display = function(target, cssClass) {
		target = d3.select(target);

		if (target) {
			this.start = +(new Date());

			var size = parseInt(target.style('width'), 10);

			this.context
				.size(size)
				.on("focus", function(i) {
						d3.selectAll(".value").style("right", i == null ? null : size - i + "px");
					}
				)
			;

			var phpfpmCssClass = 'phpfpm';

			if (cssClass) {
				phpfpmCssClass += ' ' + cssClass;
			}

			target
				.attr('class', phpfpmCssClass)
				.attr('position', 'relative')
			;

			var title = target
				.append('h1')
				.attr('class', 'title')
			;

			var error = phpfpm.message(target, 'error');

			this.status.callback = function(status) {
				if (status.error) {
					error.show('Error: ' + status.error);
				} else {
					error.hide();

					title.text('Pool ' + status.data['pool'] + ' (' + status.data['process manager'] + ') started since ' + new Date(status.data['start time'] * 1000));
				}
			};

			this.status.fetch();

			var monitoring = this;

			target
				.append('div')
				.attr('class', 'graphe')
				.call(function(graphe) {
						graphe.append('div')
							.attr('class', 'axis')
							.call(monitoring.context.axis().orient('top'))
						;

						graphe.selectAll('.horizon')
						  .data(monitoring.getData())
							 .enter()
								.append('div')
									.attr('class', function(d) { return 'horizon ' + d.toString().replace(/\s+/g, ''); })
									.call(function(horizon) {
											return monitoring.context.horizon().format(d3.format('d')).colors([ '#0d58f1', '#568bf5', '#9fbdfa', '#e8effe', '#feefe8', '#fabd9f', '#f58b56', '#f1580d' ])(horizon);
										}
									)
						;

						graphe.append('div')
							.attr('class', 'rule')
							.call(monitoring.context.rule())
						;
					}
				)
			;
		}

		return this;
	}

	return this;
};
})(cubism);
