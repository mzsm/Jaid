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
declare var IDBIndex: {
    prototype: IDBIndex;
    new (): IDBIndex;
};
declare var IDBTransaction: {
    prototype: IDBTransaction;
    new (): IDBTransaction;
};

module Jaid {
    /**
     * interfaces
     */

    export interface IIndex {
        name?: string;
        keyPath: any;
        unique?: boolean;
        multiEntry?: boolean;
        created?: number;
        dropped?: number;
    }

    export interface IObjectStore {
        name: string;
        keyPath?: any;
        autoIncrement?: boolean;
        indexes?: IIndex[];
        created?: number;
        dropped?: number;
    }

    export interface IMigrationHistory {
        [version: number]: (transaction: IVersionChangeTransaction, migration: IMigration) => void;
    }

    export interface DatabaseParams {
        name?: string;
        version?: number;
        objectStores?: IObjectStore[];
        migrationHistory?: IMigrationHistory
    }

    /**
     * Database Class
     */
    export class Database{
        target: IDBDatabase;
        name: string;
        version: number = 1;
        objectStores: IObjectStore[] = [];
        migrationHistory: IMigrationHistory = {};

        /**
         * constructor with multi parameters
         * @class Database
         * @constructor
         * @param {string} [name] Name of Database
         * @param {number} [version] Version number
         * @param {Array} [objectStores] List of object stores
         * @param {IMigrationHistory} [migrationHistory] History of migration
         */
        constructor(name?: string, version?: number, objectStores?: IObjectStore[], migrationHistory?: IMigrationHistory);
        /**
         * constructor with single parameter
         * @class Database
         * @constructor
         * @param {DatabaseParams} [param] Dictionary of name, version, objectStores list and migrationHistory
         * @param {string} [param.name] Name of Database
         * @param {number} [param.version] Version number
         * @param {Array} [param.objectStores] List of object stores
         * @param {IMigrationHistory} [param.migrationHistory] History of migration
         */
        constructor(param?: DatabaseParams);
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
        constructor(param?: any, version?: number, objectStores?: IObjectStore[], migrationHistory?: IMigrationHistory){
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

        /**
         * Open database
         * @returns {IOpenDBRequest}
         */
        open(): IOpenDBRequest{
            if(this.target){
                throw Error("This database was already opened.");
            }
            var opener: IOpenDBRequest = new OpenDBRequest(this, indexedDB.open(this.name, this.version));
            return opener;
        }

        /**
         * Close database
         */
        close(): void{
            if(!this.target){
                throw Error("This database is not yes opened.");
            }
            this.target.close();
            this.target = null;
        }

        /**
         * Delete database
         */
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

        /**
         * Begin read only transaction
         * @param {string} storeName object store name.
         * @returns {IReadOnlyTransaction} Read only transaction.
         */
        readOnlyTransaction(storeName?: string): IReadOnlyTransaction;
        /**
         * Begin read only transaction
         * @param {string[]} storeNames List of object store name.
         * @returns {IReadOnlyTransaction} Read only transaction.
         */
        readOnlyTransaction(storeNames?: string[]): IReadOnlyTransaction;
        /**
         * Begin read only transaction
         * @param {DOMStringList} storeNames List of object store name.
         * @returns {IReadOnlyTransaction} Read only transaction.
         */
        readOnlyTransaction(storeNames?: DOMStringList): IReadOnlyTransaction;
        readOnlyTransaction(storeNames?: any): IReadOnlyTransaction{
            return new ReadOnlyTransaction<IReadOnlyTransaction>(this, storeNames);
        }

        /**
         * Begin read write transaction
         * @param {string} storeName Object store name.
         * @returns {IReadWriteTransaction} Read write transaction.
         */
        readWriteTransaction(storeName?: string): IReadWriteTransaction;
        /**
         * Begin read write transaction
         * @param {string[]} storeNames List of object store name.
         * @returns {IReadWriteTransaction} Read write transaction.
         */
        readWriteTransaction(storeNames?: string[]): IReadWriteTransaction;
        /**
         * Begin read write transaction
         * @param {DOMStringList} storeNames List of object store name.
         * @returns {IReadWriteTransaction} Read write transaction.
         */
        readWriteTransaction(storeNames?: DOMStringList): IReadWriteTransaction;
        /**
         * Begin read write transaction
         * @param {any} storeNames Object store name, or those list.
         * @returns {IReadWriteTransaction} Read write transaction.
         */
        readWriteTransaction(storeNames?: any): IReadWriteTransaction{
            return new ReadWriteTransaction<IReadWriteTransaction>(this, storeNames);
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
    }

    class OpenDBRequest implements IOpenDBRequest{
        target: IDBOpenDBRequest;
        source: Database;
        onsuccess: (event: Event) => void;
        onerror: (error: DOMError, event: Event) => void;
        onblocked: (event: Event) => void;
        oncreated: (transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent) => void;
        private migrationManager: MigrationManager;

        constructor(db: Database, opener: IDBOpenDBRequest){
            this.source = db;
            this.target = opener;
            try{
                this.migrationManager = new MigrationManager(this, this.source.objectStores, this.source.migrationHistory);
            }catch(e){
                console.log(e, e.stack);
            }

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
                this.migrationManager.execute(transaction, event);
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
    }

    export interface IMigration{
        next(): void;
    }

    class Migration implements IMigration{
        source: MigrationManager;
        continued: boolean = false;
        executed: boolean = false;
        version: number;
        createdObjectStores: IObjectStore[] = [];
        createdIndexes: {storeName: string; index: IIndex}[] = [];
        droppedObjectStores: IObjectStore[] = [];
        droppedIndexes: {storeName: string; index: IIndex}[] = [];
        customOperation: (transaction: IVersionChangeTransaction, migration: IMigration) => void;

        constructor(manager: MigrationManager, version: number){
            this.source = manager;
            this.version = version;
        }
        next(): void{
            if(this.continued){
                console.error("Already called.");
            }else{
                this.continued = true;
                this.source.next();
            }
        }
        execute(transaction: IVersionChangeTransaction): void{
            if(this.executed){
                console.error("Already called.");
                return;
            }
            this.createdObjectStores.forEach((val: IObjectStore) => {
                transaction.createObjectStore(val, this.version);
            });
            this.createdIndexes.forEach((val: {storeName: string; index: IIndex}) => {
                transaction.createIndex(val.storeName, val.index);
            });
            // Remove deprecated objectStore and Index.
            this.droppedObjectStores.forEach((val: IObjectStore) => {
                transaction.dropObjectStore(val);
            });
            this.createdIndexes.forEach((val: {storeName: string; index: IIndex}) => {
                transaction.dropIndex(val.storeName, val.index);
            });
            // Custom operation
            if(this.customOperation){
                this.customOperation(transaction, this);
            }else{
                this.next();
            }
        }
    }

    class MigrationManager {
        private source: IOpenDBRequest;
        private versions: {[version: number]: Migration} = {};
        private versionNumbers: number[] = [];
        private objectStores: IObjectStore[];
        private transaction: IVersionChangeTransaction;

        constructor(source: IOpenDBRequest, objectStores: IObjectStore[], migrationHistory: IMigrationHistory){
            this.source = source;
            this.objectStores = objectStores;
            this.objectStores.forEach((objectStore: IObjectStore) => {
                objectStore = MigrationManager.checkObjectStore(objectStore);
                if(objectStore.created) {
                    var obj = this.get(objectStore.created);
                    obj.createdObjectStores.push(objectStore);
                }
                if(objectStore.dropped){
                    var obj = this.get(objectStore.dropped);
                    obj.droppedObjectStores.push(objectStore);
                }
                objectStore.indexes.forEach((index: IIndex) => {
                    index = MigrationManager.checkIndex(index, objectStore);
                    if(index.created && (!objectStore.created || index.created > objectStore.created)) {
                        var obj = this.get(index.created);
                        obj.createdIndexes.push({storeName: objectStore.name, index: index});
                    }
                    if(index.dropped && (!objectStore.dropped || index.dropped < objectStore.dropped)) {
                        var obj = this.get(index.dropped);
                        obj.droppedIndexes.push({storeName: objectStore.name, index: index});
                    }
                });
            });
            Object.keys(migrationHistory).forEach((versionStr: string) => {
                var versionInt = parseInt(versionStr);
                var obj = this.get(versionInt);
                obj.customOperation = migrationHistory[versionInt];
            });
        }
        private static checkObjectStore(objectStore: IObjectStore): IObjectStore{
            if(objectStore.created && objectStore.dropped && objectStore.created >= objectStore.dropped){
                throw Error(objectStore.name + ': "dropped" is MUST be greater than "created"');
            }
            objectStore.indexes = objectStore.indexes || [];
            return objectStore
        }
        private static checkIndex(index: IIndex, objectStore: IObjectStore): IIndex{
            if(!index.name){
                // If parameter "name" is empty, make name from keyPath.
                if(Array.isArray(index.keyPath)){
                    index.name = index.keyPath.join('_');
                }else{
                    index.name = <string>index.keyPath;
                }
            }
            if(index.created){
                if(index.dropped && index.created >= index.dropped) {
                    throw Error(index.name + ': "dropped" is MUST be greater than "created"');
                }
                if(objectStore.created && index.created < objectStore.created){
                    throw Error(index.name + ': "created" is MUST be greater than or equal to objectStore\'s "created"');
                }
                if(objectStore.dropped && index.created >= objectStore.dropped){
                    throw Error(index.name + ': "created" is MUST be lesser than objectStore\'s "dropped"');
                }
            }
            if(index.dropped){
                if(objectStore.dropped && index.dropped > objectStore.dropped) {
                    throw Error(index.name + ': "dropped" is MUST be lesser than or equal to objectStore\'s "created"');
                }
                if(objectStore.created && index.dropped <= objectStore.created){
                    throw Error(index.name + ': "dropped" is MUST be greater than objectStore\'s "created"');
                }
            }
            return index;
        }
        private get(version: number): Migration{
            if(!(version in this.versions)){
                this.versions[version] = new Migration(this, version);
            }
            return this.versions[version];
        }
        private initialize(version: number){
            this.objectStores.forEach((params: IObjectStore) => {
                // Exclude "already dropped" or "not yet created" indexes.
                if((params.created && params.created > version) ||
                    (params.dropped && params.dropped <= version)){
                    return;
                }
                this.transaction.createObjectStore(params, version);
            });
        }
        private migration(newVersion: number, oldVersion: number){
            this.versionNumbers = Object.keys(this.versions).map((v) => {return parseInt(v)});
            this.versionNumbers = this.versionNumbers.filter(function(v, i){ return(v > oldVersion && v <= newVersion && this.indexOf(v) == i); }, this.versionNumbers).sort();
            this.next();
        }
        next(){
            var nextVersion: number = this.versionNumbers.shift();
            if(nextVersion){
                (<Migration>this.versions[nextVersion]).execute(this.transaction);
            }
        }
        execute(transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent){
            this.transaction = transaction;
            if(event.oldVersion == 0){
                //initialize
                this.initialize(event.newVersion);
                this.source.oncreated(transaction, event);
            }else{
                //migration
                this.migration(event.newVersion, event.oldVersion);
            }
        }
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
        grouping(requests?: IRequestBase[]): IRequestGroup;
        _requestCallback(req: IRequestBase, result: any): void;

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
        requestCounter: number = 0;
        requests: IRequestBase[] = [];
        private groupList: IRequestGroup[] = [];

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
            request.id = this.requestCounter++;
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
        grouping(requests?: IRequestBase[]): RequestGroup{
            var group: RequestGroup = new RequestGroup(<ITransactionBase><any>this, requests);
            group.id = this.requestCounter++;
            this.groupList.push(group);
            return group;
        }
        _requestCallback(req: IRequestBase, result: any): void{
            this.groupList.forEach((group: RequestGroup) => {
                if(req.id in group.queue){
                    if(req.target.error){
                        group.errors[req.id] = <DOMError>result;
                    }else{
                        group.results[req.id] = result;
                    }
                    delete group.queue[req.id];
                    if(group.joined){
                        group.checkComplete();
                    }
                }
            });
        }
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
            var req = <IRequestWithCursor><any>new RequestWithCursor(objectStore.openCursor(range, direction));
            this._registerRequest(req);
            return req;
        }
        findByIndex(storeName: string, indexName:string, range: any, direction: string): IRequestWithCursor{
            var objectStore: IDBObjectStore = this.target.objectStore(storeName);
            var index: IDBIndex = objectStore.index(indexName);
            var req = <IRequestWithCursor><any>new RequestWithCursor(index.openCursor(range, direction));
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
     * Version change transaction
     */
    export interface _IVersionChangeTransaction<VersionChangeTransaction> extends _IReadWriteTransaction<VersionChangeTransaction> {
        createObjectStore(objectStore: IObjectStore, indexVersion?: number): IDBObjectStore;
        createIndex(objectStore: string, index: IIndex): IDBIndex;
        createIndex(objectStore: IObjectStore, index: IIndex): IDBIndex;
        createIndex(objectStore: IDBObjectStore, index: IIndex): IDBIndex;
        dropObjectStore(objectStore: string): void;
        dropObjectStore(objectStore: IObjectStore): void;
        dropObjectStore(objectStore: IDBObjectStore): void;
        dropIndex(objectStore: string, index: IIndex): void;
        dropIndex(objectStore: IObjectStore, index: IIndex): void;
        dropIndex(objectStore: IDBObjectStore, index: IIndex): void;
        dropIndex(objectStore: string, index: string): void;
        dropIndex(objectStore: IObjectStore, index: string): void;
        dropIndex(objectStore: IDBObjectStore, index: string): void;
        dropIndex(objectStore: string, index: IDBIndex): void;
        dropIndex(objectStore: IObjectStore, index: IDBIndex): void;
        dropIndex(objectStore: IDBObjectStore, index: IDBIndex): void;
    }
    export interface IVersionChangeTransaction extends _IVersionChangeTransaction<IVersionChangeTransaction> {}
    class VersionChangeTransaction<T> extends ReadWriteTransaction<T>{
        constructor(db: Database, transaction: IDBTransaction){
            super(db, transaction);
        }

        createObjectStore(objectStore: IObjectStore, indexVersion?: number): IDBObjectStore{
            var idbObjectStore: IDBObjectStore = this.source.target.createObjectStore(objectStore.name, {keyPath: objectStore.keyPath, autoIncrement: objectStore.autoIncrement||false});
            //create indexes.
            if(typeof indexVersion === 'number'){
                objectStore.indexes.forEach((index: IIndex) => {
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
        createIndex(objectStore: string, index: IIndex): IDBIndex;
        createIndex(objectStore: IObjectStore, index: IIndex): IDBIndex;
        createIndex(objectStore: IDBObjectStore, index: IIndex): IDBIndex;
        createIndex(objectStore: any, index: IIndex): IDBIndex{
            var idbObjectStore: IDBObjectStore;
            if(typeof objectStore === "function" && objectStore instanceof IDBObjectStore){
                idbObjectStore = objectStore;
            }else{
                var storeName = (typeof objectStore === "string")? objectStore: objectStore.name;
                idbObjectStore = this.target.objectStore(storeName);
            }

            return idbObjectStore.createIndex(index.name, index.keyPath, {unique: index.unique||false, multiEntry: index.multiEntry||false});
        }
        dropObjectStore(objectStore: string): void;
        dropObjectStore(objectStore: IObjectStore): void;
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
        dropIndex(objectStore: string, index: IIndex): void;
        dropIndex(objectStore: IObjectStore, index: IIndex): void;
        dropIndex(objectStore: IDBObjectStore, index: IIndex): void;
        dropIndex(objectStore: string, index: string): void;
        dropIndex(objectStore: IObjectStore, index: string): void;
        dropIndex(objectStore: IDBObjectStore, index: string): void;
        dropIndex(objectStore: string, index: IDBIndex): void;
        dropIndex(objectStore: IObjectStore, index: IDBIndex): void;
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
        onComplete(complete: Function): T{
            console.error("Cannot change oncomplete event in VersionChangeTransaction.");
            return <T><any>this;
        }
        onError(error: Function): T{
            console.error("Cannot change onerror event in VersionChangeTransaction.");
            return <T><any>this;
        }
        onAbort(abort: Function): T{
            console.error("Cannot change onabort event in VersionChangeTransaction.");
            return <T><any>this;
        }
        abort(): void{
            console.error("Cannot call abort method in VersionChangeTransaction.");
        }
    }

    /**
     * requests
     */
    export interface IRequestBase{
        id: number;
        source: ITransactionBase;
        target: {error: any};
    }

    export interface _IRequest<Req> extends IRequestBase{
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
                console.log(this);
                //this.source.abort();
            });
        }
        onSuccess(onsuccess: (result: any, event: Event) => any): T{
            this.target.onsuccess = (event: Event) => {
                var result = <any>(<IDBRequest>event.target).result;
                this.source._requestCallback(<IRequest><any>this, result);
                onsuccess(result, event);
            };
            return <T><any>this;
        }
        onError(onerror: (error: DOMError, event: Event) => any): T{
            this.target.onerror = (event: Event) => {
                var error = <DOMError>(<IDBRequest>event.target).error;
                this.source._requestCallback(<IRequest><any>this, error);
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
        private _onstopiteration(): void {
            this.source._requestCallback(<IRequest><any>this, this.values);
            if(this.onstopiteration){
                this.onstopiteration(this.values);
            }
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
                    }else{
                        this._onstopiteration();
                    }
                }else{
                    this._onstopiteration();
                }
            };
            return <T><any>this;
        }
    }

    export interface IRequestGroup extends IRequestBase{
        add(request: IRequestBase): void;
        remove(request: IRequestBase): void;
        joinAll(): void;
        onComplete(complete: (results: {[id: number]: any}, errors?: {[id: number]: DOMError}) => void): IRequestGroup;
    }

    class RequestGroup implements IRequestGroup{
        id: number;
        source: ITransactionBase;
        target: {error: any} = {error: false};
        joined: boolean = false;
        requests: IRequestBase[] = [];
        queue: {[id: number]: IRequestBase} = {};
        results: {[id: number]: any} = {};
        errors: {[id: number]: DOMError} = {};
        onsuccess: (result: any, request: IRequestBase) => void = function(){};
        oncomplete: (results: {[id: number]: any}, errors?: {[id: number]: DOMError}) => void = function(){};
        _oncomplete (): void{
            this.source._requestCallback(this, this.results);
            this.oncomplete(this.results, this.errors);
        }

        constructor(transaction: ITransactionBase, requests?: any[]){
            this.source = transaction;
            if(requests){
                this.requests = requests;
                this.requests.forEach((req: IRequestBase) =>{
                    this.queue[req.id] = req;
                });
            }
        }
        add(request: IRequestBase): void{
            this.requests.push(request);
            this.queue[request.id] = request;
        }
        remove(request: IRequestBase): void{
            var idx = this.requests.indexOf(request);
            if(idx != -1){
                delete this.requests[idx];
            }
            if(request.id in this.queue){
                delete this.queue[request.id];
            }
        }
        checkComplete(): void{
            if(Object.keys(this.queue).length == 0){
                this._oncomplete();
            }
        }
        joinAll(): void{
            this.joined = true;
            this.checkComplete();
        }
        onSuccess(onsuccess: (result: any, request: IRequestBase) => void): RequestGroup{
            this.onsuccess = onsuccess;
            return this;
        }
        onComplete(oncomplete: (results: {[id: number]: any}, errors?: {[id: number]: DOMError}) => void): RequestGroup{
            this.oncomplete = oncomplete;
            return this;
        }
    }
}
