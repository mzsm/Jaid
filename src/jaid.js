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
                    Object.keys(_this.objectStores).forEach(function (name) {
                        var params = _this.objectStores[name];
                        _this._createObjectStore(db, params);
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
                                _this._createObjectStore(db, val, true);
                            });
                        }
                        if (version in indexChanges) {
                            indexChanges[version].forEach(function (val) {
                                var objectStore = transaction.objectStore(val[0]);
                                _this._createIndex(objectStore, val);
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
        Database.prototype._createObjectStore = function (db, objectStore, withIndex) {
            if (typeof withIndex === "undefined") { withIndex = true; }
            if (!(objectStore instanceof ObjectStore)) {
                objectStore = new ObjectStore(objectStore);
            }
            return objectStore.create(db, withIndex);
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
            this.name = params.name || this.name;
            this.keyPath = params.keyPath || this.keyPath;
            if (typeof params.autoIncrement !== "undefined") {
                this.autoIncrement = params.autoIncrement;
            }
            if (typeof params.indexes !== "undefined") {
                this.indexes = params.indexes;
            }
            this.since = params.since || this.since;
        }
        ObjectStore.prototype.create = function (db, withIndex) {
            if (typeof withIndex === "undefined") { withIndex = true; }
            var objectStore = db.createObjectStore(this.name, { keyPath: this.keyPath, autoIncrement: this.autoIncrement });

            //create indexes.
            if (withIndex) {
                this.indexes.forEach(function (index) {
                    if (!(index instanceof Index)) {
                        index = new Index(index);
                    }
                    index.create(objectStore);
                });
            }
            return objectStore;
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
            this.since = 0;
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
