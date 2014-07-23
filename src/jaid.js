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
        * @param {IMigrationHistory} [param.migrationHistory] (if param is DatabaseParams) History of migration
        * @param {number} [version] (if param is string) Version number
        * @param {Array} [objectStores] (if param is string) List of object stores
        * @param {IMigrationHistory} [migrationHistory] (if param is string) History of migration
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

    

    var OpenDBRequest = (function () {
        function OpenDBRequest(db, opener) {
            var _this = this;
            this.source = db;
            this.target = opener;
            try  {
                this.migrationManager = new MigrationManager(this, this.source.objectStores, this.source.migrationHistory);
            } catch (e) {
                console.log(e, e.stack);
            }

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
                _this.migrationManager.execute(transaction, event);
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
        return OpenDBRequest;
    })();

    var Migration = (function () {
        function Migration(manager, version) {
            this.continued = false;
            this.executed = false;
            this.createdObjectStores = [];
            this.createdIndexes = [];
            this.droppedObjectStores = [];
            this.droppedIndexes = [];
            this.source = manager;
            this.version = version;
        }
        Migration.prototype.next = function () {
            if (this.continued) {
                console.error("Already called.");
            } else {
                this.continued = true;
                this.source.next();
            }
        };
        Migration.prototype.execute = function (transaction) {
            var _this = this;
            if (this.executed) {
                console.error("Already called.");
                return;
            }
            this.createdObjectStores.forEach(function (val) {
                transaction.createObjectStore(val, _this.version);
            });
            this.createdIndexes.forEach(function (val) {
                transaction.createIndex(val.storeName, val.index);
            });

            // Remove deprecated objectStore and Index.
            this.droppedObjectStores.forEach(function (val) {
                transaction.dropObjectStore(val);
            });
            this.createdIndexes.forEach(function (val) {
                transaction.dropIndex(val.storeName, val.index);
            });

            // Custom operation
            if (this.customOperation) {
                this.customOperation(transaction, this);
            } else {
                this.next();
            }
        };
        return Migration;
    })();

    var MigrationManager = (function () {
        function MigrationManager(source, objectStores, migrationHistory) {
            var _this = this;
            this.versions = {};
            this.versionNumbers = [];
            this.source = source;
            this.objectStores = objectStores;
            this.objectStores.forEach(function (objectStore) {
                objectStore = MigrationManager.checkObjectStore(objectStore);
                if (objectStore.created) {
                    var obj = _this.get(objectStore.created);
                    obj.createdObjectStores.push(objectStore);
                }
                if (objectStore.dropped) {
                    var obj = _this.get(objectStore.dropped);
                    obj.droppedObjectStores.push(objectStore);
                }
                objectStore.indexes.forEach(function (index) {
                    index = MigrationManager.checkIndex(index, objectStore);
                    if (index.created && (!objectStore.created || index.created > objectStore.created)) {
                        var obj = _this.get(index.created);
                        obj.createdIndexes.push({ storeName: objectStore.name, index: index });
                    }
                    if (index.dropped && (!objectStore.dropped || index.dropped < objectStore.dropped)) {
                        var obj = _this.get(index.dropped);
                        obj.droppedIndexes.push({ storeName: objectStore.name, index: index });
                    }
                });
            });
            Object.keys(migrationHistory).forEach(function (versionStr) {
                var versionInt = parseInt(versionStr);
                var obj = _this.get(versionInt);
                obj.customOperation = migrationHistory[versionInt];
            });
        }
        MigrationManager.checkObjectStore = function (objectStore) {
            if (objectStore.created && objectStore.dropped && objectStore.created >= objectStore.dropped) {
                throw Error(objectStore.name + ': "dropped" is MUST be greater than "created"');
            }
            objectStore.indexes = objectStore.indexes || [];
            return objectStore;
        };
        MigrationManager.checkIndex = function (index, objectStore) {
            if (!index.name) {
                // If parameter "name" is empty, make name from keyPath.
                if (Array.isArray(index.keyPath)) {
                    index.name = index.keyPath.join('_');
                } else {
                    index.name = index.keyPath;
                }
            }
            if (index.created) {
                if (index.dropped && index.created >= index.dropped) {
                    throw Error(index.name + ': "dropped" is MUST be greater than "created"');
                }
                if (objectStore.created && index.created < objectStore.created) {
                    throw Error(index.name + ': "created" is MUST be greater than or equal to objectStore\'s "created"');
                }
                if (objectStore.dropped && index.created >= objectStore.dropped) {
                    throw Error(index.name + ': "created" is MUST be lesser than objectStore\'s "dropped"');
                }
            }
            if (index.dropped) {
                if (objectStore.dropped && index.dropped > objectStore.dropped) {
                    throw Error(index.name + ': "dropped" is MUST be lesser than or equal to objectStore\'s "created"');
                }
                if (objectStore.created && index.dropped <= objectStore.created) {
                    throw Error(index.name + ': "dropped" is MUST be greater than objectStore\'s "created"');
                }
            }
            return index;
        };
        MigrationManager.prototype.get = function (version) {
            if (!(version in this.versions)) {
                this.versions[version] = new Migration(this, version);
            }
            return this.versions[version];
        };
        MigrationManager.prototype.initialize = function (version) {
            var _this = this;
            this.objectStores.forEach(function (params) {
                // Exclude "already dropped" or "not yet created" indexes.
                if ((params.created && params.created > version) || (params.dropped && params.dropped <= version)) {
                    return;
                }
                _this.transaction.createObjectStore(params, version);
            });
        };
        MigrationManager.prototype.migration = function (newVersion, oldVersion) {
            this.versionNumbers = Object.keys(this.versions).map(function (v) {
                return parseInt(v);
            });
            this.versionNumbers = this.versionNumbers.filter(function (v, i) {
                return (v > oldVersion && v <= newVersion && this.indexOf(v) == i);
            }, this.versionNumbers).sort();
            this.next();
        };
        MigrationManager.prototype.next = function () {
            var nextVersion = this.versionNumbers.shift();
            if (nextVersion) {
                this.versions[nextVersion].execute(this.transaction);
            }
        };
        MigrationManager.prototype.execute = function (transaction, event) {
            this.transaction = transaction;
            if (event.oldVersion == 0) {
                //initialize
                this.initialize(event.newVersion);
                this.source.oncreated(transaction, event);
            } else {
                //migration
                this.migration(event.newVersion, event.oldVersion);
            }
        };
        return MigrationManager;
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
            this.requestCounter = 0;
            this.requests = [];
            this.groupList = [];
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
            request.id = this.requestCounter++;
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

        //get requestIdList: number[]{
        //    return Object.keys(this.requests).map((id)=>{parseInt(id)});
        //}
        TransactionBase.prototype.grouping = function (requests) {
            var group = new RequestGroup(this, requests);
            group.id = this.requestCounter++;
            this.groupList.push(group);
            return group;
        };
        TransactionBase.prototype._requestCallback = function (req, result) {
            this.groupList.forEach(function (group) {
                if (req.id in group.queue) {
                    if (req.target.error) {
                        group.errors[req.id] = result;
                    } else {
                        group.results[req.id] = result;
                    }
                    delete group.queue[req.id];
                    if (group.joined) {
                        group.checkComplete();
                    }
                }
            });
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
        VersionChangeTransaction.prototype.onComplete = function (complete) {
            console.error("Cannot change oncomplete event in VersionChangeTransaction.");
            return this;
        };
        VersionChangeTransaction.prototype.onError = function (error) {
            console.error("Cannot change onerror event in VersionChangeTransaction.");
            return this;
        };
        VersionChangeTransaction.prototype.onAbort = function (abort) {
            console.error("Cannot change onabort event in VersionChangeTransaction.");
            return this;
        };
        VersionChangeTransaction.prototype.abort = function () {
            console.error("Cannot call abort method in VersionChangeTransaction.");
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
                console.log(_this);
                //this.source.abort();
            });
        }
        Request.prototype.onSuccess = function (onsuccess) {
            var _this = this;
            this.target.onsuccess = function (event) {
                var result = event.target.result;
                _this.source._requestCallback(_this, result);
                onsuccess(result, event);
            };
            return this;
        };
        Request.prototype.onError = function (onerror) {
            var _this = this;
            this.target.onerror = function (event) {
                var error = event.target.error;
                _this.source._requestCallback(_this, error);
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
        RequestWithCursor.prototype._onstopiteration = function () {
            this.source._requestCallback(this, this.values);
            if (this.onstopiteration) {
                this.onstopiteration(this.values);
            }
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
                    } else {
                        _this._onstopiteration();
                    }
                } else {
                    _this._onstopiteration();
                }
            };
            return this;
        };
        return RequestWithCursor;
    })(Request);

    var RequestGroup = (function () {
        function RequestGroup(transaction, requests) {
            var _this = this;
            this.target = { error: false };
            this.joined = false;
            this.requests = [];
            this.queue = {};
            this.results = {};
            this.errors = {};
            this.onsuccess = function () {
            };
            this.oncomplete = function () {
            };
            this.source = transaction;
            if (requests) {
                this.requests = requests;
                this.requests.forEach(function (req) {
                    _this.queue[req.id] = req;
                });
            }
        }
        RequestGroup.prototype._oncomplete = function () {
            this.source._requestCallback(this, this.results);
            this.oncomplete(this.results, this.errors);
        };

        RequestGroup.prototype.add = function (request) {
            this.requests.push(request);
            this.queue[request.id] = request;
        };
        RequestGroup.prototype.remove = function (request) {
            var idx = this.requests.indexOf(request);
            if (idx != -1) {
                delete this.requests[idx];
            }
            if (request.id in this.queue) {
                delete this.queue[request.id];
            }
        };
        RequestGroup.prototype.checkComplete = function () {
            if (Object.keys(this.queue).length == 0) {
                this._oncomplete();
            }
        };
        RequestGroup.prototype.joinAll = function () {
            this.joined = true;
            this.checkComplete();
        };
        RequestGroup.prototype.onSuccess = function (onsuccess) {
            this.onsuccess = onsuccess;
            return this;
        };
        RequestGroup.prototype.onComplete = function (oncomplete) {
            this.oncomplete = oncomplete;
            return this;
        };
        return RequestGroup;
    })();
})(Jaid || (Jaid = {}));
//# sourceMappingURL=jaid.js.map
