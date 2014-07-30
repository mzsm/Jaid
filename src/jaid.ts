/**
 * Jaid - Jane Indexed Database library
 *
 * @version 0.0.1a
 * @author mzsm j@mzsm.me
 * @license The MIT License
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

/**
 * Jaid module
 */
module Jaid {

    /*
     * interfaces
     */

    /**
     * Parameters of Index
     */
    export interface IIndexParams {
        /**
         * Name of Index <br>
         *     インデックス名
         */
        name?: string;
        /**
         * Property name of Index <br>
         *     インデックスを張るkeyPath
         */
        keyPath: any;
        /**
         * Unique constraint <br>
         *     ユニーク制約
         */
        unique?: boolean;
        multiEntry?: boolean;
        /**
         * インデックスが作成されたDBバージョン(マイグレーション時に使用)
         */
        created?: number;
        /**
         * インデックスが削除されたDBバージョン(マイグレーション時に使用)
         */
        dropped?: number;
    }

    /**
     * Parameters of object store
     */
    export interface IObjectStoreParams {
        /**
         * Name of object store <br>
         *     オブジェクトストア名
         */
        name: string;
        /**
         * Property name (or those list) of Primary key <br>
         *     主キーとして扱うプロパティ名(またはその配列)
         */
        keyPath?: any;
        /**
         * Use auto increment in primary key <br>
         *     主キーの自動採番を使用するかどうか
         */
        autoIncrement?: boolean;
        /**
         * オブジェクトストアに含まれるインデックスの配列
         */
        indexes?: IIndexParams[];
        /**
         * オブジェクトストアが作成されたDBバージョン(マイグレーション時に使用)
         */
        created?: number;
        /**
         * オブジェクトストアが削除されたDBバージョン(マイグレーション時に使用)
         */
        dropped?: number;
    }

    export interface ICustomMigration {
        /**
         * マイグレーション機能で、過去から現在に向けて改変履歴をたどっていく中で、
         * オブジェクトストアやインデックスを各バージョンにおける状態に変更した段階で実行する操作
         */
        [version: number]: (transaction: IVersionChangeTransaction, migration: IMigration) => void;
    }

    export interface IDatabaseParams {
        /**
         * Name of database <br>
         *     データベース名
         */
        name?: string;
        /**
         * Version number <br>
         *     バージョン番号
         */
        version?: number;
        /**
         * List of object stores <br>
         *     オブジェクトストアの配列
         */
        objectStores?: IObjectStoreParams[];
        /**
         * History of migration <br>
         *     マイグレーション履歴
         */
        customMigration?: ICustomMigration
    }

    /**
     * Database Class <br>
     *     Jaidを使用する上で基幹となるクラス<br>
     *     データベースとの接続や、トランザクションの開始はこのクラスから呼び出す
     */
    export class Database{
        target: IDBDatabase;
        name: string;
        version: number = 1;
        objectStores: IObjectStoreParams[] = [];
        customMigration: ICustomMigration = {};

        /**
         * constructor with multi parameters <br>
         * データベース名、バージョン、オブジェクトストア、マイグレーション履歴を別々に指定します
         * @class Database
         * @constructor
         * @param name Name of Database <br>
         *     データベース名
         * @param version Version number <br>
         *     バージョン番号
         * @param objectStores List of object stores <br>
         *     オブジェクトストアの配列
         * @param customMigration Custom migration operation in each version <br>
         *     各バージョン時点におけるマイグレーション操作
         */
        constructor(name?: string, version?: number, objectStores?: IObjectStoreParams[], customMigration?: ICustomMigration);
        /**
         * constructor with single parameter <br>
         *     データベース名、バージョン、オブジェクトストア、マイグレーション履歴を単一のオブジェクト内で指定します
         * @class Database
         * @constructor
         * @param param Dictionary of name, version, objectStores list and migrationHistory <br>
         *     データベース名、バージョン、オブジェクトストア、マイグレーション履歴を含むオブジェクト
         */
        constructor(param?: IDatabaseParams);
        constructor(param?: any, version?: number, objectStores?: IObjectStoreParams[], customMigration?: ICustomMigration){
            if(typeof param === "string"){
                this.name = param;
                this.version = version || this.version;
                this.objectStores = objectStores || this.objectStores;
                this.customMigration = customMigration || this.customMigration;
            }else if(typeof param === "object" && !!param){
                this.name = param.name || this.name;
                this.version = param.version || this.version;
                this.objectStores = param.objectStores || this.objectStores;
                this.customMigration = param.customMigration || this.customMigration;
            }
        }

