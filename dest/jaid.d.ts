interface DOMError {
    message?: string;
}
declare var IDBObjectStore: {
    prototype: IDBObjectStore;
    new(): IDBObjectStore;
};
declare var IDBIndex: {
    prototype: IDBIndex;
    new(): IDBIndex;
};
declare var IDBTransaction: {
    prototype: IDBTransaction;
    new(): IDBTransaction;
};
declare module Jaid {
    /**
    * interfaces
    */
    interface IIndex {
        name?: string;
        keyPath: any;
        unique?: boolean;
        multiEntry?: boolean;
        created?: number;
        dropped?: number;
    }
    interface IObjectStore {
        name: string;
        keyPath?: any;
        autoIncrement?: boolean;
        indexes?: IIndex[];
        created?: number;
        dropped?: number;
    }
    interface IMigrationHistory {
        [version: number]: (transaction: IVersionChangeTransaction, migration: IMigration) => void;
    }
    interface DatabaseParams {
        name?: string;
        version?: number;
        objectStores?: IObjectStore[];
        migrationHistory?: IMigrationHistory;
    }
    /**
    * Database Class
    */
    class Database {
        public target: IDBDatabase;
        public name: string;
        public version: number;
        public objectStores: IObjectStore[];
        public migrationHistory: IMigrationHistory;
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
        * Open database
        * @returns {IOpenDBRequest}
        */
        public open(): IOpenDBRequest;
        /**
        * Close database
        */
        public close(): void;
        /**
        * Delete database
        */
        public delete(): void;
        public insert(storeName: string, value: any, key?: any): IRequest;
        public save(storeName: string, value: any, key?: any): IRequest;
        /**
        * Begin read only transaction
        * @param {string} storeName object store name.
        * @returns {IReadOnlyTransaction} Read only transaction.
        */
        public readOnlyTransaction(storeName?: string): IReadOnlyTransaction;
        /**
        * Begin read only transaction
        * @param {string[]} storeNames List of object store name.
        * @returns {IReadOnlyTransaction} Read only transaction.
        */
        public readOnlyTransaction(storeNames?: string[]): IReadOnlyTransaction;
        /**
        * Begin read only transaction
        * @param {DOMStringList} storeNames List of object store name.
        * @returns {IReadOnlyTransaction} Read only transaction.
        */
        public readOnlyTransaction(storeNames?: DOMStringList): IReadOnlyTransaction;
        /**
        * Begin read write transaction
        * @param {string} storeName Object store name.
        * @returns {IReadWriteTransaction} Read write transaction.
        */
        public readWriteTransaction(storeName?: string): IReadWriteTransaction;
        /**
        * Begin read write transaction
        * @param {string[]} storeNames List of object store name.
        * @returns {IReadWriteTransaction} Read write transaction.
        */
        public readWriteTransaction(storeNames?: string[]): IReadWriteTransaction;
        /**
        * Begin read write transaction
        * @param {DOMStringList} storeNames List of object store name.
        * @returns {IReadWriteTransaction} Read write transaction.
        */
        public readWriteTransaction(storeNames?: DOMStringList): IReadWriteTransaction;
    }
    /**
    * open DB request
    */
    interface IOpenDBRequest {
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
    interface IMigration {
        next(): void;
    }
    /**
    * transaction
    */
    interface _ITransactionBase<Transaction> {
        source: Database;
        target: IDBTransaction;
        oncomplete: Function;
        onerror: Function;
        onabort: Function;
        results: {
            [id: number]: any;
        };
        requests: any[];
        onComplete(complete: Function): Transaction;
        onError(error: Function): Transaction;
        onAbort(abort: Function): Transaction;
        grouping(requests?: IRequestBase[]): IRequestGroup;
        _requestCallback(req: IRequestBase, result: any): void;
        abort(): void;
    }
    interface ITransactionBase extends _ITransactionBase<ITransactionBase> {
    }
    interface _IReadOnlyTransaction<Transaction> extends _ITransactionBase<Transaction> {
        getByKey(storeName: string, key: any): IRequest;
        getByIndex(storeName: string, indexName: string, key: any): IRequest;
        findByKey(storeName: string, range: any, direction: string): IRequestWithCursor;
        findByIndex(storeName: string, indexName: string, range: any, direction: string): IRequestWithCursor;
    }
    interface IReadOnlyTransaction extends _IReadOnlyTransaction<IReadOnlyTransaction> {
    }
    /**
    * Read/Write transaction
    */
    interface _IReadWriteTransaction<ReadWriteTransaction> extends _IReadOnlyTransaction<ReadWriteTransaction> {
        add(storeName: string, value: any, key?: any): IRequest;
        put(storeName: string, value: any, key?: any): IRequest;
        deleteByKey(storeName: string, key: any): IRequest;
    }
    interface IReadWriteTransaction extends _IReadWriteTransaction<IReadWriteTransaction> {
    }
    /**
    * Version change transaction
    */
    interface _IVersionChangeTransaction<VersionChangeTransaction> extends _IReadWriteTransaction<VersionChangeTransaction> {
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
    interface IVersionChangeTransaction extends _IVersionChangeTransaction<IVersionChangeTransaction> {
    }
    /**
    * requests
    */
    interface IRequestBase {
        id: number;
        source: ITransactionBase;
        target: {
            error: any;
        };
    }
    interface _IRequest<Req> extends IRequestBase {
        target: IDBRequest;
        onSuccess(onsuccess: (result: any, event: Event) => any): Req;
        onError(onerror: (error: DOMError, event: Event) => any): Req;
    }
    interface IRequest extends _IRequest<IRequest> {
    }
    interface _IRequestWithCursor<Req> extends _IRequest<Req> {
        continueFlag: boolean;
        stopCursor(): void;
        values: any[];
        onstopiteration: (results: any[]) => void;
        onStopIteration(func: (results: any[]) => void): Req;
        onSuccess(onsuccess: (result: any, event: Event) => any): Req;
    }
    interface IRequestWithCursor extends _IRequestWithCursor<IRequestWithCursor> {
    }
    interface IRequestGroup extends IRequestBase {
        add(request: IRequestBase): void;
        remove(request: IRequestBase): void;
        joinAll(): void;
        onComplete(complete: (results: {
            [id: number]: any;
        }, errors?: {
            [id: number]: DOMError;
        }) => void): IRequestGroup;
    }
}
