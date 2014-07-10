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
            var opener = indexedDB.open(this.name, this.version);
            opener.onsuccess = function () {
                this.onsuccess();
            };
            opener.onupgradeneeded = function (event) {
                /*
                var db: IDBDatabase = event.target.result;
                Object.keys(this.upgradeHistory).map((v) =>{return parseInt(v)}).sort().forEach((v: any) => {
                this.upgradeHistory[v](db);
                });
                */
                //this.onversionchange(event);
            };
        };
        Database.prototype.success = function (onsuccess) {
            this.onsuccess = onsuccess;
        };
        Database.prototype.error = function (onerror) {
            this.onerror = onerror;
        };
        Database.prototype.versionchange = function (onversionchange) {
            this.onversionchange = onversionchange;
        };
        Object.defineProperty(Database.prototype, "objectStoreDict", {
            get: function () {
                return this.objectStores;
            },
            enumerable: true,
            configurable: true
        });
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
        ObjectStore.prototype.create = function (objectStore) {
            return objectStore.createIndex(this.name, this.keyPath, { unique: this.unique, multiEntry: this.multiEntry });
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
})(Jaid || (Jaid = {}));
//# sourceMappingURL=jaid.js.map