        /**
         * Open database <br>
         *     データベースとの接続を開きます
         * @returns IOpenDBRequest
         */
        open(): IOpenDBRequest{
            if(this.target){
                throw Error("This database was already opened.");
            }
            return new OpenDBRequest(this, indexedDB.open(this.name, this.version));
        }

        /**
         * Close database <br>
         *     データベースとの接続を閉じます
         * @returns void
         */
        close(): void{
            if(!this.target){
                throw Error("This database is not yes opened.");
            }
            this.target.close();
            this.target = null;
        }

        /**
         * Delete database <br>
         *     データベースを削除します
         */
        delete(): void{
            indexedDB.deleteDatabase(this.name);
        }

        /**
         * データベースにデータを保存します<br>
         *     主キーが重複している場合はエラーになります
         * @param storeName オブジェクトストア名
         * @param value 保存するデータ
         * @param key 主キー
         * @returns {IRequest}
         */
        insert(storeName: string, value: any, key?: any): IRequest {
            var transaction = this.readWriteTransaction(storeName);
            return <IRequest>transaction.add(storeName, value, key);
        }

        /**
         * データベースにデータを保存します<br>
         *     主キーが重複している場合は置き換えられます
         * @param storeName オブジェクトストア名
         * @param value 保存するデータ
         * @param key 主キー
         * @returns {IRequest}
         */
        save(storeName: string, value: any, key?: any): IRequest {
            var transaction = this.readWriteTransaction(storeName);
            return <IRequest>transaction.put(storeName, value, key);
        }

        /**
         * Begin read only transaction <br>
         *     読み取り専用トランザクションを開始します (単一オブジェクトストア)
         * @param storeName object store name <br>
         *     オブジェクトストア名
         * @returns IReadOnlyTransaction Read only transaction.
         */
        readOnlyTransaction(storeName?: string): IReadOnlyTransaction;
        /**
         * Begin read only transaction <br>
         *     読み取り専用トランザクションを開始します (複数オブジェクトストア)
         * @param storeNames List of object store name <br>
         *     オブジェクトストア名の配列
         * @returns IReadOnlyTransaction Read only transaction.
         */
        readOnlyTransaction(storeNames?: string[]): IReadOnlyTransaction;
        /**
         * Begin read only transaction <br>
         *     読み取り専用トランザクションを開始します (複数オブジェクトストア)
         * @param storeNames List of object store name <br>
         *     オブジェクトストア名の配列
         * @returns IReadOnlyTransaction Read only transaction.
         */
        readOnlyTransaction(storeNames?: DOMStringList): IReadOnlyTransaction;
        readOnlyTransaction(storeNames?: any): IReadOnlyTransaction{
            return new ReadOnlyTransaction<IReadOnlyTransaction>(this, storeNames);
        }

