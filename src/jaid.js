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
                var con = new Connection(db);
                _this.onsuccess(con);
            };
            opener.onerror = function (event) {
                _this.onerror(event);
            };
            opener.onupgradeneeded = function (event) {
                var db = event.target.result;
                Object.keys(_this.upgradeHistory).map(function (v) {
                    return parseInt(v);
                }).sort().forEach(function (v) {
                    _this.upgradeHistory[v](db);
                });

                _this.onversionchange(event);
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
        Connection.prototype.select = function (objectStores) {
        };
        Connection.prototype.save = function (objectStores) {
        };
        return Connection;
    })();
    Jaid.Connection = Connection;

    /**
    * transaction
    */
    var Transaction = (function () {
        function Transaction() {
        }
        return Transaction;
    })();
    Jaid.Transaction = Transaction;
})(Jaid || (Jaid = {}));
//# sourceMappingURL=jaid.js.map
