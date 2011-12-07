/**
 * Jaid - Jane Indexed Database library
 * 
 * @version 0.0.1
 * @author mzsm mizushima@janesoft.net
 * @license <a href="http://www.opensource.org/licenses/mit-license.php">The MIT License</a>
 */

(function(window){
	/**
	 * Jaid
	 * @constructor
	 * @param {Object} options 引数オブジェクト
	 * @param {String} options.name データベース名
	 * @param {Number} options.version バージョン番号
	 * @param {Boolean} options.connect 自動的に接続する。デフォルト値はtrueなので、
	 *     自動で接続したくない場合のみ明示的にfalseを指定する。
	 * @param {Function} success 接続成功時の処理。
	 *     ({IDBDatabase} データベースオブジェクト)
	 *     options.connectがfalseの場合は無視される。
	 * @param {Function} error 接続失敗時の処理。
	 *     ({Event} イベントオブジェクト)
	 *     options.connectがfalseの場合は無視される。
	 * @param {Function} upgrade バージョン更新処理 
	 *     ({Number|String} oldVersion 更新前バージョン,
	 *      {Number|String} newVersion 更新後バージョン)
	 *     options.connectがfalseの場合は無視される。
	 * @param {Array} options.models モデル定義を含むクラスのリスト
	 * @param {String} options.modelProp モデル定義を格納しているプロパティ名。
	 *     デフォルト値は"jaidModel"。
	 * @property {String} dbName データベース名
	 * @property {Number} dbVersion バージョン番号
	 * @property {IDBDatabase} db 接続中のデータベースオブジェクト
	 * @property {String} modelProperty オブジェクトからモデル定義を取得するためのプロパティ名
	 */
	var Jaid = function(options){
		this.name = options.name;
		this.version = options.version;
		this.models = options.models || [];
		this.modelProp = options.modelProp || 'jaidModel';
		this.db;
		if(!options.autoOpen)
			this.open(success, error, versionchange);
	};
	Jaid.prototype = {
		/**
		 * IDBFactoryオブジェクト。ブラウザ毎の差異を吸収
		 * @type IDBFactory
		 */
		indexedDB: window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB,
		/**
		 * IDBCursorオブジェクト。ブラウザ毎の差異を吸収
		 * @type IDBCursor
		 */
		IDBCursor: window.IDBCursor || window.webkitIDBCursor || window.msIDBCursor,
		/**
		 * IDBKeyRangeオブジェクト。ブラウザ毎の差異を吸収
		 * @type IDBKeyRange
		 */
		IDBKeyRange: window.IDBKeyRange|| window.webkitIDBKeyRange ||  window.msIDBKeyRange,
		/**
		 * IDBTransactionオブジェクト。ブラウザ毎の差異を吸収
		 * @type IDBTransaction
		 */
		IDBTransaction: window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction,
		/**
		 * データベースとの接続を開く。
		 * @param {Function} success 接続成功時の処理
		 *     ({IDBDatabase} データベースオブジェクト)
		 * @param {Function} error 接続失敗時の処理
		 *     ({Event} イベントオブジェクト)
		 * @param {Function} upgrade バージョン更新処理 
		 *     ({Number|String} oldVersion 更新前バージョン,
		 *      {Number|String} newVersion 更新後バージョン)
		 */
		open: function(success, error, upgrade){
			var self = this;
			//DBへの接続を開く
			//open Database
			var idbOpen = self.indexedDB.open(self.name, self.version);
			//idbOpenの型によって仕様のバージョンを確認
			//detect specification version
			var idbOpenType = idbOpen.toString();
			if(idbOpenType == '[object IDBOpenDBRequest]'){
				//新仕様
				//W3C Working Draft 06 December 2011 (or newer)
				//eg. Firefox Aurora 10.0a2, Firefox Nightly 11.0a1
				idbOpen.onsuccess = function(e){
					self.db = e.target.result;
					success && success(self.db);
				};
				idbOpen.onblocked = error ? error : function(){};
				idbOpen.onupgradeneeded = function(e){
					self.IDBDatabase = e.target.result;
					upgrade && upgrade(e.oldVersion, e.newVersion);
				};
			}else if(idbOpenType == '[object IDBRequest]'){
				//旧仕様
				//W3C Working Draft 19 April 2011 (or older)
				//eg. Chrome 15, Chrome 17 (canary), Firefox 8
				idbOpen.onsuccess = function(e){
					self.db = e.target.result;
					//バージョン確認
					var oldVersion = self.getVersion();
					if(oldVersion == self.version){
						success && success(db);
					}else{
						//DBバージョン変更
						var setVer = self.db.setVersion(self.version);
						setVer.onsuccess = function(e){
							upgrade && upgrade(oldVersion, self.version);
							success && success(db);
						};
						setVer.onerror = error ? error : function(){};
					}
				};
				idbOpen.onerror = error ? error : function(){};
			}else{
				throw new Error('Unknown specification version');
			}
		},
		/**
		 * データベースとの接続を閉じる。
		 * @returns void
		 */
		close: function(){
			this.db.close();
			this.db = null;
		},
		getVersion: function(){
			if(this.db)
				return this.db.version;
			else
				throw new Error('not initialized.');
		}
	};
	

	/**
	 * JaidModel - オブジェクトストアのモデル定義
	 * @constructor 
	 * @param name
	 * @param options
	 * @property {String} name オブジェクトストア名
	 * @property {String} keyProp オブジェクト内でキーを格納しているプロパティ名
	 * @property {Boolean} autoIncrement キーIDを自動的に付与するかどうか
	 * @property {Array} properties プロパティリスト
	 */
	var JaidModel = function(name, options){
		this.name = name;
		this.keyProp = options.keyProp;
		this.autoIncrement = !!options.autoIncrement || false;
		this.properties = options.properties || [];
		//キープロパティが保存対象に含まれていればin-line key、なければout-of-line keyとなる。
		this._keyPath = null;
		for(var i=0; i<this.properties.length; i++){
			if(this.properties[i].name == this.keyProp){
				this._keyPath = this.keyProp;
			};
		};
	};
	JaidModel.prototype = {
		/**
		 * Indexed DBに保存するためのオブジェクトを生成します
		 * @param 
		 * @param 
		 * @returns obj オブジェクト
		 */
		exportToDB: function(object, dataObj){
			dataObj = dataObj || {};
			for(var i=0; i<this.properties.length; i++){
				var property = this.properties[i];
				if(object[property.name] || property.name != this._keyPath){
					dataObj[property.name] = property.onsave(object[property.name]);
				};
			};
			return dataObj;
		},
		/**
		 * Indexed DBからオブジェクトへデータを読み込むときにデータの整形を行います。
		 * @param dataObj
		 * @param {Array} exclude 読み込まないプロパティ
		 * @returns obj オブジェクト
		 */
		importFromDB: function(object, dataObj, exclude){
			exclude = exclude || [];
			for(var i=0; i<this.properties.length; i++){
				var property = this.properties[i];
				if(!exclude.length || property.name.indexOf(exclude) == -1){
					object[property.name] = property.onload(dataObj[property.name]);
				};
			};
			return object;
		}
	};
	
	/**
	 * JIDBProperty - プロパティ
	 * @constructor
	 * @param {String} name プロパティ名
	 * @param {Object} options オプション
	 * @param {Boolean} options.index インデックス化
	 * @param {Boolean} options.unique ユニーク指定
	 * @param {Boolean} options.multientry マルチエントリー指定
	 * @param {String} options.indexName インデックス名
	 * @param {Function} options.onload IndexedDBからオブジェクトへデータを読み込むときの変換関数
	 * @param {Function} options.onsave オブジェクトからIndexedDBへデータを書き出すときの変換関数
	 */
	var JaidProperty = function(name, options){
		this.name = name;
		options = options || {};
		this.index = !!options.index;
		this.unique = !!options.unique;
		this.multientry = !!options.multientry;
		this.indexName = options.indexName || this.name;
		this.onload = options.onload || function(v){return v;};
		this.onsave = options.onsave || function(v){return v;};
	};
	
	window.Jaid = Jaid;
	window.JaidModel = JaidModel;
	window.JaidProperty = JaidProperty;
})(window);