        /**
         * Begin read write transaction <br>
         *     読み取り/書き込み可能トランザクションを開始します (単一オブジェクトストア)
         * @param storeName Object store name <br>
         *     オブジェクトストア名
         * @returns IReadWriteTransaction Read write transaction.
         */
        readWriteTransaction(storeName?: string): IReadWriteTransaction;
        /**
         * Begin read write transaction <br>
         *     読み取り/書き込み可能トランザクションを開始します (複数オブジェクトストア)
         * @param storeNames List of object store name <br>
         *     オブジェクトストア名の配列
         * @returns IReadWriteTransaction Read write transaction.
         */
        readWriteTransaction(storeNames?: string[]): IReadWriteTransaction;
        /**
         * Begin read write transaction <br>
         *     読み取り/書き込み可能トランザクションを開始します (複数オブジェクトストア)
         * @param storeNames List of object store name <br>
         *     オブジェクトストア名の配列
         * @returns IReadWriteTransaction Read write transaction.
         */
        readWriteTransaction(storeNames?: DOMStringList): IReadWriteTransaction;
        readWriteTransaction(storeNames?: any): IReadWriteTransaction{
            return new ReadWriteTransaction<IReadWriteTransaction>(this, storeNames);
        }
    }

    /**
     * open DB request
     */
    export interface IOpenDBRequest{
        /**
         * 対象のデータベース接続リクエストオブジェクト
         */
        target: IDBOpenDBRequest;

        onSuccess(callback: (event: Event) => void): IOpenDBRequest;
        onError(callback: (error: DOMError, event: Event) => void): IOpenDBRequest;
        onBlocked(callback: (event: Event) => void): IOpenDBRequest;
        onCreated(callback: (transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent) => void): IOpenDBRequest;
    }

    class OpenDBRequest implements IOpenDBRequest{
        target: IDBOpenDBRequest;
        source: Database;
        private onsuccess: (event: Event) => void;
        private onerror: (error: DOMError, event: Event) => void;
        private onblocked: (event: Event) => void;
        oncreated: (transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent) => void;
        private migrationManager: MigrationManager;

        constructor(db: Database, opener: IDBOpenDBRequest){
            this.source = db;
            this.target = opener;
            this.migrationManager = new MigrationManager(this, this.source.objectStores, this.source.customMigration);

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
        onSuccess(callback: (event: Event) => void): OpenDBRequest{
            this.onsuccess = callback;
            return this;
        }
        onError(callback: (error: DOMError, event: Event) => void): OpenDBRequest{
            this.onerror = callback;
            return this;
        }
        onBlocked(callback: (event: Event) => void): OpenDBRequest{
            this.onblocked = callback;
            return this;
        }
        onCreated(callback: (transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent) => void): OpenDBRequest{
            this.oncreated = callback;
            return this;
        }
    }

    export interface IMigration{
        /**
         * 現在のバージョンにおけるマイグレーションを完了し、次のバージョンへのマイグレーションに移行します
         *
         * ※このメソッドを呼び出した後にデータの操作を行うとデータの不整合が発生する恐れがあります
         */
        next(): void;
    }

    class Migration implements IMigration{
        private source: MigrationManager;
        private continued: boolean = false;
        private executed: boolean = false;
        version: number;
        createdObjectStores: IObjectStoreParams[] = [];
        createdIndexes: {storeName: string; index: IIndexParams}[] = [];
        droppedObjectStores: IObjectStoreParams[] = [];
        droppedIndexes: {storeName: string; index: IIndexParams}[] = [];
        customOperation: (transaction: IVersionChangeTransaction, migration: IMigration) => void;

        constructor(manager: MigrationManager, version: number){
            this.source = manager;
            this.version = version;
        }

