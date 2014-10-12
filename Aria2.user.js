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

		this.id = parseInt (options, 10) || (0 + new Date());
	};
	
	// 静态常量
	AriaBase.AUTH = {
		noAuth: 0,
		user:   1,
		secret: 2
	};

	// public 函数
	AriaBase.prototype = {
		getAuthString: function () {
			var user = this.options.auth.user,
				pass = this.options.auth.pass;

			switch ( this.options.auth.type ) {
				case AriaBase.AUTH.noAuth:
					return '';

				case AriaBase.AUTH.user:
					break;
				
				case AriaBase.AUTH.secret:
					user = 'token';
					break;

				default:
					throw new Error('Undefined auth type: %s', this.options.auth.type);
					break;
			}

			return btoa (_format('%s:%s', user, pass));
		},

		send: function ( data, cbSuccess, cbError ) {
			var payload = {

				method: 'POST',
				url: _format('http://%s:%s/jsonrpc', this.options.host, this.options.port),
				headers: {
					'Content-Type': 'application/json; charset=UTF-8'
				},
				data: JSON.stringify ( _merge ({ jsonrpc: jsonrpc_ver, id: this.id }, data) ),
				onload: function (r) {
					if (cbSuccess)
						cbSuccess (JSON.parse (r.responseText));
				},
				onerror: cbError
			};

			if (this.options.auth.type !== AriaBase.AUTH.noAuth) {
				payload.headers.Authorization = 'Basic ' + this.getAuthString();
			}

			return GM_xmlhttpRequest (payload);
		}
	};


	// 添加各类函数
	var that = this;
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
					cbSuccess =args[args.length - 1];
					args.splice (-1, 1);
				}
			}

			return this.send ({
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