/**
* Jaid - Jane Indexed Database library
*
* @version 0.0.1a
* @author mzsm j@mzsm.me
* @license <a href="http://www.opensource.org/licenses/mit-license.php">The MIT License</a>
*/
//var indexedDB = window.indexedDB;

var Jaid;
(function (Jaid) {
    var Database = (function () {
        function Database(param, version, objectStores) {
            this.version = 1;
            this.objectStores = [];
            this.onsuccess = function () {
            };
            this.onerror = function () {
            };
            this.onversionchange = function (event) {
            };
            this.upgradeHistory = {};
            if (typeof param === 'string') {
                this.name = param;
                this.version = version || this.version;
                this.objectStores = objectStores || this.objectStores;
            } else if (typeof param === 'Object' && !!param) {
                this.name = param.name || this.name;
                this.version = param.version || this.version;
                this.objectStores = param.objectStores || this.objectStores;
            }
        }
        Database.prototype.open = function () {
            var _this = this;
            var opener = indexedDB.open(this.name, this.version);
            opener.onsuccess = function (event) {
                var db = event.target.result;
                _this.connection = new Connection(db);
                _this.onsuccess(event);
            };
            opener.onerror = function (event) {
                var error = opener.error;
                _this.onerror(error, event);
            };
            opener.onupgradeneeded = function (event) {
                var req = event.target;
                var transaction = req.transaction;
                var db = req.result;

                if (event.oldVersion == 0) {
                    //initialize
                    _this.objectStores.forEach(function (params) {
                        _this._createObjectStore(db, params, event.newVersion);
                    });
                } else {
                    //migration
                    var createdObjectStores = {};
                    var droppedObjectStores = {};
                    var createdIndexes = {};
                    var droppedIndexes = {};
                    _this.objectStores.forEach(function (params) {
                        if (params.created > event.oldVersion) {
                            if (!(params.created in createdObjectStores)) {
                                createdObjectStores[params.created] = [];
                            }
                            createdObjectStores[params.created].push(params);
                        }
                        if (params.dropped && params.dropped > event.oldVersion) {
                            if (!(params.dropped in droppedObjectStores)) {
                                droppedObjectStores[params.dropped] = [];
                            }
                            droppedObjectStores[params.dropped].push(params);
                        }
                        params.indexes.forEach(function (p) {
                            if (p.created && p.created > event.oldVersion && (!params.created || p.created > params.created)) {
                                if (!(p.created in createdIndexes)) {
                                    createdIndexes[p.created] = [];
                                }
                                createdIndexes[p.created].push({ storeName: params.name, index: p });
                            }
                            if (p.dropped && p.dropped > event.oldVersion && (!params.dropped || p.dropped < params.dropped)) {
                                if (!(p.dropped in droppedIndexes)) {
                                    droppedIndexes[p.dropped] = [];
                                }
                                droppedIndexes[p.created].push({ storeName: params.name, index: p });
                            }
                        });
                    });
                    var versions = Object.keys(createdObjectStores).concat(Object.keys(createdIndexes)).concat(Object.keys(_this.upgradeHistory)).map(function (v) {
                        return parseInt(v);
                    });
                    versions.filter(function (v, i) {
                        return (v > event.oldVersion && this.indexOf(v) == i);
                    }, versions).sort().forEach(function (version) {
                        // Add new objectStore and Index.
                        if (version in createdObjectStores) {
                            createdObjectStores[version].forEach(function (val) {
                                _this._createObjectStore(db, val, version);
                            });
                        }
                        if (version in createdIndexes) {
                            createdIndexes[version].forEach(function (val) {
                                var objectStore = transaction.objectStore(val.storeName);
                                _this._createIndex(objectStore, val.index);
                            });
                        }

                        // Custom operation
                        if (version in _this.upgradeHistory) {
                            _this.upgradeHistory[version](req);
                        }

                        // Remove deprecated objectStore and Index.
                        if (version in droppedObjectStores) {
                            droppedObjectStores[version].forEach(function (val) {
                                _this._createObjectStore(db, val, version);
                            });
                        }
                        if (version in createdIndexes) {
                            createdIndexes[version].forEach(function (val) {
                                var objectStore = transaction.objectStore(val.storeName);
                                _this._createIndex(objectStore, val.index);
                            });
                        }
                    });
                }
                if (_this.onversionchange) {
                    _this.onversionchange(event);
                }
            };
            return this;
        };
        Database.prototype.success = function (onsuccess) {
            this.onsuccess = onsuccess;
            return this;
        };
        Database.prototype.error = function (onerror) {
            this.onerror = onerror;
            return this;
        };
        Database.prototype.versionchange = function (onversionchange) {
            this.onversionchange = onversionchange;
            return this;
        };
        Database.prototype.history = function (upgradeHistory) {
            this.upgradeHistory = upgradeHistory;
            return this;
        };
        Database.prototype._createObjectStore = function (db, objectStore, indexVersion) {
            if (!(objectStore instanceof ObjectStore)) {
                objectStore = new ObjectStore(objectStore);
            }
            return objectStore.create(db, indexVersion);
        };
        Database.prototype._createIndex = function (objectStore, index) {
            if (!(index instanceof Index)) {
                index = new Index(index);
            }
            return index.create(objectStore);
        };
        return Database;
    })();
    Jaid.Database = Database;

    /**
    * object store.
    */
    var ObjectStore = (function () {
        function ObjectStore(params) {
            this.autoIncrement = false;
            this.indexes = [];
            this.created = 0;
            this.name = params.name || this.name;
            this.keyPath = params.keyPath || this.keyPath;
            if (typeof params.autoIncrement !== "undefined") {
                this.autoIncrement = params.autoIncrement;
            }
            if (typeof params.indexes !== "undefined") {
                this.indexes = params.indexes;
            }
            this.created = params.created || this.created;
        }
        ObjectStore.prototype.create = function (db, indexVersion) {
            var objectStore = db.createObjectStore(this.name, { keyPath: this.keyPath, autoIncrement: this.autoIncrement });

            //create indexes.
            if (typeof indexVersion === 'number') {
                this.indexes.forEach(function (index) {
                    // オブジェクトストアを作成したバージョンの時点ではまだ存在しなかった、
                    // またはすでに削除されていたインデックスは作成しない
                    if ((index.created && index.created > indexVersion) || (index.dropped && index.dropped <= indexVersion)) {
                        return;
                    }
                    if (!(index instanceof Index)) {
                        index = new Index(index);
                    }
                    index.create(objectStore);
                });
            }
            return objectStore;
        };
        ObjectStore.prototype.drop = function (db) {
            db.deleteObjectStore(this.name);
        };
        return ObjectStore;
    })();
    Jaid.ObjectStore = ObjectStore;

    /**
    * index.
    */
    var Index = (function () {
        function Index(params) {
            this.unique = false;
            this.multiEntry = false;
            this.created = 0;
            this.name = params.name || this.name;
            this.keyPath = params.keyPath || this.keyPath;
            if (typeof params.unique !== "undefined") {
                this.unique = params.unique;
            }
            if (typeof params.unique !== "undefined") {
                this.multiEntry = params.multiEntry;
            }
        }
        Index.prototype.create = function (objectStore) {
            return objectStore.createIndex(this.name, this.keyPath, { unique: this.unique, multiEntry: this.multiEntry });
        };
        Index.prototype.drop = function (objectStore) {
            objectStore.deleteIndex(this.name);
        };
        return Index;
    })();
    Jaid.Index = Index;

    /**
    * connection.
    */
    var Connection = (function () {
        function Connection(db) {
            this.db = db;
        }
        Connection.prototype.insert = function (storeName, value, key) {
            var transaction = new Transaction(this, storeName, "readwrite");
            transaction.add(storeName, value, key);
            return transaction;
        };
        Connection.prototype.save = function (storeName, value, key) {
            var transaction = new Transaction(this, storeName, "readwrite");
            transaction.put(storeName, value, key);
            return transaction;
        };
        Connection.prototype.transaction = function (storeNames, mode) {
            return new Transaction(this, storeNames, mode);
        };
        return Connection;
    })();
    Jaid.Connection = Connection;

    /**
    * transaction
    */
    var Transaction = (function () {
        function Transaction(connection, storeNames, mode) {
            if (typeof mode === "undefined") { mode = "readonly"; }
            var _this = this;
            this.oncomplete = function () {
            };
            this.onerror = function () {
            };
            this.onabort = function () {
            };
            this.transaction = connection.db.transaction(storeNames, mode);
            this.transaction.oncomplete = function () {
                _this.oncomplete();
            };
            this.transaction.onerror = function () {
                _this.onerror();
            };
            this.transaction.onabort = function () {
                _this.onabort();
            };
        }
        Transaction.prototype.add = function (storeName, value, key) {
            var objectStore = this.transaction.objectStore(storeName);
            objectStore.add(value, key);
            return this;
        };
        Transaction.prototype.put = function (storeName, value, key) {
            var objectStore = this.transaction.objectStore(storeName);
            objectStore.put(value, key);
            return this;
        };
        Transaction.prototype.complete = function (complete) {
            this.oncomplete = complete;
            return this;
        };
        Transaction.prototype.error = function (error) {
            this.onerror = error;
            return this;
        };
        Transaction.prototype.abort = function (abort) {
            this.onabort = abort;
            return this;
        };
        Transaction.prototype.withTransaction = function (func) {
            func(this.transaction);
            return this;
        };
        return Transaction;
    })();
    Jaid.Transaction = Transaction;
})(Jaid || (Jaid = {}));
//# sourceMappingURL=jaid.js.map
