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
    export interface ObjectStoreParams {
        keyPath?: any;
        autoIncrement?: boolean;
        indexes?: Indexes;
        since?: number;
    }

    export interface ObjectStores {
        [key: string]: ObjectStoreParams
    }

    export interface IndexParams {
        keyPath: any;
        unique?: boolean;
        multiEntry?: boolean;
        since?: number;
    }

    export interface Indexes {
        [key: string]: IndexParams;
    }

    export interface UpgradeHistory {
        [version: number]: (req: IDBOpenDBRequest) => void;
    }

    export class Database {
        name: string;
        version: number;
        objectStores: ObjectStores = {};
        onsuccess: Function = function(){};
        onerror: Function = function(){};
        onversionchange: Function = (event: IDBVersionChangeEvent) => {};
        upgradeHistory: UpgradeHistory = {};
        connection: Connection;

        constructor(name?: string, version?: number, objectStores?: ObjectStores){
            this.name = name || this.name;
            this.version = version || this.version;
            this.objectStores = objectStores || this.objectStores;
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
                        this._createObjectStore(db, name, params);
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
                                objectStoreChanges[version].forEach((val: any[]) => {
                                    this._createObjectStore(db, val[0], val[1]);
                                });
                            }
                            if(version in indexChanges){
                                indexChanges[version].forEach((val: any[]) => {
                                    var objectStore = transaction.objectStore(val[0]);
                                    this._createIndex(objectStore, val[1], val[2]);
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
        versionchange(onversionchange: Function): Database{
            this.onversionchange = onversionchange;
            return this;
        }
        history(upgradeHistory: UpgradeHistory): Database{
            this.upgradeHistory = upgradeHistory;
            return this;
        }
        private _createObjectStore(db: IDBDatabase, name: string, params: ObjectStoreParams, withIndex = true): IDBObjectStore{
            var objectStore: IDBObjectStore = db.createObjectStore(
                name,
                {keyPath: params.keyPath, autoIncrement: params.autoIncrement}
            );
            if(withIndex){
                Object.keys(params.indexes).forEach((indexName: string) => {
                    var indexParams: IndexParams = params.indexes[indexName];
                    this._createIndex(objectStore, indexName, indexParams);
                });
            }
            return objectStore;
        }
        private _createIndex(objectStore: IDBObjectStore, name: string, params: IndexParams): IDBIndex{
            return objectStore.createIndex(
                name,
                params.keyPath,
                {unique:params.unique, multiEntry:params.multiEntry}
            );
        }
    }

    /**
     * object store.
     */
    export class ObjectStore {
        name: string;
        keyPath: string;
        autoIncrement: boolean = false;
        indexes: Indexes = {};

        constructor(name?: string, options?: {keyPath?: string; autoIncrement?: boolean}, indexes?: Indexes){
            this.name = name || this.name;
            this.keyPath = options.keyPath || this.keyPath;
            if(typeof options.autoIncrement !== "undefined"){
                this.autoIncrement = options.autoIncrement;
            }
            if(typeof indexes !== "undefined"){
                this.indexes = indexes;
            }
        }
        create(db: IDBDatabase): IDBObjectStore{
            var objectStore: IDBObjectStore = db.createObjectStore(this.name, {keyPath: this.keyPath, autoIncrement: this.autoIncrement});
            //create indexes.
            /*
            this.indexes.forEach(function(index){
                index.create(objectStore);
            });
            */
            return objectStore;
        }
//        createIndex(name: string, keyPath: any, unique: boolean = false, multiEntry: boolean = false): IDBIndex{
//            return objectStore.createIndex(this.name, this.keyPath, {unique: this.unique, multiEntry:this.multiEntry});
//        }
    }

    /**
     * index.
     */
    export class Index {
        name: string;
        keyPath: any;
        unique = false;
        multiEntry = false;
        since: number = 0;

        constructor(name?: string, keyPath?:any, options?: {unique?: boolean; multiEntry?: boolean}){
            this.name = name || this.name;
            this.keyPath = keyPath || this.keyPath;

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
