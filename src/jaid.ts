/**
 * Jaid - Jane Indexed Database library
 *
 * @version 0.0.1a
 * @author mzsm j@mzsm.me
 * @license <a href="http://www.opensource.org/licenses/mit-license.php">The MIT License</a>
 */
//var indexedDB = window.indexedDB;
"strict mode";

interface DOMError {
    message?: string
}
declare var IDBObjectStore: {
    prototype: IDBObjectStore;
    new (): IDBObjectStore;
};

module Jaid {
    export interface IndexParams {
        name?: string;
        keyPath: any;
        unique?: boolean;
        multiEntry?: boolean;
        created?: number;
        dropped?: number;
    }

    export interface ObjectStoreParams {
        name: string;
        keyPath?: any;
        autoIncrement?: boolean;
        indexes?: IndexParams[];
        created?: number;
        dropped?: number;
    }

    export interface DatabaseParams {
        name?: string;
        version?: number;
        objectStores?: ObjectStoreParams[];
    }

    export interface MigrationHistory {
        [version: number]: (transaction: VersionChangeTransaction, event: IDBVersionChangeEvent) => void;
    }

    export class Database{
        name: string;
        version: number = 1;
        objectStores: ObjectStoreParams[] = [];
        onsuccess: (event: Event) => void;
        onerror: (error: DOMError, event: Event) => void;
        onblocked: (event: Event) => void;
        oncreated: (transaction: VersionChangeTransaction, event: IDBVersionChangeEvent) => void;
        migrationHistory: MigrationHistory = {};
        connection: Connection;

        constructor(name?: string, version?: number, objectStores?: ObjectStoreParams[]);
        constructor(param?: DatabaseParams);
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
            if(this.connection){
                throw Error('This database was already opened.');
            }
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
            opener.onblocked = (event: Event) => {
                this.onblocked(event);
            };
            opener.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                var req = <IDBOpenDBRequest>event.target;
                var db = <IDBDatabase>req.result;
                this.connection = new Connection(db);
                var transaction = new VersionChangeTransaction(this.connection, req.transaction);

