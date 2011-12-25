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
	 * @param {String} name データベース名
	 * @param {Number} version バージョン番号
	 * @param {Object} optionalParameters 引数オブジェクト
	 * @param {Boolean} optionalParameters.autoOpen 自動的に接続する。デフォルト値はtrueなので、
	 *     自動で接続したくない場合のみ明示的にfalseを指定する。
	 * @param {Function} success 接続成功時の処理。
	 *     ({IDBDatabase} データベースオブジェクト)
	 *     optionalParameters.connectがfalseの場合は無視される。
	 * @param {Function} error 接続失敗時の処理。
	 *     ({Event} イベントオブジェクト)
	 *     optionalParameters.connectがfalseの場合は無視される。
	 * @param {Function} upgrade バージョン更新処理 
	 *     ({Number|String} oldVersion 更新前バージョン,
	 *      {Number|String} newVersion 更新後バージョン)
	 *     optionalParameters.connectがfalseの場合は無視される。
	 * @param {Array} optionalParameters.models JaidModelのリスト
	 * @param {String} optionalParameters.modelPrefix モデルに追加するメソッド名のプリフィックス
	 * @param {Array} optionalParameters.versionHistory バージョン更新履歴
	 * @property {String} dbName データベース名
	 * @property {Number} dbVersion バージョン番号
	 * @property {IDBDatabase} db 接続中のデータベースオブジェクト
	 * @property {String} modelProperty オブジェクトからモデル定義を取得するためのプロパティ名
	 */
	var Jaid = function(name, version, optionalParameters){
		optionalParameters = optionalParameters || {};
		this.db;
		this.name = name;
		this.version = version;
		this.models = optionalParameters.models || [];
		this.versionHistory = optionalParameters.versionHistory || [];
		this._modelPrefix = optionalParameters.modelPrefix || '';
		//モデルの紐付け
		for(var i=0; i<this.models.length; i++){
			this.models[i]._init(this._modelPrefix);
		}
		if(optionalParameters.autoOpen !== false)
			this.open(optionalParameters.success, optionalParameters.error, optionalParameters.upgrade);
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
			var versionHistoryKeys;
			if(oldVersion === 1 || oldVersion === ''){
				//新規作成の場合
				//すべてのオブジェクトストアとインデックスを作成する
				for(var i=0; i<this.models.length; i++){
					this._createObjectStore(this.models[i]);
				}
			}else{
				//更新の場合
				if(this.versionHistory){
					versionHistoryKeys  = Object.keys(this.versionHistory);
					versionHistoryKeys.sort();
					//バージョンの古い方の履歴から順に実行していく
					for(var i=0; i<versionHistoryKeys.length; i++){
						if(versionHistoryKeys[i] <= oldVersion){
							continue;
						}
						var upgradeVersion = versionHistoryKeys[i];
						var upgradeOperate = this.versionHistory[upgradeVersion];
						var createdObjectStores = [];
						if('remove' in upgradeOperate){
							//オブジェクトストア削除
							for(var j=0; j<upgradeOperate.remove.length; j++){
								this._deleteObjectStore(upgradeOperate.remove[j]);
							}
						}
						if('create' in upgradeOperate){
							//オブジェクトストア作成
							for(var j=0; j<upgradeOperate.create.length; j++){
								for(var k=0; k<this.models.length; k++){
									if(upgradeOperate.create[j] == this.models[k].name){
										this._createObjectStore(this.models[k]);
										break;
									}
								}
							}
							createdObjectStores = upgradeOperate.create;
						}
						//各オブジェクトストアにおけるindexの作成・削除
						for(var j=0; j<this.models.length; j++){
							if(createdObjectStores.length &&
							   createdObjectStores.indexOf(this.models[j].name) != -1 ||
							   !this.models[j].versionHistory ||
							   !this.models[j].versionHistory[upgradeVersion]
							   ){
								continue;
							}
							var model = this.models[j];
							var modelUpgradeOperate = model.versionHistory[upgradeVersion];
							var objectStore = tx.objectStore(model.name);
							if('remove' in modelUpgradeOperate){
								for(var k=0; k<modelUpgradeOperate.remove.length; k++){
									this._deleteIndex(objectStore, modelUpgradeOperate.remove[k]);
								}
							}
							if('create' in modelUpgradeOperate){
								for(var k=0; k<modelUpgradeOperate.remove.length; k++){
									this._createIndex(objectStore, modelUpgradeOperate.create[k]);
								}
							}
						}
					}
				}
			}
			callback && callback(oldVersion);
		},
		/**
		 * オブジェクトストアを作成する
		 * 
		 * なお、optionsの指定方法がIDBObjectStoreParametersに
		 * 変わるらしいのでブラウザで実装され次第、対応する。
		 * @private
		 * @param {JaidModel} model
		 */
		_createObjectStore: function(model){
			var options = {
					keyPath: model.keyProperty,
					autoIncrement: model.autoIncrement
		    	},
		    	store = this.db.createObjectStore(model.name, options);
			for(var i=0; i<model.properties.length; i++){
				if(!!model.properties[i].index){
					this._createIndex(store, model.properties[i]);
				}
			}
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
		 * オブジェクトストアにindexを作成する
		 * 
		 * なお、optionsの指定方法がIDBIndexOptionalParametersに
		 * 変わるらしいのでブラウザで実装され次第、対応する。
		 * @param {IDBObjectStore} store オブジェクトストア
		 * @param {JaidProperty} property インデックスを作成するプロパティ
		 */
		_createIndex: function(store, property){
			var options = {
					unique: property.unique,
					//multiEntryは古いブラウザでは実装されていないので、
					//実装されたChrome17とFirefox11がStableになるまで対応しないことにする。
					//multiEntry: property.multiEntry
				};
			store.createIndex(property.name, property.name, options);
		},
		/**
		 * オブジェクトストアからindexを削除する
		 * @param {IDBObjectStore} store オブジェクトストア
		 * @param {String} indexName index名
		 */
		_deleteIndex: function(store, indexName){
			return store.deleteIndex(indexName);
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
		 * トランザクションの実行
		 * @param {Array} objectStoreList トランザクション範囲とするオブジェクトストアのリスト
		 * @param {Boolean} writable 書き込みを伴うかどうか
		 * @param {Function} txFunction トランザクションの本体
		 * @param {Function} complete トランザクション完了後の処理
		 * @param {Function} abort トランザクション中止後の処理
		 */
		execTransaction: function(objectStoreList, writable, txFunction, complete, abort){
			var transaction = this.db.transaction(
					(objectStoreList && objectStoreList.length)? objectStoreList : this.db.objectStoreNames,
					(writable)? this.IDBTransaction.READ_WRITE : this.IDBTransaction.READ_ONLY
				);
			transaction.oncomplete = complete;
			transaction.onabort = abort;
			
			//トランザクション処理実行
			txFunction(transaction);
			
			return transaction;
		},
		/**
		 * DBに保存されているデータをモデルオブジェクトに読み込む
		 * @param {Object|Array} 読み込みたいオブジェクト、または配列
		 */
		get: function(object, success, error){
			var self = this;
			object = this._toArray(object);
			var objectStoreList = this._getObjectStoreList(object);
			var tx = this.execTransaction(objectStoreList, false, function(tx){
				object.forEach(function(obj){
					var model = obj[self._modelPrefix+'model'];
					var objectStore = tx.objectStore(model.name);
					var req = objectStore.get(obj[model.keyProperty]);
					req.onsuccess = function(e){
						if(this.result){
							obj[self._modelPrefix+'import'](this.result);
						}
					};
				}, function(){
					tx.abort();
				});
			}, success, error);
		},
		getByIndex: function(object, property, success, error){
			var self = this;
			object = this._toArray(object);
			var objectStoreList = this._getObjectStoreList(object);
			var tx = this.execTransaction(objectStoreList, false, function(tx){
				object.forEach(function(obj){
					var model = obj[self._modelPrefix+'model'];
					var objectStore = tx.objectStore(model.name);
					var req = objectStore.index(property).get(obj[property]);
					req.onsuccess = function(e){
						if(this.result){
							obj[self._modelPrefix+'import'](this.result);
						}
					};
				}, function(){
					tx.abort();
				});
			}, success, error);
		},
		/**
		 * モデルオブジェクトのデータをDBに保存する
		 * @param {Object|Array} 保存したいオブジェクト、または配列
		 */
		put: function(object, success, error){
			var self = this;
			object = this._toArray(object);
			var objectStoreList = this._getObjectStoreList(object);
			var tx = this.execTransaction(objectStoreList, true, function(tx){
				object.forEach(function(obj){
					var model = obj[self._modelPrefix+'model'];
					var objectStore = tx.objectStore(model.name);
					var dataObject = obj[self._modelPrefix+'export']();
					var req = objectStore.put(dataObject);
					req.onsuccess = function(){
						obj[model.keyProperty] = this.result;
					}
				}, function(){
					tx.abort();
				});
			}, success, error);
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
        		this.indexedDB.deleteDatabase(this.name);
        		callback && callback();
    		}else{
    			//定義されていない場合はバージョン番号を空文字列に変更して、
    			//全てのオブジェクトストアを削除
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
		},
		_toArray: function(object){
			return (Array.isArray(object))? object : [object] ;
		},
		_getObjectStoreList: function(object){
			var objectStoreList = [];
			for(var i=0; i<object.length; i++){
				var model = object[i][this._modelPrefix+'model'];
				if(objectStoreList.indexOf(model.name) == -1){
					objectStoreList.push(model.name);
				}
			}
			return objectStoreList;
		}
	};
	

	/**
	 * JaidModel - オブジェクトストアのモデル定義
	 * @constructor
	 * @param {String} name オブジェクトストア名
	 * @param {Function} cls オブジェクトストアとひもづけたいクラス(のコンストラクタ関数)
	 * @param {Array} properties DBに保存するプロパティリスト
	 * @param {Object} optionalParameters
	 * @param {Object} optionalParameters.versionHistory バージョン変更履歴
	 */
	var JaidModel = function(name, cls, properties, optionalParameters){
		optionalParameters = optionalParameters || {};
		this.name = name;
		this.cls = cls;
		this.versionHistory = optionalParameters.versionHistory;
		this.properties = properties || [];
		//キーとなるプロパティを探す(out-of-lineキーには対応しない)
		this.keyPropery;
		this.autoIncrement;
		for(var i=0; i<this.properties.length; i++){
			if(this.properties[i].key){
				this.keyProperty = this.properties[i].name;
				this.autoIncrement = !!this.properties[i].autoIncrement;
				break;
			};
		};
		if(!this.keyProperty){
			throw new Error('Key property not found.');
		}
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
					if(this[property.name] !== null && this[property.name] !== undefined){
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
	 * @param {Object} optionalParameters オプション
	 * @param {Boolean} optionalParameters.index trueにするとこのプロパティがキーとなる。
	 * @param {Boolean} optionalParameters.autoIncrement キー指定時のオートインクリメント指定
	 * @param {Boolean} optionalParameters.index trueにするとこのプロパティがインデックス化される。
	 * @param {Boolean} optionalParameters.unique インデックス化時のユニーク指定
	 * @param {Boolean} optionalParameters.multiEntry インデックス化時のマルチエントリー指定
	 * @param {Object} optionalParameters.formatter
	 * @param {Function} optionalParameters.formatter.onsave オブジェクトからIndexedDBへデータを書き出すときの変換関数
	 * @param {Function} optionalParameters.formatter.onload IndexedDBからオブジェクトへデータを読み込むときの変換関数
	 */
	var JaidProperty = function(name, optionalParameters){
		this.name = name;
		optionalParameters = optionalParameters || {};
		this.key = !!optionalParameters.key;
		this.autoIncrement = this.key && !!optionalParameters.autoIncrement;
		this._index = !!optionalParameters.index;	//インデックス化するかどうか
		this.index = (this._index)? optionalParameters.index : null;
		this.unique = !!optionalParameters.unique;
		this.multiEntry = !!optionalParameters.multiEntry;
		if(optionalParameters.formatter){
			this.onsave = optionalParameters.formatter.onsave;
			this.onload = optionalParameters.formatter.onload;
		}
	};
	JaidProperty.prototype = {
		isIndex: function(){
			return this._index;
		}
	};
	JaidProperty.FORMATTER = {
		JSON: {
			onsave: function(val){return JSON.stringfy(val);},
			onload: function(val){return JSON.parse(val);}
		}
	}
	
	//もしグローバル変数名が競合した場合はここを変更する
	window.Jaid = Jaid;
	window.JaidModel = JaidModel;
	window.JaidProperty = JaidProperty;
})(window);