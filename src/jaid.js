/**
* Jaid - Jane Indexed Database library
*
* @version 0.0.1a
* @author mzsm j@mzsm.me
* @license <a href="http://www.opensource.org/licenses/mit-license.php">The MIT License</a>
*/
//var indexedDB = window.indexedDB;
"use strict";
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Jaid;
(function (Jaid) {
    var Database = (function () {
        function Database(param, version, objectStores) {
            this.version = 1;
            this.objectStores = [];
            this.migrationHistory = {};
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
            if (this.connection) {
                throw Error('This database was already opened.');
            }
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
            opener.onblocked = function (event) {
                _this.onblocked(event);
            };
            opener.onupgradeneeded = function (event) {
                var req = event.target;
                var db = req.result;
                _this.connection = new Connection(db);
                var transaction = new VersionChangeTransaction(_this.connection, req.transaction);

                if (event.oldVersion == 0) {
                    //initialize
                    _this.objectStores.forEach(function (params) {
                        // Exclude "already dropped" or "not yet created" indexes.
                        if ((params.created && params.created > event.newVersion) || (params.dropped && params.dropped <= event.newVersion)) {
                            return;
                        }
                        transaction.createObjectStore(params, event.newVersion);
                    });
                    if (_this.oncreated) {
                        _this.oncreated(transaction, event);
                    }
                } else {
                    //migration
                    var createdObjectStores = {};
                    var droppedObjectStores = {};
                    var createdIndexes = {};
                    var droppedIndexes = {};
                    _this.objectStores.forEach(function (params) {
                        if (params.created) {
                            if (!(params.created in createdObjectStores)) {
                                createdObjectStores[params.created] = [];
                            }
                            createdObjectStores[params.created].push(params);
                        }
                        if (params.dropped) {
                            if (!(params.dropped in droppedObjectStores)) {
                                droppedObjectStores[params.dropped] = [];
                            }
                            droppedObjectStores[params.dropped].push(params);
                        }
                        params.indexes.forEach(function (p) {
                            if (p.created && (!params.created || p.created > params.created)) {
                                if (!(p.created in createdIndexes)) {
                                    createdIndexes[p.created] = [];
                                }
                                createdIndexes[p.created].push({ storeName: params.name, index: p });
                            }
                            if (p.dropped && (!params.dropped || p.dropped < params.dropped)) {
                                if (!(p.dropped in droppedIndexes)) {
                                    droppedIndexes[p.dropped] = [];
                                }
                                droppedIndexes[p.created].push({ storeName: params.name, index: p });
                            }
                        });
                    });
                    var versions = Object.keys(createdObjectStores).concat(Object.keys(createdIndexes)).concat(Object.keys(droppedObjectStores)).concat(Object.keys(droppedIndexes)).concat(Object.keys(_this.migrationHistory)).map(function (v) {
                        return parseInt(v);
                    });
                    versions.filter(function (v, i) {
                        return (v > event.oldVersion && v <= event.newVersion && this.indexOf(v) == i);
                    }, versions).sort().forEach(function (version) {
                        // Add new objectStore and Index.
                        if (version in createdObjectStores) {
                            createdObjectStores[version].forEach(function (val) {
                                transaction.createObjectStore(val, version);
                            });
                        }
                        if (version in createdIndexes) {
                            createdIndexes[version].forEach(function (val) {
                                transaction.createIndex(val.storeName, val.index);
                            });
                        }

                        // Custom operation
                        if (version in _this.migrationHistory) {
                            _this.migrationHistory[version](transaction, event);
                        }

                        // Remove deprecated objectStore and Index.
                        if (version in droppedObjectStores) {
                            droppedObjectStores[version].forEach(function (val) {
                                transaction.dropObjectStore(val);
                            });
                        }
                        if (version in createdIndexes) {
                            createdIndexes[version].forEach(function (val) {
                                transaction.dropIndex(val.storeName, val.index);
                            });
                        }
                    });
                }
            };
            return this;
        };
        Database.prototype.onSuccess = function (onsuccess) {
            this.onsuccess = onsuccess;
            return this;
        };
        Database.prototype.onError = function (onerror) {
            this.onerror = onerror;
            return this;
        };
        Database.prototype.onBlocked = function (onblocked) {
            this.onblocked = onblocked;
            return this;
        };
        Database.prototype.onCreated = function (oncreated) {
            this.oncreated = oncreated;
            return this;
        };
        Database.prototype.onMigration = function (migrationHistory) {
            this.migrationHistory = migrationHistory;
            return this;
        };
        Database.prototype.delete = function () {
            indexedDB.deleteDatabase(this.name);
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
            this.created = params.created;
            this.dropped = params.dropped;
        }
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
        Connection.prototype.select = function (storeName) {
            var transaction = new ReadOnlyTransaction(this, storeName);

            return transaction;
        };
        Connection.prototype.insert = function (storeName, value, key) {
            var transaction = new ReadWriteTransaction(this, storeName);
            transaction.begin().add(storeName, value, key);
            return transaction;
        };
        Connection.prototype.save = function (storeName, value, key) {
            var transaction = new ReadWriteTransaction(this, storeName);
            transaction.begin().put(storeName, value, key);
            return transaction;
        };

        Connection.prototype.transaction = function (storeNames, mode) {
            switch (mode) {
                case "readonly":
                    return new ReadOnlyTransaction(this, storeNames);
                case "readwrite":
                    return new ReadWriteTransaction(this, storeNames);
                default:
                    throw Error("parameter mode is \"readonly\" or \"readwrite\"");
            }
        };
        Connection.prototype.close = function () {
            this.db.close();
            this.db = null;
        };
        return Connection;
    })();
    Jaid.Connection = Connection;

    /**
    * upgrade connection
    */
    /**
    * transaction
    */
    var Transaction = (function () {
        function Transaction(connection, storeNames) {
            this.oncomplete = function () {
            };
            this.onerror = function () {
            };
            this.onabort = function () {
            };
            this.connection = connection;
            if (typeof storeNames === "string") {
                storeNames = [storeNames];
            }
            if (storeNames) {
                this.storeNames = storeNames;
            }
        }
        Transaction.prototype.begin = function (storeNames) {
            if (this.transaction) {
                throw Error('This transaction was already begun.');
            }
            this.transaction = this.connection.db.transaction(storeNames, this.mode);
            this._setTransactionEvents();
            return this;
        };
        Transaction.prototype._setTransactionEvents = function () {
            var _this = this;
            this.transaction.oncomplete = function () {
                _this.oncomplete();
            };
            this.transaction.onerror = function () {
                _this.onerror();
            };
            this.transaction.onabort = function () {
                _this.onabort();
            };
        };
        Transaction.prototype.onComplete = function (complete) {
            this.oncomplete = complete;
            return this;
        };
        Transaction.prototype.onError = function (error) {
            this.onerror = error;
            return this;
        };
        Transaction.prototype.onAbort = function (abort) {
            this.onabort = abort;
            return this;
        };
        Transaction.prototype.withTransaction = function (func) {
            func(this.transaction);
            return this;
        };
        Transaction.prototype.abort = function () {
            this.transaction.abort();
        };
        return Transaction;
    })();
    Jaid.Transaction = Transaction;

    var ReadOnlyTransaction = (function (_super) {
        __extends(ReadOnlyTransaction, _super);
        function ReadOnlyTransaction() {
            _super.apply(this, arguments);
            this.mode = "readonly";
        }
        return ReadOnlyTransaction;
    })(Transaction);
    Jaid.ReadOnlyTransaction = ReadOnlyTransaction;

    /**
    * Read/Write transaction
    */
    var ReadWriteTransaction = (function (_super) {
        __extends(ReadWriteTransaction, _super);
        function ReadWriteTransaction() {
            _super.apply(this, arguments);
            this.mode = "readwrite";
        }
        ReadWriteTransaction.prototype.add = function (storeName, value, key) {
            var objectStore = this.transaction.objectStore(storeName);
            objectStore.add(value, key);
            return this;
        };
        ReadWriteTransaction.prototype.put = function (storeName, value, key) {
            var objectStore = this.transaction.objectStore(storeName);
            objectStore.put(value, key);
            return this;
        };
        return ReadWriteTransaction;
    })(ReadOnlyTransaction);
    Jaid.ReadWriteTransaction = ReadWriteTransaction;

    /**
    * Read/Write transaction
    */
    var VersionChangeTransaction = (function (_super) {
        __extends(VersionChangeTransaction, _super);
        function VersionChangeTransaction(connection, transaction) {
            _super.call(this, connection);
            this.transaction = transaction;
            this._setTransactionEvents();
        }
        VersionChangeTransaction.prototype.createObjectStore = function (objectStore, indexVersion) {
            var db = this.connection.db;
            if (!(objectStore instanceof ObjectStore)) {
                objectStore = new ObjectStore(objectStore);
            }
            var idbObjectStore = db.createObjectStore(objectStore.name, { keyPath: objectStore.keyPath, autoIncrement: objectStore.autoIncrement || false });

            //create indexes.
            if (typeof indexVersion === 'number') {
                objectStore.indexes.forEach(function (index) {
                    // Exclude "already dropped" or "not yet created" indexes.
                    if ((index.created && index.created > indexVersion) || (index.dropped && index.dropped <= indexVersion)) {
                        return;
                    }
                    //this.createIndex(idbObjectStore, index);
                });
            }
            return idbObjectStore;
        };

        VersionChangeTransaction.prototype.createIndex = function (objectStore, index) {
            var idbObjectStore;
            if (typeof objectStore === "function" && objectStore instanceof IDBObjectStore) {
                idbObjectStore = objectStore;
            } else {
                var storeName = (typeof objectStore === "string") ? objectStore : objectStore.name;
                idbObjectStore = this.transaction.objectStore(storeName);
            }
            if (!(index instanceof Index)) {
                index = new Index(index);
            }

            return idbObjectStore.createIndex(index.name, index.keyPath, { unique: index.unique || false, multiEntry: index.multiEntry || false });
        };

        VersionChangeTransaction.prototype.dropObjectStore = function (objectStore) {
            var db = this.connection.db;
            var name;
            if (typeof objectStore === "string") {
                name = objectStore;
            } else {
                name = objectStore.name;
            }
            db.deleteObjectStore(name);
        };

        VersionChangeTransaction.prototype.dropIndex = function (objectStore, index) {
            var idbObjectStore;
            var indexName;
            if (typeof objectStore === "function" && objectStore instanceof IDBObjectStore) {
                idbObjectStore = objectStore;
            } else {
                var storeName = (typeof objectStore === "string") ? objectStore : objectStore.name;
                idbObjectStore = this.transaction.objectStore(storeName);
            }
            if (typeof index === 'string') {
                indexName = index;
            } else {
                indexName = index.name;
            }
            idbObjectStore.deleteIndex(indexName);
        };
        return VersionChangeTransaction;
    })(ReadWriteTransaction);
    Jaid.VersionChangeTransaction = VersionChangeTransaction;
})(Jaid || (Jaid = {}));
//# sourceMappingURL=jaid.js.map
