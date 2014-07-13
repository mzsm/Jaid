/**
 * Jaid - Jane Indexed Database library
 *
 * @version 0.0.1a
 * @author mzsm j@mzsm.me
 * @license <a href="http://www.opensource.org/licenses/mit-license.php">The MIT License</a>
 */
//var indexedDB = window.indexedDB;

interface DOMError {
    message?: string
}

module Jaid {
    export interface IndexParams {
        name?: string;
        keyPath: any;
        unique?: boolean;
        multiEntry?: boolean;
        since?: number;
    }

    export interface ObjectStoreParams {
        name: string;
        keyPath?: any;
        autoIncrement?: boolean;
        indexes?: IndexParams[];
        since?: number;
    }

    export interface DatabaseParams {
        name?; string;
        version?: number;
        objectStores?: ObjectStoreParams[];
    }

    export interface UpgradeHistory {
        [version: number]: (req: IDBOpenDBRequest) => void;
    }

    export class Database{
        name: string;
        version: number = 1;
        objectStores: ObjectStoreParams[] = [];
        onsuccess: Function = function(){};
        onerror: Function = function(){};
        onversionchange: (event: IDBVersionChangeEvent) => void = function(event: IDBVersionChangeEvent){};
        upgradeHistory: UpgradeHistory = {};
        connection: Connection;

