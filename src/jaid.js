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
    /**
    * Database Class
    */
    var Database = (function () {
        /**
        * constructor with single or multi parameter(s)
        * @class Database
        * @constructor
        * @param {any} [param] Name of database, or Dictionary of name, version, objectStores list and migrationHistory
        * @param {string} [param.name] (if param is DatabaseParams) Name of Database
        * @param {number} [param.version] (if param is DatabaseParams) Version number
        * @param {Array} [param.objectStores] (if param is DatabaseParams) List of object stores
        * @param {MigrationHistory} [param.migrationHistory] (if param is DatabaseParams) History of migration
        * @param {number} [version] (if param is string) Version number
        * @param {Array} [objectStores] (if param is string) List of object stores
        * @param {MigrationHistory} [migrationHistory] (if param is string) History of migration
        */
        function Database(param, version, objectStores, migrationHistory) {
            this.version = 1;
            this.objectStores = [];
            this.migrationHistory = {};
            if (typeof param === "string") {
                this.name = param;
                this.version = version || this.version;
                this.objectStores = objectStores || this.objectStores;
                this.migrationHistory = migrationHistory || this.migrationHistory;
            } else if (typeof param === "object" && !!param) {
                this.name = param.name || this.name;
                this.version = param.version || this.version;
                this.objectStores = param.objectStores || this.objectStores;
                this.migrationHistory = param.migrationHistory || this.migrationHistory;
            }
        }
        /**
        * Open database
        * @returns {IOpenDBRequest}
        */
        Database.prototype.open = function () {
            if (this.target) {
                throw Error("This database was already opened.");
            }
            var opener = new OpenDBRequest(this, indexedDB.open(this.name, this.version));
            return opener;
        };

        /**
        * Close database
        */
        Database.prototype.close = function () {
            if (!this.target) {
                throw Error("This database is not yes opened.");
            }
            this.target.close();
            this.target = null;
        };

        /**
        * Delete database
        */
        Database.prototype.delete = function () {
            indexedDB.deleteDatabase(this.name);
        };
        Database.prototype.insert = function (storeName, value, key) {
            var transaction = this.readWriteTransaction(storeName);
            var req = transaction.add(storeName, value, key);
            return req;
        };
        Database.prototype.save = function (storeName, value, key) {
            var transaction = this.readWriteTransaction(storeName);
            var req = transaction.put(storeName, value, key);
            return req;
        };

        Database.prototype.readOnlyTransaction = function (storeNames) {
            return new ReadOnlyTransaction(this, storeNames);
        };

        /**
        * Begin read write transaction
        * @param {any} storeNames Object store name, or those list.
        * @returns {IReadWriteTransaction} Read write transaction.
        */
        Database.prototype.readWriteTransaction = function (storeNames) {
            return new ReadWriteTransaction(this, storeNames);
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

    

    var OpenDBRequest = (function () {
        function OpenDBRequest(db, opener) {
            var _this = this;
            this.source = db;
            this.target = opener;
            opener.onsuccess = function (event) {
                _this.source.target = event.target.result;
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
                _this.source.target = req.result;
                var transaction = new VersionChangeTransaction(_this.source, req.transaction);
                if (event.oldVersion == 0) {
                    //initialize
                    _this.source.objectStores.forEach(function (params) {
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
                    _this.source.objectStores.forEach(function (params) {
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
                                droppedIndexes[p.dropped].push({ storeName: params.name, index: p });
                            }
                        });
                    });
                    var versions = Object.keys(createdObjectStores).concat(Object.keys(createdIndexes)).concat(Object.keys(droppedObjectStores)).concat(Object.keys(droppedIndexes)).concat(Object.keys(_this.source.migrationHistory)).map(function (v) {
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
                        if (version in _this.source.migrationHistory) {
                            _this.source.migrationHistory[version](transaction, event);
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
                    /*
                    */
                }
            };
        }
        OpenDBRequest.prototype.onSuccess = function (onsuccess) {
            this.onsuccess = onsuccess;
            return this;
        };
        OpenDBRequest.prototype.onError = function (onerror) {
            this.onerror = onerror;
            return this;
        };
        OpenDBRequest.prototype.onBlocked = function (onblocked) {
            this.onblocked = onblocked;
            return this;
        };
        OpenDBRequest.prototype.onCreated = function (oncreated) {
            this.oncreated = oncreated;
            return this;
        };
        OpenDBRequest.prototype.onMigration = function (migrationHistory) {
            this.source.migrationHistory = migrationHistory;
            return this;
        };
        return OpenDBRequest;
    })();

    

    var TransactionBase = (function () {
        function TransactionBase(db, storeNames, mode) {
            var _this = this;
            this.oncomplete = function () {
            };
            this.onerror = function () {
            };
            this.onabort = function () {
            };
            this.results = {};
            this.requests = [];
            this._joinList = [];
            this.source = db;
            if (typeof storeNames === "object" && storeNames instanceof IDBTransaction) {
                this.target = storeNames;
            } else {
                if (typeof storeNames === "string") {
                    storeNames = [storeNames];
                }
                this.target = this.source.target.transaction(storeNames, mode);
            }
            this.target.oncomplete = function () {
                _this.oncomplete(_this.results);
            };
            this.target.onerror = function () {
                _this.onerror();
            };
            this.target.onabort = function () {
                _this.onabort();
            };
        }
        TransactionBase.prototype._registerRequest = function (request) {
            request.id = this.requests.length;
            request.source = this;
            this.requests.push(request);
            return this;
        };
        TransactionBase.prototype.onComplete = function (complete) {
            this.oncomplete = complete;
            return this;
        };
        TransactionBase.prototype.onError = function (error) {
            this.onerror = error;
            return this;
        };
        TransactionBase.prototype.onAbort = function (abort) {
            this.onabort = abort;
            return this;
        };

        TransactionBase.prototype.abort = function () {
            this.target.abort();
        };
        return TransactionBase;
    })();

    var ReadOnlyTransaction = (function (_super) {
        __extends(ReadOnlyTransaction, _super);
        function ReadOnlyTransaction(db, storeNames, mode) {
            _super.call(this, db, storeNames, mode || "readonly");
        }
        ReadOnlyTransaction.prototype.getByKey = function (storeName, key) {
            var objectStore = this.target.objectStore(storeName);
            var req = new Request(objectStore.get(key));
            this._registerRequest(req);
            return req;
        };
        ReadOnlyTransaction.prototype.getByIndex = function (storeName, indexName, key) {
            var objectStore = this.target.objectStore(storeName);
            var index = objectStore.index(indexName);
            var req = new Request(index.get(key));
            this._registerRequest(req);
            return req;
        };
        ReadOnlyTransaction.prototype.findByKey = function (storeName, range, direction) {
            var objectStore = this.target.objectStore(storeName);
            var req = new RequestWithCursor(objectStore.openCursor(range, direction));
            this._registerRequest(req);
            return req;
        };
        ReadOnlyTransaction.prototype.findByIndex = function (storeName, indexName, range, direction) {
            var objectStore = this.target.objectStore(storeName);
            var index = objectStore.index(indexName);
            var req = new RequestWithCursor(index.openCursor(range, direction));
            this._registerRequest(req);
            return req;
        };
        return ReadOnlyTransaction;
    })(TransactionBase);

    

    var ReadWriteTransaction = (function (_super) {
        __extends(ReadWriteTransaction, _super);
        function ReadWriteTransaction(db, storeNames, mode) {
            _super.call(this, db, storeNames, mode || "readwrite");
        }
        ReadWriteTransaction.prototype.add = function (storeName, value, key) {
            var objectStore = this.target.objectStore(storeName);
            var req = new Request(objectStore.add(value, key));
            this._registerRequest(req);
            return req;
        };
        ReadWriteTransaction.prototype.put = function (storeName, value, key) {
            var objectStore = this.target.objectStore(storeName);
            var req = new Request(objectStore.put(value, key));
            this._registerRequest(req);
            return req;
        };
        ReadWriteTransaction.prototype.deleteByKey = function (storeName, key) {
            var objectStore = this.target.objectStore(storeName);
            var req = new Request(objectStore.delete(key));
            this._registerRequest(req);
            return req;
        };
        return ReadWriteTransaction;
    })(ReadOnlyTransaction);

    

    var VersionChangeTransaction = (function (_super) {
        __extends(VersionChangeTransaction, _super);
        function VersionChangeTransaction(db, transaction) {
            _super.call(this, db, transaction);
        }
        VersionChangeTransaction.prototype.createObjectStore = function (objectStore, indexVersion) {
            var _this = this;
            if (!(objectStore instanceof ObjectStore)) {
                objectStore = new ObjectStore(objectStore);
            }
            var idbObjectStore = this.source.target.createObjectStore(objectStore.name, { keyPath: objectStore.keyPath, autoIncrement: objectStore.autoIncrement || false });

            //create indexes.
            if (typeof indexVersion === 'number') {
                objectStore.indexes.forEach(function (index) {
                    // Exclude "already dropped" or "not yet created" indexes.
                    if ((index.created && index.created > indexVersion) || (index.dropped && index.dropped <= indexVersion)) {
                        return;
                    }
                    _this.createIndex(idbObjectStore, index);
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
                idbObjectStore = this.target.objectStore(storeName);
            }
            if (!(index instanceof Index)) {
                index = new Index(index);
            }

            return idbObjectStore.createIndex(index.name, index.keyPath, { unique: index.unique || false, multiEntry: index.multiEntry || false });
        };

        VersionChangeTransaction.prototype.dropObjectStore = function (objectStore) {
            var name;
            if (typeof objectStore === "string") {
                name = objectStore;
            } else {
                name = objectStore.name;
            }
            this.source.target.deleteObjectStore(name);
        };

        VersionChangeTransaction.prototype.dropIndex = function (objectStore, index) {
            var idbObjectStore;
            var indexName;
            if (typeof objectStore === "function" && objectStore instanceof IDBObjectStore) {
                idbObjectStore = objectStore;
            } else {
                var storeName = (typeof objectStore === "string") ? objectStore : objectStore.name;
                idbObjectStore = this.target.objectStore(storeName);
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

    

    var Request = (function () {
        function Request(request) {
            var _this = this;
            this.target = request;
            this.onSuccess(function (result, event) {
                _this.source.results[_this.id] = event.target;
            });
            this.onError(function (error, event) {
                _this.source.abort();
            });
        }
        Request.prototype.onSuccess = function (onsuccess) {
            this.target.onsuccess = function (event) {
                var result = event.target.result;
                onsuccess(result, event);
            };
            return this;
        };
        Request.prototype.onError = function (onerror) {
            this.target.onerror = function (event) {
                var error = event.target.error;
                onerror(error, event);
            };
            return this;
        };
        return Request;
    })();

    var RequestWithCursor = (function (_super) {
        __extends(RequestWithCursor, _super);
        function RequestWithCursor(request) {
            var _this = this;
            _super.call(this, request);
            this.continueFlag = true;
            this.values = [];
            this.onSuccess(function (result, event) {
                _this.values.push({ key: result.key, primaryKey: result.primaryKey, value: result.value });
            });
        }
        RequestWithCursor.prototype.stopCursor = function () {
            this.continueFlag = false;
        };
        RequestWithCursor.prototype.onStopIteration = function (func) {
            var _this = this;
            this.onstopiteration = function (results) {
                func(results);
                _this.source.results[_this.id] = event.target;
            };
            return this;
        };
        RequestWithCursor.prototype.onSuccess = function (onsuccess) {
            var _this = this;
            this.target.onsuccess = function (event) {
                var result = event.target.result;
                if (result) {
                    onsuccess(result, event);
                    if (_this.continueFlag) {
                        result.continue();
                    } else if (_this.onstopiteration) {
                        _this.onstopiteration(_this.values);
                    }
                } else if (_this.onstopiteration) {
                    _this.onstopiteration(_this.values);
                }
            };
            return this;
        };
        return RequestWithCursor;
    })(Request);
})(Jaid || (Jaid = {}));
//# sourceMappingURL=jaid.js.map
