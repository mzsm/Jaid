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
declare var IDBTransaction: {
    prototype: IDBTransaction;
    new (): IDBTransaction;
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

    export interface MigrationHistory {
        [version: number]: (transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent) => void;
    }

    export interface DatabaseParams {
        name?: string;
        version?: number;
        objectStores?: ObjectStoreParams[];
        migration?: MigrationHistory
    }

    /**
     *
     */
    export class Database{
        target: IDBDatabase;
        name: string;
        version: number = 1;
        objectStores: ObjectStoreParams[] = [];
        migrationHistory: MigrationHistory = {};

        /**
         * constructor with 3 parameters
         * @param name: string ... Name of Database
         * @param version: number ... Version number
         * @param objectStores: ObjectParams[] ... List of object stores
         */
        constructor(name?: string, version?: number, objectStores?: ObjectStoreParams[], migrationHistory?: MigrationHistory);
        /**
         * constructor with 1 parameter
         * @param param: DatabaseParams ... Dictionary of name, version and objectStores list
         */
        constructor(param?: DatabaseParams);
        constructor(param?: any, version?: number, objectStores?: ObjectStoreParams[], migrationHistory?: MigrationHistory){
            if(typeof param === "string"){
                this.name = param;
                this.version = version || this.version;
                this.objectStores = objectStores || this.objectStores;
                this.migrationHistory = migrationHistory || this.migrationHistory;
            }else if(typeof param === "object" && !!param){
                this.name = param.name || this.name;
                this.version = param.version || this.version;
                this.objectStores = param.objectStores || this.objectStores;
                this.migrationHistory = param.migrationHistory || this.migrationHistory;
            }
        }
        open(): IOpenDBRequest{
            if(this.target){
                throw Error("This database was already opened.");
            }
            var opener: IOpenDBRequest = new OpenDBRequest(this, indexedDB.open(this.name, this.version));
            return opener;
        }
        close(): void{
            if(!this.target){
                throw Error("This database is not yes opened.");
            }
            this.target.close();
            this.target = null;
        }
        delete(): void{
            indexedDB.deleteDatabase(this.name);
        }
        insert(storeName: string, value: any, key?: any): IRequest {
            var transaction = this.readWriteTransaction(storeName);
            var req: IRequest = transaction.add(storeName, value, key);
            return req;
        }
        save(storeName: string, value: any, key?: any): IRequest {
            var transaction = this.readWriteTransaction(storeName);
            var req: IRequest = transaction.put(storeName, value, key);
            return req;
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
     * open DB request
     */
    export interface IOpenDBRequest{
        target: IDBOpenDBRequest;
        onsuccess: (event: Event) => void;
        onerror: (error: DOMError, event: Event) => void;
        onblocked: (event: Event) => void;
        oncreated: (transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent) => void;

        onSuccess(onsuccess: (event: Event) => void): IOpenDBRequest;
        onError(onerror: (error: DOMError, event: Event) => void): IOpenDBRequest;
        onBlocked(onblocked: (event: Event) => void): IOpenDBRequest;
        onCreated(oncreated: (transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent) => void): IOpenDBRequest;
        //migration(migrationHistory: MigrationHistory): IOpenDBRequest;
    }

    class OpenDBRequest implements IOpenDBRequest{
        target: IDBOpenDBRequest;
        source: Database;
        onsuccess: (event: Event) => void;
        onerror: (error: DOMError, event: Event) => void;
        onblocked: (event: Event) => void;
        oncreated: (transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent) => void;

        constructor(db: Database, opener: IDBOpenDBRequest){
            this.source = db;
            this.target = opener;
            opener.onsuccess = (event: Event) => {
                this.source.target = <IDBDatabase>(<IDBOpenDBRequest>event.target).result;
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
                this.source.target = <IDBDatabase>req.result;
                var transaction: IVersionChangeTransaction = new VersionChangeTransaction<IVersionChangeTransaction>(this.source, req.transaction);
                if(event.oldVersion == 0){
                    //initialize
                    this.source.objectStores.forEach((params: ObjectStoreParams) => {
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
                    this.source.objectStores.forEach((params: ObjectStoreParams) => {
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
                                droppedIndexes[p.dropped].push({storeName: params.name, index: p});
                            }
                        });
                    });
                    var versions: number[] = Object.keys(createdObjectStores)
                        .concat(Object.keys(createdIndexes))
                        .concat(Object.keys(droppedObjectStores))
                        .concat(Object.keys(droppedIndexes))
                        .concat(Object.keys(this.source.migrationHistory)).map((v) => {return parseInt(v)});
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
                            if(version in this.source.migrationHistory){
                                this.source.migrationHistory[version](transaction, event);
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
                    /*
                    */
                }
            };
        }
        onSuccess(onsuccess: (event: Event) => void): OpenDBRequest{
            this.onsuccess = onsuccess;
            return this;
        }
        onError(onerror: (error: DOMError, event: Event) => void): OpenDBRequest{
            this.onerror = onerror;
            return this;
        }
        onBlocked(onblocked: (event: Event) => void): OpenDBRequest{
            this.onblocked = onblocked;
            return this;
        }
        onCreated(oncreated: (transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent) => void): OpenDBRequest{
            this.oncreated = oncreated;
            return this;
        }
        //migration(migrationHistory: MigrationHistory): OpenDBRequest{
        //    //this.migrationHistory = migrationHistory;
        //    return this;
        //}
    }

    /**
     * transaction
     */
    export interface _ITransactionBase<Transaction> {
        source: Database;
        target: IDBTransaction;
        oncomplete: Function;
        onerror: Function;
        onabort: Function;
        results: {[id: number]: any};
        requests: any[];

        onComplete(complete: Function): Transaction;
        onError(error: Function): Transaction;
        onAbort(abort: Function): Transaction;

        abort(): void;
    }
    export interface ITransactionBase extends _ITransactionBase<ITransactionBase> {}
    class TransactionBase<T> implements _ITransactionBase<T> {
        source: Database;
        target: IDBTransaction;
        oncomplete: Function = function(){};
        onerror: Function = function(){};
        onabort: Function = function(){};
        results: {[id: number]: any} = {};
        requests: any[] = [];
        _joinList: any[] = [];

        constructor(db: Database, storeNames?: string, mode?: string);
        constructor(db: Database, storeNames?: string[], mode?: string);
        constructor(db: Database, storeNames?: DOMStringList, mode?: string);
        constructor(db: Database, storeNames?: IDBTransaction, mode?: string);
        constructor(db: Database, storeNames?: any, mode?: string){
            this.source = db;
            if(typeof storeNames === "object" && storeNames instanceof IDBTransaction) {
                this.target = storeNames;
            }else{
                if(typeof storeNames === "string"){
                    storeNames = [storeNames];
                }
                this.target = this.source.target.transaction(storeNames, mode);
            }
            this.target.oncomplete = () => {
                this.oncomplete(this.results);
            };
            this.target.onerror = () => {
                this.onerror();
            };
            this.target.onabort = () => {
                this.onabort();
            };
        }
        _registerRequest(request: IRequest): T{
            request.id = this.requests.length;
            request.source = <ITransactionBase><any>this;
            this.requests.push(request);
            return <T><any>this;
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

        abort(): void{
            this.target.abort();
        }
        //get requestIdList: number[]{
        //    return Object.keys(this.requests).map((id)=>{parseInt(id)});
        //}
    }

    export interface _IReadOnlyTransaction<Transaction> extends _ITransactionBase<Transaction> {
        getByKey(storeName: string, key: any): IRequest;
        getByIndex(storeName: string, indexName:string, key: any): IRequest;
        findByKey(storeName: string, range: any, direction: string): IRequestWithCursor;
        findByIndex(storeName: string, indexName:string, range: any, direction: string): IRequestWithCursor;
    }
    export interface IReadOnlyTransaction extends _IReadOnlyTransaction<IReadOnlyTransaction> {}
    class ReadOnlyTransaction<T> extends TransactionBase<T> implements _IReadOnlyTransaction<T> {

        constructor(db: Database, storeNames?: string, mode?: string);
        constructor(db: Database, storeNames?: string[], mode?: string);
        constructor(db: Database, storeNames?: DOMStringList, mode?: string);
        constructor(db: Database, storeNames?: IDBTransaction, mode?: string);
        constructor(db: Database, storeNames?: any, mode?: string) {
            super(db, storeNames, mode || "readonly");
        }
        getByKey(storeName: string, key: any): IRequest{
            var objectStore: IDBObjectStore = this.target.objectStore(storeName);
            var req = <IRequest>new Request(objectStore.get(key));
            this._registerRequest(req);
            return req;
        }
        getByIndex(storeName: string, indexName:string, key: any): IRequest{
            var objectStore: IDBObjectStore = this.target.objectStore(storeName);
            var index: IDBIndex = objectStore.index(indexName);
            var req = <IRequest>new Request(index.get(key));
            this._registerRequest(req);
            return req;
        }
        findByKey(storeName: string, range: any, direction: string): IRequestWithCursor{
            var objectStore: IDBObjectStore = this.target.objectStore(storeName);
            var req = <IRequestWithCursor>new RequestWithCursor(objectStore.openCursor(range, direction));
            this._registerRequest(req);
            return req;
        }
        findByIndex(storeName: string, indexName:string, range: any, direction: string): IRequestWithCursor{
            var objectStore: IDBObjectStore = this.target.objectStore(storeName);
            var index: IDBIndex = objectStore.index(indexName);
            var req = <IRequestWithCursor>new RequestWithCursor(index.openCursor(range, direction));
            this._registerRequest(req);
            return req;
        }
    }

    /**
     * Read/Write transaction
     */
    export interface _IReadWriteTransaction<ReadWriteTransaction> extends _IReadOnlyTransaction<ReadWriteTransaction> {
        add(storeName: string, value: any, key?: any): IRequest;
        put(storeName: string, value: any, key?: any): IRequest;
        deleteByKey(storeName: string, key: any): IRequest;
    }
    export interface IReadWriteTransaction extends _IReadWriteTransaction<IReadWriteTransaction> {}
    class ReadWriteTransaction<T> extends ReadOnlyTransaction<T> implements _IReadWriteTransaction<T>{

        constructor(db: Database, storeNames?: string, mode?: string);
        constructor(db: Database, storeNames?: string[], mode?: string);
        constructor(db: Database, storeNames?: DOMStringList, mode?: string);
        constructor(db: Database, storeNames?: IDBTransaction, mode?: string);
        constructor(db: Database, storeNames?: any, mode?: string) {
            super(db, storeNames, mode || "readwrite");
        }
        add(storeName: string, value: any, key?: any): IRequest{
            var objectStore: IDBObjectStore = this.target.objectStore(storeName);
            var req = <IRequest>new Request(objectStore.add(value, key));
            this._registerRequest(req);
            return req;
        }
        put(storeName: string, value: any, key?: any): IRequest{
            var objectStore: IDBObjectStore = this.target.objectStore(storeName);
            var req = <IRequest>new Request(objectStore.put(value, key));
            this._registerRequest(req);
            return req;
        }
        deleteByKey(storeName: string, key: any): IRequest{
            var objectStore: IDBObjectStore = this.target.objectStore(storeName);
            var req = <IRequest>new Request(objectStore.delete(key));
            this._registerRequest(req);
            return req;
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
        constructor(db: Database, transaction: IDBTransaction){
            super(db, transaction);
        }

        createObjectStore(objectStore: ObjectStoreParams, indexVersion?: number): IDBObjectStore{
            if(!(objectStore instanceof ObjectStore)){
                objectStore = new ObjectStore(objectStore);
            }
            var idbObjectStore: IDBObjectStore = this.source.target.createObjectStore(objectStore.name, {keyPath: objectStore.keyPath, autoIncrement: objectStore.autoIncrement||false});

            //create indexes.
            if(typeof indexVersion === 'number'){
                objectStore.indexes.forEach((index: IndexParams) => {
                    // Exclude "already dropped" or "not yet created" indexes.
                    if((index.created && index.created > indexVersion) ||
                        (index.dropped && index.dropped <= indexVersion)){
                        return;
                    }
                    this.createIndex(idbObjectStore, index);
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
                idbObjectStore = this.target.objectStore(storeName);
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
            var name: string;
            if(typeof objectStore === "string"){
                name = <string>objectStore;
            }else{
                name = <string>objectStore.name;
            }
            this.source.target.deleteObjectStore(name);
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
                idbObjectStore = this.target.objectStore(storeName);
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
    export interface _IRequest<Req> {
        id: number;
        source: ITransactionBase;
        target: IDBRequest;

        onSuccess(onsuccess: (result: any, event: Event) => any): Req;
        onError(onerror: (error: DOMError, event: Event) => any): Req;
    }
    export interface IRequest extends _IRequest<IRequest> {}
    class Request<T> implements _IRequest<T>{
        id: number;
        source: ITransactionBase;
        target: IDBRequest;

        constructor(request: IDBRequest){
            this.target = request;
            this.onSuccess((result: any, event: Event) => {
                this.source.results[this.id] = event.target;
            });
            this.onError((error: DOMError, event: Event) => {
                this.source.abort();
            });
        }
        onSuccess(onsuccess: (result: any, event: Event) => any): T{
            this.target.onsuccess = (event: Event) => {
                var result = <any>(<IDBRequest>event.target).result;
                onsuccess(result, event);
            };
            return <T><any>this;
        }
        onError(onerror: (error: DOMError, event: Event) => any): T{
            this.target.onerror = (event: Event) => {
                var error = <DOMError>(<IDBRequest>event.target).error;
                onerror(error, event);
            };
            return <T><any>this;
        }
    }

    export interface _IRequestWithCursor<Req> extends _IRequest<Req>{
        continueFlag: boolean;
        stopCursor(): void;
        values: any[];
        onstopiteration: (results: any[]) => void;
        onStopIteration(func: (results: any[]) => void): Req;
        onSuccess(onsuccess: (result: any, event: Event) => any): Req;
    }
    export interface IRequestWithCursor extends _IRequestWithCursor<IRequestWithCursor> {}
    class RequestWithCursor<T> extends Request<T> implements _IRequestWithCursor<T>{
        continueFlag: boolean = true;
        onstopiteration: (results: any[]) => void;
        values: any[] = [];

        constructor(request: IDBRequest) {
            super(request);
            this.onSuccess((result: any, event: Event) => {
                this.values.push({key: result.key, primaryKey: result.primaryKey, value: result.value});
            });
        }
        stopCursor(): void{
            this.continueFlag = false;
        }
        onStopIteration(func: (results: any[]) => void): T{
            this.onstopiteration = (results: any) => {
                func(results);
                this.source.results[this.id] = event.target;
            };
            return <T><any>this;
        }
        onSuccess(onsuccess: (result: any, event: Event) => any): T{
            this.target.onsuccess = (event: Event) => {
                var result = <IDBCursorWithValue>(<IDBRequest>event.target).result;
                if(result){
                    onsuccess(result, event);
                    if(this.continueFlag){
                        result.continue();
                    }else if(this.onstopiteration){
                        this.onstopiteration(this.values);
                    }
                }else if(this.onstopiteration){
                    this.onstopiteration(this.values);
                }
            };
            return <T><any>this;
        }
    }
}