        constructor(name?: string, version?: number, objectStores?: ObjectStoreParams[]);
        constructor(param?: Object);
        constructor(param?: any, version?: number, objectStores?: ObjectStoreParams[]){
            if(typeof param === 'string'){
                this.name = param;
                this.version = version || this.version;
                this.objectStores = objectStores || this.objectStores;
            }else if(typeof param === 'Object' && !!param){
                this.name = param.name || this.name;
                this.version = param.version || this.version;
                this.objectStores = param.objectStores || this.objectStores;
            }
        }
        open(): Database{
            var opener: IDBOpenDBRequest = indexedDB.open(this.name, this.version);
            opener.onsuccess = (event: Event) => {
                var db = <IDBDatabase>(<IDBOpenDBRequest>event.target).result;
                this.connection = new Connection(db);
                this.onsuccess(event);
            };
            opener.onerror = (event: Event) => {
                var error = opener.error;
                this.onerror(error, event);
            };
            opener.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                var req = <IDBOpenDBRequest>event.target;
                var transaction = req.transaction;
                var db = <IDBDatabase>req.result;

                if(event.oldVersion == 0){
                    Object.keys(this.objectStores).forEach((name: string) => {
                        var params: ObjectStoreParams = this.objectStores[name];
                        this._createObjectStore(db, params);
                    });
                }else{
                    //migration
                    var objectStoreChanges: any = {};
                    var indexChanges: any = {};
                    Object.keys(this.objectStores).forEach((name: string) => {
                        var params: ObjectStoreParams = this.objectStores[name];
                        if(params.since && params.since > event.oldVersion) {
                            if (!(params.since in objectStoreChanges)) {
                                objectStoreChanges[params.since] = [];
                            }
                            objectStoreChanges[params.since].push([name, params]);
                        }else{
                            Object.keys(params.indexes || {}).forEach((n: string) => {
                                var p: IndexParams = params.indexes[n];
                                if(p.since && p.since > event.oldVersion){
                                    if (!(p.since in indexChanges)) {
                                        indexChanges[p.since] = [];
                                    }
                                    indexChanges[p.since].push([name, n, p]);
                                }
                            });
                        }
                    });
                    var versions: number[] = Object.keys(objectStoreChanges)
                        .concat(Object.keys(indexChanges))
                        .concat(Object.keys(this.upgradeHistory)).map((v) => {return parseInt(v)});
                    versions.filter(function(v, i){ return(v > event.oldVersion && this.indexOf(v) == i); }, versions)
                        .sort()
                        .forEach((version: number) => {
                            if(version in objectStoreChanges){
                                objectStoreChanges[version].forEach((val: ObjectStoreParams) => {
                                    this._createObjectStore(db, val, true);
                                });
                            }
                            if(version in indexChanges){
                                indexChanges[version].forEach((val: IndexParams) => {
                                    var objectStore = transaction.objectStore(val[0]);
                                    this._createIndex(objectStore, val);
                                });
                            }
                            if(version in this.upgradeHistory){
                                this.upgradeHistory[version](req);
                            }
                            //TODO: remove objectStore and index.
                        });
                }
                if(this.onversionchange){
                    this.onversionchange(event);
                }
            };
            return this;
        }
        success(onsuccess: Function): Database{
            this.onsuccess = onsuccess;
            return this;
        }
        error(onerror: Function): Database{
            this.onerror = onerror;
            return this;
        }
        versionchange(onversionchange: (event: IDBVersionChangeEvent) => void): Database{
            this.onversionchange = onversionchange;
            return this;
        }
        history(upgradeHistory: UpgradeHistory): Database{
            this.upgradeHistory = upgradeHistory;
            return this;
        }
        private _createObjectStore(db: IDBDatabase, objectStore: ObjectStoreParams, withIndex = true): IDBObjectStore{
            if(!(objectStore instanceof ObjectStore)){
                objectStore = new ObjectStore(objectStore);
            }
            return (<ObjectStore>objectStore).create(db, withIndex);
        }
        private _createIndex(objectStore: IDBObjectStore, index: IndexParams): IDBIndex{
            if(!(index instanceof Index)){
                index = new Index(index);
            }
            return (<Index>index).create(objectStore);
        }
    }

    /**
     * object store.
     */
    export class ObjectStore implements ObjectStoreParams{
        name: string;
        keyPath: string;
        autoIncrement: boolean = false;
        indexes: IndexParams[] = [];
        since: number;

        constructor(params: ObjectStoreParams){
            this.name = params.name || this.name;
            this.keyPath = params.keyPath || this.keyPath;
            if(typeof params.autoIncrement !== "undefined"){
                this.autoIncrement = params.autoIncrement;
            }
            if(typeof params.indexes !== "undefined"){
                this.indexes = params.indexes;
            }
            this.since = params.since || this.since;
        }
        create(db: IDBDatabase, withIndex:boolean = true): IDBObjectStore{
            var objectStore: IDBObjectStore = db.createObjectStore(this.name, {keyPath: this.keyPath, autoIncrement: this.autoIncrement});
            //create indexes.
            if(withIndex){
                this.indexes.forEach(function(index: IndexParams){
                    if(!(index instanceof Index)){
                        index = new Index(index);
                    }
                    (<Index>index).create(objectStore);
                });
            }
            return objectStore;
        }
//        createIndex(name: string, keyPath: any, unique: boolean = false, multiEntry: boolean = false): IDBIndex{
//            return objectStore.createIndex(this.name, this.keyPath, {unique: this.unique, multiEntry:this.multiEntry});
//        }
    }

    /**
     * index.
     */
    export class Index implements IndexParams{
        name: string;
        keyPath: any;
        unique = false;
        multiEntry = false;
        since: number = 0;

        constructor(params: IndexParams){
            this.name = params.name || this.name;
            this.keyPath = params.keyPath || this.keyPath;
            if(typeof params.unique !== "undefined"){
                this.unique = params.unique;
            }
            if(typeof params.unique !== "undefined"){
                this.multiEntry = params.multiEntry;
            }
        }
        create(objectStore: IDBObjectStore): IDBIndex{
            return objectStore.createIndex(this.name, this.keyPath, {unique: this.unique, multiEntry:this.multiEntry});
        }
    }

    /**
     * connection.
     */
    export class Connection {
        db: IDBDatabase;

        constructor(db: IDBDatabase) {
            this.db = db;
        }
        insert(storeName: string, value: any, key?: any): Transaction {
            var transaction = new Transaction(this, storeName, "readwrite");
            transaction.add(storeName, value, key);
            return transaction;
        }
        save(storeName: string, value: any, key?: any): Transaction {
            var transaction = new Transaction(this, storeName, "readwrite");
            transaction.put(storeName, value, key);
            return transaction;
        }
        transaction(storeNames: any, mode?: string): Transaction{
            return new Transaction(this, storeNames, mode);
        }
    }

    /**
     * transaction
     */
    export class Transaction {
        transaction: IDBTransaction;
        oncomplete: Function = function(){};
        onerror: Function = function(){};
        onabort: Function = function(){};

        constructor(connection: Connection, storeNames: any, mode: string = "readonly"){
            this.transaction = connection.db.transaction(storeNames, mode);
            this.transaction.oncomplete = () => {
                this.oncomplete();
            };
            this.transaction.onerror = () => {
                this.onerror();
            };
            this.transaction.onabort = () => {
                this.onabort();
            };
        }
        add(storeName: string, value: any, key?: any): Transaction{
            var objectStore: IDBObjectStore = this.transaction.objectStore(storeName);
            objectStore.add(value, key);
            return this;
        }
        put(storeName: string, value: any, key?: any): Transaction{
            var objectStore: IDBObjectStore = this.transaction.objectStore(storeName);
            objectStore.put(value, key);
            return this;
        }
        complete(complete: Function): Transaction{
            this.oncomplete = complete;
            return this;
        }
        error(error: Function): Transaction{
            this.onerror = error;
            return this;
        }
        abort(abort: Function): Transaction{
            this.onabort = abort;
            return this;
        }
        withTransaction(func: (t: IDBTransaction) => void): Transaction{
            func(this.transaction);
            return this;
        }
    }
}
