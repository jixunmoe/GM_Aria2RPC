// Public Class Aria2 ( options )
var Aria2 = (function (_merge, _format, _isFunction) {
	var jsonrpc_ver = '2.0';

	// I'm lazy
	if (typeof GM_xmlhttpRequest == 'undefined') {
		console.error ('GM_xmlhttpRequest is required for `Aria2.jsonrpc` to work.');
		return null;
	}

	var AriaBase = function ( options ) {
		this.options = _merge ({
			auth: {
				type: AriaBase.AUTH.noAuth,
				user: '',
				pass: ''
			},
			host: '127.0.0.1',
			port: 6800
		}, options || {});

		this.id = parseInt (options, 10) || (+ new Date());
	};
	
	// 静态常量
	AriaBase.AUTH = {
		noAuth: 0,
		basic:  1,
		secret: 2
	};

	// public 函数
	AriaBase.prototype = {
		getBasicAuth: function () {
			return btoa (_format('%s:%s', this.options.auth.user, this.options.auth.pass));
		},

		send: function ( bIsDataBatch, data, cbSuccess, cbError ) {
			var srcTaskObj = { jsonrpc: jsonrpc_ver, id: this.id };

			var payload = {

				method: 'POST',
				url: _format('http://%s:%s/jsonrpc', this.options.host, this.options.port),
				headers: {
					'Content-Type': 'application/json; charset=UTF-8'
				},
				data: bIsDataBatch
					? { params: data.map (function (e) { return _merge ({}, srcTaskObj, e); }) }
					: _merge ({}, srcTaskObj, data),
				onload: function (r) {
					var repData = JSON.parse (r.responseText);
					if (repData.error) {
						cbError && cbError (false, repData);
					} else {
						cbSuccess && cbSuccess (repData);
					}
				},
				onerror: cbError ? cbError.bind(null, false) : null
			};

			switch (this.options.auth.type) {
				case AriaBase.AUTH.noAuth:
					// DO NOTHING
					break;

				case AriaBase.AUTH.basic:
					payload.headers.Authorization = 'Basic ' + this.getBasicAuth();
					break;

				case AriaBase.AUTH.secret:
					if (!payload.data.params)
						payload.data.params = [];

					payload.data.params.splice(0, 0, _format('token:%s', this.options.auth.pass));
					break;

				default:
					throw new Error('Undefined auth type: %s', this.options.auth.type);
			}

			payload.data = JSON.stringify ( payload.data );

			return GM_xmlhttpRequest (payload);
		},

		// batchAddUri ( foo, { uri: 'http://example.com/xxx', options: { ... } } )
		batchAddUri: function (fCallback) {
			// { url, name }
			var payload = [].slice.call (arguments, 1).map (function (arg) {
				return {
					method: 'aria2.addUri',
					params: [ arg.uri.map ? arg.uri : [ arg.uri ] ].concat (arg.options || [])
				};
			});
			
			return this.send (true, payload, fCallback, fCallback);
		}
	};


	// 添加各类函数
	[
		"addUri", "addTorrent", "addMetalink", "remove", "forceRemove",
		"pause", "pauseAll", "forcePause", "forcePauseAll", "unpause",
		"unpauseAll", "tellStatus", "getUris", "getFiles", "getPeers",
		"getServers", "tellActive", "tellWaiting", "tellStopped",
		"changePosition", "changeUri", "getOption", "changeOption",
		"getGlobalOption", "changeGlobalOption", "getGlobalStat",
		"purgeDownloadResult", "removeDownloadResult", "getVersion",
		"getSessionInfo", "shutdown", "forceShutdown", "saveSession"
	].forEach (function (sMethod) {
		// arg1, arg2, ... , [cbSuccess, [cbError]]
		AriaBase.prototype[sMethod] = function ( ) {
			var args = [].slice.call (arguments);

			var cbSuccess, cbError;
			if (args.length && _isFunction(args[args.length - 1])) {
				cbSuccess = args[args.length - 1];
				args.splice (-1, 1);

				if (args.length && _isFunction(args[args.length - 1])) {
					cbError = cbSuccess;
					cbSuccess = args[args.length - 1];
					args.splice (-1, 1);
				}
			}

			return this.send (false, {
				method: 'aria2.' + sMethod,
				params: args
			}, cbSuccess, cbError);
		};
	});
	
	return AriaBase;
})
// private 函数
((function (base) {
	var _isObject = function (obj) {
		return obj instanceof Object;
	};
	var _merge = function (base) {
		var args = arguments,
			argL = args.length;
		for ( var i = 1; i < argL; i++ ) {
			Object.keys (args[i]).forEach (function (key) {
				if (_isObject(args[i][key]) && _isObject(base[key])) {
					base[key] = _merge (base[key], args[i][key]);
				} else {
					base[key] = args[i][key];
				}
			});
		}
		return base;
	};
	return _merge;
})(), function (src) {
	var args = arguments,
		argL = args.length;

	var ret = src.slice ();
	for ( var i = 1; i < argL; i++ )
		ret = ret.replace ('%s', args[i]);
	return ret;
}, function (foo) {
	return typeof foo === 'function'
});