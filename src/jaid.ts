/**
 * Jaid - Jane Indexed Database library
 *
 * @version 0.0.1a
 * @author mzsm j@mzsm.me
 * @license <a href="http://www.opensource.org/licenses/mit-license.php">The MIT License</a>
 */
//var indexedDB = window.indexedDB;
"use strict";

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
        [version: number]: (transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent) => void;
    }

    export class Database{
        name: string;
        version: number = 1;
        objectStores: ObjectStoreParams[] = [];
        onsuccess: (event: Event) => void;
        onerror: (error: DOMError, event: Event) => void;
        onblocked: (event: Event) => void;
        oncreated: (transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent) => void;
        migrationHistory: MigrationHistory = {};
        connection: IConnection;

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
                var transaction: IVersionChangeTransaction = new VersionChangeTransaction<IVersionChangeTransaction>(this.connection, req.transaction);

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
        onCreated(oncreated: (transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent) => void): Database{
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
    export interface IConnection {
        db: IDBDatabase;

        select(storeName: string): IReadOnlyTransaction;
        insert(storeName: string, value: any, key?: any): IReadWriteTransaction;
        save(storeName: string, value: any, key?: any): IReadWriteTransaction;
        readOnlyTransaction(storeNames?: string): IReadOnlyTransaction;
        readOnlyTransaction(storeNames?: string[]): IReadOnlyTransaction;
        readOnlyTransaction(storeNames?: DOMStringList): IReadOnlyTransaction;
        readWriteTransaction(storeNames?: string): IReadWriteTransaction;
        readWriteTransaction(storeNames?: string[]): IReadWriteTransaction;
        readWriteTransaction(storeNames?: DOMStringList): IReadWriteTransaction;
        close(): void;
    }
    class Connection implements IConnection{
        db: IDBDatabase;

        constructor(db: IDBDatabase) {
            this.db = db;
        }
        select(storeName: string): IReadOnlyTransaction{
            var transaction = this.readOnlyTransaction(storeName);
            transaction.begin();
            return transaction;
        }
        insert(storeName: string, value: any, key?: any): IReadWriteTransaction {
            var transaction = this.readWriteTransaction(storeName);
            transaction.begin().add(storeName, value, key);
            return transaction;
        }
        save(storeName: string, value: any, key?: any): IReadWriteTransaction {
            var transaction = this.readWriteTransaction(storeName);
            transaction.begin().put(storeName, value, key);
            return transaction;
        }
        readOnlyTransaction(storeNames?: string): IReadOnlyTransaction;
        readOnlyTransaction(storeNames?: string[]): IReadOnlyTransaction;
        readOnlyTransaction(storeNames?: DOMStringList): IReadOnlyTransaction;
        readOnlyTransaction(storeNames?: any): IReadOnlyTransaction{
            return new ReadOnlyTransaction<IReadOnlyTransaction>(this, storeNames);
        }
        readWriteTransaction(storeNames?: string): IReadWriteTransaction;
        readWriteTransaction(storeNames?: string[]): IReadWriteTransaction;
        readWriteTransaction(storeNames?: DOMStringList): IReadWriteTransaction;
        readWriteTransaction(storeNames?: any): IReadWriteTransaction{
            return new ReadWriteTransaction<IReadWriteTransaction>(this, storeNames);
        }
        close(): void{
            this.db.close();
            this.db = null;
        }
    }

    /**
     * transaction
     */
    export interface _ITransactionBase<Transaction> {
        connection: IConnection;
        transaction: IDBTransaction;
        oncomplete: Function;
        onerror: Function;
        onabort: Function;
        storeNames: string[];
        mode: string;
        results: {[id: number]: any};

        begin(storeNames?: string): Transaction;
        begin(storeNames?: string[]): Transaction;

        onComplete(complete: Function): Transaction;
        onError(error: Function): Transaction;
        onAbort(abort: Function): Transaction;
        withTransaction(func: (t: IDBTransaction) => void): Transaction;
        abort(): void;
    }
    export interface ITransactionBase extends _ITransactionBase<ITransactionBase> {}
    class TransactionBase<T> implements _ITransactionBase<T> {
        connection: Connection;
        transaction: IDBTransaction;
        oncomplete: Function = function(){};
        onerror: Function = function(){};
        onabort: Function = function(){};
        storeNames: any;
        mode: string;
        results: {[id: number]: any} = {};
        private requests: IRequest[] = [];

        constructor(connection: Connection, storeNames?: string);
        constructor(connection: Connection, storeNames?: string[]);
        constructor(connection: Connection, storeNames?: DOMStringList);
        constructor(connection: Connection, storeNames?: any){
            this.connection = connection;
            if(typeof storeNames === "string"){
                storeNames = [storeNames];
            }
            if(storeNames){
                this.storeNames = storeNames;
            }
        }
        begin(storeNames?: string): T;
        begin(storeNames?: string[]): T;
        begin(storeNames?: any): T{
            if(this.transaction){
                throw Error('This transaction was already begun.');
            }
            this.transaction = this.connection.db.transaction(storeNames||this.storeNames, this.mode);
            this._setTransactionEvents();
            return <T><any>this;
        }
        _setTransactionEvents(): void{
            this.transaction.oncomplete = () => {
                this.oncomplete(this.results);
            };
            this.transaction.onerror = () => {
                this.onerror();
            };
            this.transaction.onabort = () => {
                this.onabort();
            };
        }
        onComplete(complete: Function): T{
            this.oncomplete = complete;
            return <T><any>this;
        }
        onError(error: Function): T{
            this.onerror = error;
            return <T><any>this;
        }
        onAbort(abort: Function): T{
            this.onabort = abort;
            return <T><any>this;
        }
        _registerRequest(request: IDBRequest): IRequest{
            var req: IRequest = new Request(this, this.requests.length, request);
            this.requests.push(req);
            return req;
        }
        withTransaction(func: (t: IDBTransaction) => void): T{
            func(this.transaction);
            return <T><any>this;
        }
        abort(): void{
            this.transaction.abort();
        }
    }

    export interface _IReadOnlyTransaction<Transaction> extends _ITransactionBase<Transaction> {
        getByKey(storeName: string, key: any): IRequest;
//        getByIndex(storeName: string): Transaction;
        findByKey(storeName: string, range: any, direction: string): IRequest;
//        findByIndex(storeName: string): Transaction;
    }
    export interface IReadOnlyTransaction extends _IReadOnlyTransaction<IReadOnlyTransaction> {}
    class ReadOnlyTransaction<T> extends TransactionBase<T> implements _IReadOnlyTransaction<T> {
        mode: string = "readonly";

        getByKey(storeName: string, key: any): IRequest{
            var objectStore: IDBObjectStore = this.transaction.objectStore(storeName);
            return this._registerRequest(objectStore.get(key));
        }
        findByKey(storeName: string, range: any, direction: string): IRequest{
            var objectStore: IDBObjectStore = this.transaction.objectStore(storeName);
            return this._registerRequest(objectStore.openCursor(range, direction));
        }
    }

    /**
     * Read/Write transaction
     */
    export interface _IReadWriteTransaction<ReadWriteTransaction> extends _IReadOnlyTransaction<ReadWriteTransaction> {
        add(storeName: string, value: any, key?: any): ReadWriteTransaction;
        put(storeName: string, value: any, key?: any): ReadWriteTransaction;
    }
    export interface IReadWriteTransaction extends _IReadWriteTransaction<IReadWriteTransaction> {}
    class ReadWriteTransaction<T> extends ReadOnlyTransaction<T> implements _IReadWriteTransaction<T>{
        mode: string = "readwrite";

        add(storeName: string, value: any, key?: any): T{
            var objectStore: IDBObjectStore = this.transaction.objectStore(storeName);
            objectStore.add(value, key);
            return <T><any>this;
        }
        put(storeName: string, value: any, key?: any): T{
            var objectStore: IDBObjectStore = this.transaction.objectStore(storeName);
            objectStore.put(value, key);
            return <T><any>this;
        }
    }

    /**
     * Read/Write transaction
     */
    export interface _IVersionChangeTransaction<VersionChangeTransaction> extends _IReadWriteTransaction<VersionChangeTransaction> {
        createObjectStore(objectStore: ObjectStoreParams, indexVersion?: number): IDBObjectStore;
        createIndex(objectStore: string, index: IndexParams): IDBIndex;
        createIndex(objectStore: ObjectStoreParams, index: IndexParams): IDBIndex;
        createIndex(objectStore: IDBObjectStore, index: IndexParams): IDBIndex;
        dropObjectStore(objectStore: string): void;
        dropObjectStore(objectStore: ObjectStoreParams): void;
        dropObjectStore(objectStore: IDBObjectStore): void;
        dropIndex(objectStore: string, index: IndexParams): void;
        dropIndex(objectStore: ObjectStoreParams, index: IndexParams): void;
        dropIndex(objectStore: IDBObjectStore, index: IndexParams): void;
        dropIndex(objectStore: string, index: string): void;
        dropIndex(objectStore: ObjectStoreParams, index: string): void;
        dropIndex(objectStore: IDBObjectStore, index: string): void;
        dropIndex(objectStore: string, index: IDBIndex): void;
        dropIndex(objectStore: ObjectStoreParams, index: IDBIndex): void;
        dropIndex(objectStore: IDBObjectStore, index: IDBIndex): void;
    }
    export interface IVersionChangeTransaction extends _IVersionChangeTransaction<IVersionChangeTransaction> {}
    class VersionChangeTransaction<T> extends ReadWriteTransaction<T>{
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

    /**
     * requests
     */
    export interface IRequest {
        id: number;
        onSuccess(onsuccess: (event: Event) => any): IRequest;
    }
    class Request implements IRequest{
        id: number;
        private transaction: {results: {[id: number]: any}};
        private request: IDBRequest;

        constructor(transaction: {results: {[id: number]: any}}, id: number, request: IDBRequest){
            this.transaction = transaction;
            this.id = id;
            this.request = request;

            this.request.onsuccess = (event: Event) => {
                this.transaction.results[this.id] = event.target;
            }
        }
        onSuccess(onsuccess: (event: Event) => any): Request{
            this.request.onsuccess = onsuccess;
            return this;
        }
    }
}
