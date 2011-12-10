/**
 * Jaid - Jane Indexed Database library
 * 
 * @version 0.0.1a
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
	 * @param {Boolean} options.autoOpen 自動的に接続する。デフォルト値はtrueなので、
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
	 * @param {Array} options.models JaidModelのリスト
	 * @param {String} options.modelPrefix モデルに追加するメソッド名のプリフィックス
	 * @param {Array} options.versionHistory バージョン更新履歴
	 * @property {String} dbName データベース名
	 * @property {Number} dbVersion バージョン番号
	 * @property {IDBDatabase} db 接続中のデータベースオブジェクト
	 * @property {String} modelProperty オブジェクトからモデル定義を取得するためのプロパティ名
	 */
	var Jaid = function(options){
		this.db;
		this.name = options.name;
		this.version = options.version;
		this.models = options.models || [];
		this.versionHistory = options.versionHistory || [];
		this._modelPrefix = options.modelPregix || '';
		//モデルの紐付け
		for(var i=0; this.models.length; i++){
			this.models[i]._init();
		}
		if(options.autoOpen !== false)
			this.open(options.success, options.error, options.upgrade);
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
					self.db = e.target.result;
					var tx = e.target.transaction;
					self._upgrade(tx, e.oldVersion, upgrade);
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
						success && success(self.db);
					}else{
						//DBバージョン変更
						var setVer = self.db.setVersion(self.version);
						setVer.onsuccess = function(e){
							//バージョン変更に伴う更新処理
							var tx = e.target.transaction;
							self._upgrade(tx, oldVersion, upgrade);
							success && success(self.db);
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
		 * バージョン変更に伴う更新処理を行う
		 * @private
		 * @param {IDBTransaction} tx トランザクション
		 * @param {oldVersion} 更新前のバージョン番号
		 * @param {Function} callback コールバック関数
		 */
		_upgrade: function(tx, oldVersion, callback){
			if(oldVersion == 0 || oldVersion == ''){
				//新規作成の場合
				//すべてのオブジェクトストアとインデックスを作成する
				for(var i=0; i<this.models.length; i++){
					var model = this.models[i];
					this.createObjectStore(model);
				}
			}else{
				//更新の場合
				
				for(var i=0; i<this.models.length; i++){
					var model = this.models[i];
					this.createObjectStore(model);
				}
			}
			callback && callback(oldVersion);
		},
		/**
		 * オブジェクトストアを作成する
		 * 
		 * なお、optionsの指定方法がIDBObjectStoreParametersとIDBIndexOptionalParametersに
		 * 変わるらしいのでブラウザで実装され次第、対応する。
		 * @private
		 * @param {JaidModel} model
		 */
		_createObjectStore: function(model){
			var options = {
					keyPath: model._keyPath,
					autoIncrement: model.autoIncrement
		    	},
		    	store = this.IDBDatabase.createObjectStore(model.name, options);
			for(var i=0; i<model.properties.length; i++){
				var property = model.properties[i];
				var options = {
						unique: property.unique,
						multiEntry: property.multiEntry
					};
				if(property.index){
					store.createIndex(property.name, property.keyPath, options);
				};
			};
		},
		/**
		 * オブジェクトストアを削除する
		 * @private
		 * @param {String} objectStoreName 削除するオブジェクトストア名
		 */
		_deleteObjectStore: function(objectStoreName){
			//作成時と違って特に何をするでも無いので引数は名前だけで良い
			return this.db.deleteObjectStore(objectStoreName);
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
		},
		/**
		 * データベースを削除する
		 * @param {Function} callback 削除完了後に実行するコールバック関数
		 */
		deleteDatabase: function(callback){
			//接続を切断
			if(this.db){
				this.close();
			}
    		if('deleteDatabase' in this.indexedDB){
    			//deleteDatabaseが定義されている場合は実行
    			//eg. Firefox Aurora 10.0a2, Firefox Nightly 11.0a1
        		this.indexedDB.deleteDatabase(this.name);
        		callback && callback();
    		}else{
    			//定義されていない場合はバージョン番号を空文字列に変更して、
    			//全てのオブジェクトストアを削除
    			//eg. Chrome 15, Chrome 17 (canary), Firefox 8
    			var self = this;
    			this.version = '';
    			this.connect(
    				function(){
    					throw new Error('deleted already');
    				},
    				function(){
    					throw new Error('cannot delete database');
    				},
    				function(){
    					var objectStoreNames = self.db.objectStoreNames;
    					for(var i=0; i < objectStoreNames.length; i++){
    						this.deleteObjectStore(objectStoreNames[i]);
    					};
    					this.close();
    					callback && callback();
    				}
    			);
    		}
		}
	};
	

	/**
	 * JaidModel - オブジェクトストアのモデル定義
	 * @constructor
	 * @param {Object} options
	 * @param {String} options.name オブジェクトストア名
	 * @param {Function} options.cls オブジェクトストアとひもづけたいクラス(のコンストラクタ関数)
	 * @property {String} name オブジェクトストア名
	 * @property {String} keyProperty オブジェクト内でキーを格納しているプロパティ名
	 * @property {Boolean} autoIncrement キーIDを自動的に付与するかどうか
	 * @property {Array} properties DBに保存するプロパティリスト
	 * @property {Object} versionHistory
	 */
	var JaidModel = function(options){
		this.name = options.name;
		this.cls = options.cls;
		this.keyProperty = options.keyProperty;
		this.autoIncrement = !!options.autoIncrement || false;
		this.properties = options.properties || [];
		//キープロパティが保存対象に含まれていればin-line key、なければout-of-line keyとなる。
		this._keyPath = null;
		for(var i=0; i<this.properties.length; i++){
			if(this.properties[i].name == this.keyProperty){
				this._keyPath = this.keyProperty;
				break;
			};
		};
	};
	JaidModel.prototype = {
		_init: function(prefix){
			var model = this;
			//オブジェクトのprototypeにいくつかのプロパティとメソッドを追加
			this.cls.prototype[prefix+'model'] = this;
			/**
			 * IndexedDBに保存できる形式のオブジェクトを生成します。
			 * 通常は新しいオブジェクトを生成して返しますが、第2引数にオブジェクトを渡すと
			 * そのオブジェクトを上書きします。
			 * @param {Object} dataObj 上書きしたいオブジェクト(省略可能)
			 * @returns {Object} dataObj IndexedDBに保存できる形式のオブジェクト
			 */
			this.cls.prototype[prefix+'export'] = function(dataObj){
				//このメソッド中のthisはデータオブジェクトを示す。
				dataObj = dataObj || {};
				for(var i=0; i<model.properties.length; i++){
					var property = model.properties[i];
					if(this[property.name] || property.name != model._keyPath){
						dataObj[property.name] = property.onsave? property.onsave(this[property.name]): this[property.name];
					};
				};
				return dataObj;
			};
			/**
			 * IndexedDBから取り出したデータをオブジェクトへ読み込みます。
			 * @param dataObj IndexedDBから取り出したデータの格納されたオブジェクト
			 * @param modelObj データを上書きしたいモデルオブジェクト
			 * @param {Array} exclude 読み込まないプロパティ
			 * @returns obj オブジェクト
			 */
			this.cls.prototype[prefix+'import'] = function(dataObj, exclude){
				//このメソッド中のthisはデータオブジェクトを示す。
				exclude = exclude || [];
				for(var i=0; i<model.properties.length; i++){
					var property = model.properties[i];
					if(!exclude.length || exclude.indexOf(property.name) == -1){
						this[property.name] = property.onload? property.onload(dataObj[property.name], this, dataObj) : dataObj[property.name];
					};
				};
			};
		}
	};
	
	/**
	 * JaidProperty - プロパティ
	 * @constructor
	 * @param {String} name プロパティ名
	 * @param {Object} options オプション
	 * @param {Boolean} options.index インデックス化
	 * @param {Boolean} options.unique ユニーク指定
	 * @param {Boolean} options.multiEntry マルチエントリー指定
	 * @param {String} options.indexName インデックス名
	 * @param {Function} options.onload IndexedDBからオブジェクトへデータを読み込むときの変換関数
	 * @param {Function} options.onsave オブジェクトからIndexedDBへデータを書き出すときの変換関数
	 */
	var JaidProperty = function(name, options){
		this.name = name;
		options = options || {};
		this.index = !!options.index;
		this.unique = !!options.unique;
		this.multiEntry = !!options.multiEntry;
		this.indexName = options.indexName || this.name;
		this.onload = options.onload;
		this.onsave = options.onsave;
	};
	
	//もしグローバル変数名が競合した場合はここを変更する
	window.Jaid = Jaid;
	window.JaidModel = JaidModel;
	window.JaidProperty = JaidProperty;
})(window);