        /**
         * 現在のバージョンにおけるマイグレーションを完了し、次のバージョンへのマイグレーションに移行します
         *
         * ※このメソッドを呼び出した後にデータの操作を行うとデータの不整合が発生する恐れがあります
         */
        next(): void{
            if(this.continued){
                console.error("Already called.");
                return;
            }
            this.continued = true;
            this.source.next();
        }
        execute(transaction: IVersionChangeTransaction): void{
            if(this.executed){
                console.error("Already called.");
                return;
            }
            this.createdObjectStores.forEach((val: IObjectStoreParams) => {
                transaction.createObjectStore(val, this.version);
            });
            this.createdIndexes.forEach((val: {storeName: string; index: IIndexParams}) => {
                transaction.createIndex(val.storeName, val.index);
            });
            // Remove deprecated objectStore and Index.
            this.droppedObjectStores.forEach((val: IObjectStoreParams) => {
                transaction.dropObjectStore(val.name);
            });
            this.createdIndexes.forEach((val: {storeName: string; index: IIndexParams}) => {
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
        private source: OpenDBRequest;
        private versions: {[version: number]: Migration} = {};
        private versionNumbers: number[] = [];
        private objectStores: IObjectStoreParams[];
        private transaction: IVersionChangeTransaction;

        constructor(source: IOpenDBRequest, objectStores: IObjectStoreParams[], customMigration: ICustomMigration){
            this.source = <OpenDBRequest>source;
            this.objectStores = objectStores;
            this.objectStores.forEach((objectStore: IObjectStoreParams) => {
                objectStore = MigrationManager.checkObjectStore(objectStore);
                if(objectStore.created) {
                    var obj = this.get(objectStore.created);
                    obj.createdObjectStores.push(objectStore);
                }
                if(objectStore.dropped){
                    var obj = this.get(objectStore.dropped);
                    obj.droppedObjectStores.push(objectStore);
                }
                objectStore.indexes.forEach((index: IIndexParams) => {
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
            Object.keys(customMigration).forEach((versionStr: string) => {
                var versionInt = parseInt(versionStr);
                var obj = this.get(versionInt);
                obj.customOperation = customMigration[versionInt];
            });
        }
        private static checkObjectStore(objectStore: IObjectStoreParams): IObjectStoreParams{
            if(objectStore.created && objectStore.dropped && objectStore.created >= objectStore.dropped){
                throw Error(objectStore.name + ': "dropped" is MUST be greater than "created"');
            }
            objectStore.indexes = objectStore.indexes || [];
            return objectStore
        }
        private static checkIndex(index: IIndexParams, objectStore: IObjectStoreParams): IIndexParams{
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
            this.objectStores.forEach((params: IObjectStoreParams) => {
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
        /**
         * トランザクションを呼び出したデータベース
         */
        source: Database;
        /**
         * 実行中のトランザクション
         */
        target: IDBTransaction;
        results: {[id: number]: any};

        /**
         * トランザクションが完了された時に実行されるコールバック関数を指定します
         * @param complete
         */
        onComplete(callback: (results: any) => any): Transaction;
        /**
         * トランザクションが失敗した時に実行されるコールバック関数を指定します
         * @param error
         */
        onError(callback: Function): Transaction;
        /**
         * トランザクションを強制終了したときに実行されるコールバック関数を指定します
         * @param abort
         */
        onAbort(callback: Function): Transaction;
        /**
         * 複数のリクエストが完了するのを待つ
         * @param requests
         */
        grouping(requests?: IRequestBase[]): IRequestGroup;
        /**
         * @private
         * トランザクション内の個々のリクエストが完了するたびに呼び出されるコールバック
         *
         * @param req
         * @param result
         */
        _requestCallback(req: IRequestBase, result: any): void;
        /**
         * このトランザクションの実行を強制終了します <br>
         * @returns void
         */
        abort(): void;
        /**
         * このトランザクションの実行を強制終了します <br>
         *     abortのエイリアスです
         * @see abort()
         */
        rollback(): void;
    }
    export interface ITransactionBase extends _ITransactionBase<ITransactionBase> {}
    class TransactionBase<T> implements _ITransactionBase<T> {
        /**
         * トランザクションを呼び出したデータベース
         */
        source: Database;
        /**
         * 実行中のトランザクション
         */
        target: IDBTransaction;
        _oncomplete: (results: any) => any = function (results: any){};
        _onerror: Function = function(){};
        _onabort: Function = function(){};
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
                this._oncomplete(this.results);
            };
            this.target.onerror = () => {
                this._onerror();
            };
            this.target.onabort = () => {
                this._onabort();
            };
        }
        _registerRequest(request: IRequest): T{
            request.id = this.requestCounter++;
            request.source = <ITransactionBase><any>this;
            this.requests.push(request);
            return <T><any>this;
        }
        onComplete(callback: (results: any) => any): T{
            this._oncomplete = callback;
            return <T><any>this;
        }
        onError(callback: Function): T{
            this._onerror = callback;
            return <T><any>this;
        }
        onAbort(callback: Function): T{
            this._onabort = callback;
            return <T><any>this;
        }
        abort(): void{
            this.target.abort();
        }
        rollback(): void{
            this.abort();
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
    /**
     * Read only transaction
     *
     * 読み取り専用トランザクション
     */
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
            this._registerRequest(<IRequest>req);
            return req;
        }
        findByIndex(storeName: string, indexName:string, range: any, direction: string): IRequestWithCursor{
            var objectStore: IDBObjectStore = this.target.objectStore(storeName);
            var index: IDBIndex = objectStore.index(indexName);
            var req = <IRequestWithCursor><any>new RequestWithCursor(index.openCursor(range, direction));
            this._registerRequest(<IRequest>req);
            return req;
        }
    }

    /**
     * Read/Write transaction
     *
     * 読み取り/書き込み可能トランザクション
     */
    export interface _IReadWriteTransaction<ReadWriteTransaction> extends _IReadOnlyTransaction<ReadWriteTransaction> {
        /**
         * オブジェクトストアにデータを保存します<br>
         *     主キーが重複している場合はエラーになります
         * @param storeName オブジェクトストア名
         * @param value 保存するデータ
         * @param key 主キー<br>
         *     オブジェクトストアがin-value-keyの場合は指定不要
         */
        add(storeName: string, value: any, key?: any): IRequest;
        /**
         * オブジェクトストアにデータを保存します<br>
         *     キーが重複している場合は置き換えられます
         * @param storeName オブジェクトストア名
         * @param value 保存するデータ
         * @param key 主キー<br>
         *     オブジェクトストアがin-value-keyの場合は指定不要
         */
        put(storeName: string, value: any, key?: any): IRequest;
        deleteByKey(storeName: string, key: any): IRequest;
    }
    /**
     * Read/Write transaction
     *
     * 読み取り/書き込み可能トランザクション
     */
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
        /**
         * オブジェクトストアの作成
         * @param objectStore オブジェクトストアのパラメータ
         * @param indexVersion どのバージョン時点でのインデックス構造を作成するか<br>
         *     (例えばバージョン2を指定したとき、createdパラメータに3が指定されているインデックスは作成されない)
         */
        createObjectStore(objectStore: IObjectStoreParams, indexVersion?: number): IDBObjectStore;
        /**
         * インデックスの作成
         * @param objectStore インデックスを作成するオブジェクトストア名
         * @param index インデックスのパラメータ
         */
        createIndex(objectStore: string, index: IIndexParams): IDBIndex;
        /**
         * インデックスの作成
         * @param objectStore インデックスを作成するオブジェクトストアのパラメータ
         * @param index インデックスのパラメータ
         */
        createIndex(objectStore: IObjectStoreParams, index: IIndexParams): IDBIndex;
        /**
         * インデックスの作成
         * @param objectStore インデックスを作成するオブジェクトストア
         * @param index インデックスのパラメータ
         */
        createIndex(objectStore: IDBObjectStore, index: IIndexParams): IDBIndex;
        /**
         * オブジェクトストアの削除
         * @param objectStore 削除するオブジェクトストア名
         */
        dropObjectStore(objectStore: string): void;
        /**
         * オブジェクトストアの削除
         * @param objectStore 削除するオブジェクトストアのパラメータ
         */
        dropObjectStore(objectStore: IObjectStoreParams): void;
        /**
         * オブジェクトストアの削除
         * @param objectStore 削除するオブジェクトストア
         */
        dropObjectStore(objectStore: IDBObjectStore): void;
        /**
         * インデックスの削除
         * @param objectStore インデックスを削除するオブジェクトストアの名前
         * @param index 削除するインデックスのパラメータ
         */
        dropIndex(objectStore: string, index: IIndexParams): void;
        /**
         * インデックスの削除
         * @param objectStore インデックスを削除するオブジェクトストアのパラメータ
         * @param index 削除するインデックスのパラメータ
         */
        dropIndex(objectStore: IObjectStoreParams, index: IIndexParams): void;
        /**
         * インデックスの削除
         * @param objectStore インデックスを削除するオブジェクトストア
         * @param index 削除するインデックスのパラメータ
         */
        dropIndex(objectStore: IDBObjectStore, index: IIndexParams): void;
        /**
         * インデックスの削除
         * @param objectStore インデックスを削除するオブジェクトストアの名前
         * @param index 削除するインデックスの名前
         */
        dropIndex(objectStore: string, index: string): void;
        /**
         * インデックスの削除
         * @param objectStore インデックスを削除するオブジェクトストアのパラメータ
         * @param index 削除するインデックスの名前
         */
        dropIndex(objectStore: IObjectStoreParams, index: string): void;
        /**
         * インデックスの削除
         * @param objectStore インデックスを削除するオブジェクトストア
         * @param index 削除するインデックスの名前
         */
        dropIndex(objectStore: IDBObjectStore, index: string): void;
        /**
         * インデックスの削除
         * @param objectStore インデックスを削除するオブジェクトストアの名前
         * @param index 削除するインデックス
         */
        dropIndex(objectStore: string, index: IDBIndex): void;
        /**
         * インデックスの削除
         * @param objectStore インデックスを削除するオブジェクトストアのパラメータ
         * @param index 削除するインデックス
         */
        dropIndex(objectStore: IObjectStoreParams, index: IDBIndex): void;
        /**
         * インデックスの削除
         * @param objectStore インデックスを削除するオブジェクトストア
         * @param index 削除するインデックス
         */
        dropIndex(objectStore: IDBObjectStore, index: IDBIndex): void;
        /**
         * バージョン変更トランザクションでは実行できません
         * @returns void
         */
        abort(): void;
        /**
         * バージョン変更トランザクションでは実行できません <br>
         *     abortのエイリアスです
         * @see abort()
         */
        rollback(): void;
    }
    export interface IVersionChangeTransaction extends _IVersionChangeTransaction<IVersionChangeTransaction> {}
    /**
     * バージョン変更トランザクション
     *
     * ※このクラスは自動的に作成されるユーザーによって作成されることを意図していません
     * @private
     */
    class VersionChangeTransaction<T> extends ReadWriteTransaction<T>{
        constructor(db: Database, transaction: IDBTransaction){
            super(db, transaction);
        }

        createObjectStore(objectStore: IObjectStoreParams, indexVersion?: number): IDBObjectStore{
            var idbObjectStore: IDBObjectStore = this.source.target.createObjectStore(objectStore.name, {keyPath: objectStore.keyPath, autoIncrement: objectStore.autoIncrement||false});
            //create indexes.
            if(typeof indexVersion === 'number'){
                objectStore.indexes.forEach((index: IIndexParams) => {
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
        createIndex(objectStore: string, index: IIndexParams): IDBIndex;
        createIndex(objectStore: IObjectStoreParams, index: IIndexParams): IDBIndex;
        createIndex(objectStore: IDBObjectStore, index: IIndexParams): IDBIndex;
        createIndex(objectStore: any, index: IIndexParams): IDBIndex{
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
        dropObjectStore(objectStore: IObjectStoreParams): void;
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
        dropIndex(objectStore: string, index: IIndexParams): void;
        dropIndex(objectStore: IObjectStoreParams, index: IIndexParams): void;
        dropIndex(objectStore: IDBObjectStore, index: IIndexParams): void;
        dropIndex(objectStore: string, index: string): void;
        dropIndex(objectStore: IObjectStoreParams, index: string): void;
        dropIndex(objectStore: IDBObjectStore, index: string): void;
        dropIndex(objectStore: string, index: IDBIndex): void;
        dropIndex(objectStore: IObjectStoreParams, index: IDBIndex): void;
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
        onComplete(callback: Function): T{
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
        /**
         * トランザクション内で実行したリクエストの通し番号
         */
        id: number;
        /**
         * リクエストを実行したトランザクション
         */
        source: ITransactionBase;
        target: {error: any};
    }

    export interface _IRequest<Req> extends IRequestBase{
        /**
         * 実際に実行したリクエスト
         */
        target: IDBRequest;

        /**
         * リクエストが完了したときのコールバック関数を設定する
         * @param callback リクエストが完了したときに実行するコールバック関数
         */
        onSuccess(callback: (result: any, event: Event) => any): Req;
        /**
         * リクエストが失敗したときのコールバック関数を設定する
         * @param callback リクエストが失敗したときに実行するコールバック関数
         */
        onError(callback: (error: DOMError, event: Event) => any): Req;
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
            });
        }
        onSuccess(callback: (result: any, event: Event) => any): T{
            this.target.onsuccess = (event: Event) => {
                var result = <any>(<IDBRequest>event.target).result;
                this.source._requestCallback(<IRequest><any>this, result);
                callback(result, event);
            };
            return <T><any>this;
        }
        onError(callback: (error: DOMError, event: Event) => any): T{
            this.target.onerror = (event: Event) => {
                var error = <DOMError>(<IDBRequest>event.target).error;
                this.source._requestCallback(<IRequest><any>this, error);
                callback(error, event);
            };
            return <T><any>this;
        }
    }

    export interface _IRequestWithCursor<Req> extends _IRequest<Req>{
        /**
         * カーソルの走査を終了します
         */
        stopCursor(): void;
        values: any[];
        /**
         * カーソルを最後まで走査し終えた、あるいは途中で走査を打ち切ったあとに実行するコールバック関数を指定する
         * @param callback 走査終了後に実行するコールバック関数
         */
        onStopIteration(callback: (results: any[]) => void): Req;
        /**
         * 1件ごとのリクエストが完了したときのコールバック関数を設定する
         * @param callback 1件ごとのリクエストが完了したときに実行するコールバック関数
         */
        onSuccess(callback: (result: any, event: Event) => any): Req;
    }
    export interface IRequestWithCursor extends _IRequestWithCursor<IRequestWithCursor> {}
    class RequestWithCursor<T> extends Request<T> implements _IRequestWithCursor<T>{
        private continueFlag: boolean = true;
        private onstopiteration: (results: any[], completed:boolean) => void;
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
                this.onstopiteration(this.values, this.continueFlag);
            }
        }
        onStopIteration(callback: (results: any[]) => void): T{
            this.onstopiteration = (results: any) => {
                callback(results);
                this.source.results[this.id] = event.target;
            };
            return <T><any>this;
        }
        onSuccess(callback: (result: any, event: Event) => any): T{
            this.target.onsuccess = (event: Event) => {
                var result = <IDBCursorWithValue>(<IDBRequest>event.target).result;
                if(result){
                    callback(result, event);
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
        onComplete(callback: (results: {[id: number]: any}, errors?: {[id: number]: DOMError}) => void): IRequestGroup;
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
        private onsuccess: (result: any, request: IRequestBase) => any = function(){};
        private oncomplete: (results?: {[id: number]: any}, errors?: {[id: number]: DOMError}) => any =
            function(results?: {[id: number]: any}, errors?: {[id: number]: DOMError}){};
        private _oncomplete (): void{
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
        onSuccess(callback: (result: any, request: IRequestBase) => void): RequestGroup{
            this.onsuccess = callback;
            return this;
        }
        onComplete(callback: (results: {[id: number]: any}, errors?: {[id: number]: DOMError}) => void): RequestGroup{
            this.oncomplete = callback;
            return this;
        }
    }
}