                if(event.oldVersion == 0){
                    //initialize
                    this.objectStores.forEach((params: ObjectStoreParams) => {
                        // Exclude "already dropped" or "not yet created" indexes.
                        if((params.created && params.created > event.newVersion) ||
                            (params.dropped && params.dropped <= event.newVersion)){
                            return;
                        }
                        transaction.createObjectStore(params, event.newVersion);
                    });
                    if(this.oncreated){
                        this.oncreated(transaction, event);
                    }
                }else{
                    //migration
                    var createdObjectStores: {[ver: number]: ObjectStoreParams[]} = {};
                    var droppedObjectStores: {[ver: number]: ObjectStoreParams[]} = {};
                    var createdIndexes: {[ver: number]: {storeName: string; index: IndexParams}[]} = {};
                    var droppedIndexes: {[ver: number]: {storeName: string; index: IndexParams}[]} = {};
                    this.objectStores.forEach((params: ObjectStoreParams) => {
                        if(params.created) {
                            if (!(params.created in createdObjectStores)) {
                                createdObjectStores[params.created] = [];
                            }
                            createdObjectStores[params.created].push(params);
                        }
                        if(params.dropped){
                            if (!(params.dropped in droppedObjectStores)) {
                                droppedObjectStores[params.dropped] = [];
                            }
                            droppedObjectStores[params.dropped].push(params);
                        }
                        params.indexes.forEach((p: IndexParams) => {
                            if(p.created && (!params.created || p.created > params.created)) {
                                if (!(p.created in createdIndexes)) {
                                    createdIndexes[p.created] = [];
                                }
                                createdIndexes[p.created].push({storeName: params.name, index: p});
                            }
                            if(p.dropped && (!params.dropped || p.dropped < params.dropped)) {
                                if (!(p.dropped in droppedIndexes)) {
                                    droppedIndexes[p.dropped] = [];
                                }
                                droppedIndexes[p.created].push({storeName: params.name, index: p});
                            }
                        });
                    });
                    var versions: number[] = Object.keys(createdObjectStores)
                        .concat(Object.keys(createdIndexes))
                        .concat(Object.keys(droppedObjectStores))
                        .concat(Object.keys(droppedIndexes))
                        .concat(Object.keys(this.migrationHistory)).map((v) => {return parseInt(v)});
                    versions.filter(function(v, i){ return(v > event.oldVersion && v <= event.newVersion && this.indexOf(v) == i); }, versions)
                        .sort()
                        .forEach((version: number) => {
                            // Add new objectStore and Index.
                            if(version in createdObjectStores){
                                createdObjectStores[version].forEach((val: ObjectStoreParams) => {
                                    transaction.createObjectStore(val, version);
                                });
                            }
                            if(version in createdIndexes){
                                createdIndexes[version].forEach((val: {storeName: string; index: IndexParams}) => {
                                    transaction.createIndex(val.storeName, val.index);
                                });
                            }
                            // Custom operation
                            if(version in this.migrationHistory){
                                this.migrationHistory[version](transaction, event);
                            }

                            // Remove deprecated objectStore and Index.
                            if(version in droppedObjectStores){
                                droppedObjectStores[version].forEach((val: ObjectStoreParams) => {
                                    transaction.dropObjectStore(val);
                                });
                            }
                            if(version in createdIndexes){
                                createdIndexes[version].forEach((val: {storeName: string; index: IndexParams}) => {
                                    transaction.dropIndex(val.storeName, val.index);
                                });
                            }
                        });
                }
            };
            return this;
        }
        onSuccess(onsuccess: (event: Event) => void): Database{
            this.onsuccess = onsuccess;
            return this;
        }
        onError(onerror: (error: DOMError, event: Event) => void): Database{
            this.onerror = onerror;
            return this;
        }
        onBlocked(onblocked: (event: Event) => void): Database{
            this.onblocked = onblocked;
            return this;
        }
        onCreated(oncreated: (transaction: VersionChangeTransaction, event: IDBVersionChangeEvent) => void): Database{
            this.oncreated = oncreated;
            return this;
        }
        onMigration(migrationHistory: MigrationHistory): Database{
            this.migrationHistory = migrationHistory;
            return this;
        }
        delete(): void{
            indexedDB.deleteDatabase(this.name);
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
        created: number = 0;

        constructor(params: ObjectStoreParams){
            this.name = params.name || this.name;
            this.keyPath = params.keyPath || this.keyPath;
            if(typeof params.autoIncrement !== "undefined"){
                this.autoIncrement = params.autoIncrement;
            }
            if(typeof params.indexes !== "undefined"){
                this.indexes = params.indexes;
            }
            this.created = params.created || this.created;
        }
    }

    /**
     * index.
     */
    export class Index implements IndexParams{
        name: string;
        keyPath: any;
        unique = false;
        multiEntry = false;
        created: number = 0;
        dropped: number;

        constructor(params: IndexParams){
            this.name = params.name || this.name;
            this.keyPath = params.keyPath || this.keyPath;
            if(typeof params.unique !== "undefined"){
                this.unique = params.unique;
            }
            if(typeof params.unique !== "undefined"){
                this.multiEntry = params.multiEntry;
            }
            this.created = params.created;
            this.dropped = params.dropped;
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
        select(storeName: string): ReadOnlyTransaction{
            var transaction = new ReadOnlyTransaction(this, storeName);

            return transaction;
        }
        insert(storeName: string, value: any, key?: any): ReadWriteTransaction {
            var transaction: ReadWriteTransaction = new ReadWriteTransaction(this, storeName);
            transaction.begin().add(storeName, value, key);
            return transaction;
        }
        save(storeName: string, value: any, key?: any): ReadWriteTransaction {
            var transaction: ReadWriteTransaction = new ReadWriteTransaction(this, storeName);
            transaction.begin().put(storeName, value, key);
            return transaction;
        }
        transaction(storeNames: string, mode: string): Transaction;
        transaction(storeNames: string[], mode: string): Transaction;
        transaction(storeNames: any, mode: string): Transaction{
            switch (mode){
                case "readonly":
                    return new ReadOnlyTransaction(this, storeNames);
                case "readwrite":
                    return new ReadWriteTransaction(this, storeNames);
                default:
                    throw Error("parameter mode is \"readonly\" or \"readwrite\"");
            }
        }
        close(): void{
            this.db.close();
            this.db = null;
        }
    }

    /**
     * upgrade connection
     */

    /**
     * transaction
     */
    export class Transaction {
        connection: Connection;
        transaction: IDBTransaction;
        oncomplete: Function = function(){};
        onerror: Function = function(){};
        onabort: Function = function(){};
        storeNames: string[];
        mode: string;

        constructor(connection: Connection, storeNames?: string);
        constructor(connection: Connection, storeNames?: string[]);
        constructor(connection: Connection, storeNames?: any){
            this.connection = connection;
            if(typeof storeNames === "string"){
                storeNames = [storeNames];
            }
            if(storeNames){
                this.storeNames = storeNames;
            }
        }
        begin(storeNames?: string): any;
        begin(storeNames?: string[]): any;
        begin(storeNames?: any): any{
            if(this.transaction){
                throw Error('This transaction was already begun.');
            }
            this.transaction = this.connection.db.transaction(storeNames, this.mode);
            this._setTransactionEvents();
            return this;
        }
        _setTransactionEvents(): void{
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
        onComplete(complete: Function): any{
            this.oncomplete = complete;
            return this;
        }
        onError(error: Function): any{
            this.onerror = error;
            return this;
        }
        onAbort(abort: Function): any{
            this.onabort = abort;
            return this;
        }
        withTransaction(func: (t: IDBTransaction) => void){
            func(this.transaction);
            return this;
        }
        abort(): void{
            this.transaction.abort();
        }
    }

    export class ReadOnlyTransaction extends Transaction{
        mode: string = "readonly";
    }

    /**
     * Read/Write transaction
     */
    export class ReadWriteTransaction extends ReadOnlyTransaction{
        mode: string = "readwrite";
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
    }

    /**
     * Read/Write transaction
     */
    export class VersionChangeTransaction extends ReadWriteTransaction{
        constructor(connection: Connection, transaction: IDBTransaction){
            super(connection);
            this.transaction = transaction;
            this._setTransactionEvents();
        }
        createObjectStore(objectStore: ObjectStoreParams, indexVersion?: number): IDBObjectStore{
            var db = this.connection.db;
            if(!(objectStore instanceof ObjectStore)){
                objectStore = new ObjectStore(objectStore);
            }
            var idbObjectStore: IDBObjectStore = db.createObjectStore(objectStore.name, {keyPath: objectStore.keyPath, autoIncrement: objectStore.autoIncrement||false});

            //create indexes.
            if(typeof indexVersion === 'number'){
                objectStore.indexes.forEach((index: IndexParams) => {
                    // Exclude "already dropped" or "not yet created" indexes.
                    if((index.created && index.created > indexVersion) ||
                        (index.dropped && index.dropped <= indexVersion)){
                        return;
                    }
                    //this.createIndex(idbObjectStore, index);
                });
            }
            return idbObjectStore;
        }
        createIndex(objectStore: string, index: IndexParams): IDBIndex;
        createIndex(objectStore: ObjectStoreParams, index: IndexParams): IDBIndex;
        createIndex(objectStore: IDBObjectStore, index: IndexParams): IDBIndex;
        createIndex(objectStore: any, index: IndexParams): IDBIndex{
            var idbObjectStore: IDBObjectStore;
            if(typeof objectStore === "function" && objectStore instanceof IDBObjectStore){
                idbObjectStore = objectStore;
            }else{
                var storeName = (typeof objectStore === "string")? objectStore: objectStore.name;
                idbObjectStore = this.transaction.objectStore(storeName);
            }
            if(!(index instanceof Index)){
                index = new Index(index);
            }

            return idbObjectStore.createIndex(index.name, index.keyPath, {unique: index.unique||false, multiEntry: index.multiEntry||false});
        }
        dropObjectStore(objectStore: string): void;
        dropObjectStore(objectStore: ObjectStoreParams): void;
        dropObjectStore(objectStore: IDBObjectStore): void;
        dropObjectStore(objectStore: any): void{
            var db = this.connection.db;
            var name: string;
            if(typeof objectStore === "string"){
                name = <string>objectStore;
            }else{
                name = <string>objectStore.name;
            }
            db.deleteObjectStore(name);
        }
        dropIndex(objectStore: string, index: IndexParams): void;
        dropIndex(objectStore: ObjectStoreParams, index: IndexParams): void;
        dropIndex(objectStore: IDBObjectStore, index: IndexParams): void;
        dropIndex(objectStore: string, index: string): void;
        dropIndex(objectStore: ObjectStoreParams, index: string): void;
        dropIndex(objectStore: IDBObjectStore, index: string): void;
        dropIndex(objectStore: string, index: IDBIndex): void;
        dropIndex(objectStore: ObjectStoreParams, index: IDBIndex): void;
        dropIndex(objectStore: IDBObjectStore, index: IDBIndex): void;
        dropIndex(objectStore: any, index: any): void{
            var idbObjectStore: IDBObjectStore;
            var indexName: string;
            if(typeof objectStore === "function" && objectStore instanceof IDBObjectStore){
                idbObjectStore = objectStore;
            }else{
                var storeName = (typeof objectStore === "string")? objectStore: objectStore.name;
                idbObjectStore = this.transaction.objectStore(storeName);
            }
            if(typeof index === 'string'){
                indexName = index;
            }else{
                indexName = index.name;
            }
            idbObjectStore.deleteIndex(indexName);
        }
    }
}
