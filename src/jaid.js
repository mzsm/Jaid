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
        function Database(name, version, objectStores) {
            this.objectStores = {};
            this.onsuccess = function () {
            };
            this.onerror = function () {
            };
            this.onversionchange = function (event) {
            };
            this.upgradeHistory = {};
            this.name = name || this.name;
            this.version = version || this.version;
            this.objectStores = objectStores || this.objectStores;
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
                    Object.keys(_this.objectStores).forEach(function (name) {
                        var params = _this.objectStores[name];
                        _this._createObjectStore(db, name, params);
                    });
                } else {
                    //migration
                    var objectStoreChanges = {};
                    var indexChanges = {};
                    Object.keys(_this.objectStores).forEach(function (name) {
                        var params = _this.objectStores[name];
                        if (params.since && params.since > event.oldVersion) {
                            if (!(params.since in objectStoreChanges)) {
                                objectStoreChanges[params.since] = [];
                            }
                            objectStoreChanges[params.since].push([name, params]);
                        } else {
                            Object.keys(params.indexes || {}).forEach(function (n) {
                                var p = params.indexes[n];
                                if (p.since && p.since > event.oldVersion) {
                                    if (!(p.since in indexChanges)) {
                                        indexChanges[p.since] = [];
                                    }
                                    indexChanges[p.since].push([name, n, p]);
                                }
                            });
                        }
                    });
                    var versions = Object.keys(objectStoreChanges).concat(Object.keys(indexChanges)).concat(Object.keys(_this.upgradeHistory)).map(function (v) {
                        return parseInt(v);
                    });
                    versions.filter(function (v, i) {
                        return (v > event.oldVersion && this.indexOf(v) == i);
                    }, versions).sort().forEach(function (version) {
                        if (version in objectStoreChanges) {
                            objectStoreChanges[version].forEach(function (val) {
                                _this._createObjectStore(db, val[0], val[1]);
                            });
                        }
                        if (version in indexChanges) {
                            indexChanges[version].forEach(function (val) {
                                var objectStore = transaction.objectStore(val[0]);
                                _this._createIndex(objectStore, val[1], val[2]);
                            });
                        }
                        if (version in _this.upgradeHistory) {
                            _this.upgradeHistory[version](req);
                        }
                        //TODO: remove objectStore and index.
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
        Database.prototype._createObjectStore = function (db, name, params, withIndex) {
            var _this = this;
            if (typeof withIndex === "undefined") { withIndex = true; }
            var objectStore = db.createObjectStore(name, { keyPath: params.keyPath, autoIncrement: params.autoIncrement });
            if (withIndex) {
                Object.keys(params.indexes).forEach(function (indexName) {
                    var indexParams = params.indexes[indexName];
                    _this._createIndex(objectStore, indexName, indexParams);
                });
            }
            return objectStore;
        };
        Database.prototype._createIndex = function (objectStore, name, params) {
            return objectStore.createIndex(name, params.keyPath, { unique: params.unique, multiEntry: params.multiEntry });
        };
        return Database;
    })();
    Jaid.Database = Database;

    /**
    * object store.
    */
    var ObjectStore = (function () {
        function ObjectStore(name, options, indexes) {
            this.autoIncrement = false;
            this.indexes = {};
            this.name = name || this.name;
            this.keyPath = options.keyPath || this.keyPath;
            if (typeof options.autoIncrement !== "undefined") {
                this.autoIncrement = options.autoIncrement;
            }
            if (typeof indexes !== "undefined") {
                this.indexes = indexes;
            }
        }
        ObjectStore.prototype.create = function (db) {
            var objectStore = db.createObjectStore(this.name, { keyPath: this.keyPath, autoIncrement: this.autoIncrement });

            //create indexes.
            /*
            this.indexes.forEach(function(index){
            index.create(objectStore);
            });
            */
            return objectStore;
        };
        return ObjectStore;
    })();
    Jaid.ObjectStore = ObjectStore;

    /**
    * index.
    */
    var Index = (function () {
        function Index(name, keyPath, options) {
            this.unique = false;
            this.multiEntry = false;
            this.since = 0;
            this.name = name || this.name;
            this.keyPath = keyPath || this.keyPath;
        }
        Index.prototype.create = function (objectStore) {
            return objectStore.createIndex(this.name, this.keyPath, { unique: this.unique, multiEntry: this.multiEntry });
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
