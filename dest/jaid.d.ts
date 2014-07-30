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
/**
* Jaid module
*/
declare module Jaid {
    /**
    * Parameters of Index
    */
    interface IIndexParams {
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
    interface IObjectStoreParams {
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
    interface ICustomMigration {
        /**
        * マイグレーション機能で、過去から現在に向けて改変履歴をたどっていく中で、
        * オブジェクトストアやインデックスを各バージョンにおける状態に変更した段階で実行する操作
        */
        [version: number]: (transaction: IVersionChangeTransaction, migration: IMigration) => void;
    }
    interface IDatabaseParams {
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
        customMigration?: ICustomMigration;
    }
    /**
    * Database Class <br>
    *     Jaidを使用する上で基幹となるクラス<br>
    *     データベースとの接続や、トランザクションの開始はこのクラスから呼び出す
    */
    class Database {
        public target: IDBDatabase;
        public name: string;
        public version: number;
        public objectStores: IObjectStoreParams[];
        public customMigration: ICustomMigration;
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
        /**
        * Open database <br>
        *     データベースとの接続を開きます
        * @returns IOpenDBRequest
        */
        public open(): IOpenDBRequest;
        /**
        * Close database <br>
        *     データベースとの接続を閉じます
        * @returns void
        */
        public close(): void;
        /**
        * Delete database <br>
        *     データベースを削除します
        */
        public delete(): void;
        /**
        * データベースにデータを保存します<br>
        *     主キーが重複している場合はエラーになります
        * @param storeName オブジェクトストア名
        * @param value 保存するデータ
        * @param key 主キー
        * @returns {IRequest}
        */
        public insert(storeName: string, value: any, key?: any): IRequest;
        /**
        * データベースにデータを保存します<br>
        *     主キーが重複している場合は置き換えられます
        * @param storeName オブジェクトストア名
        * @param value 保存するデータ
        * @param key 主キー
        * @returns {IRequest}
        */
        public save(storeName: string, value: any, key?: any): IRequest;
        /**
        * Begin read only transaction <br>
        *     読み取り専用トランザクションを開始します (単一オブジェクトストア)
        * @param storeName object store name <br>
        *     オブジェクトストア名
        * @returns IReadOnlyTransaction Read only transaction.
        */
        public readOnlyTransaction(storeName?: string): IReadOnlyTransaction;
        /**
        * Begin read only transaction <br>
        *     読み取り専用トランザクションを開始します (複数オブジェクトストア)
        * @param storeNames List of object store name <br>
        *     オブジェクトストア名の配列
        * @returns IReadOnlyTransaction Read only transaction.
        */
        public readOnlyTransaction(storeNames?: string[]): IReadOnlyTransaction;
        /**
        * Begin read only transaction <br>
        *     読み取り専用トランザクションを開始します (複数オブジェクトストア)
        * @param storeNames List of object store name <br>
        *     オブジェクトストア名の配列
        * @returns IReadOnlyTransaction Read only transaction.
        */
        public readOnlyTransaction(storeNames?: DOMStringList): IReadOnlyTransaction;
        /**
        * Begin read write transaction <br>
        *     読み取り/書き込み可能トランザクションを開始します (単一オブジェクトストア)
        * @param storeName Object store name <br>
        *     オブジェクトストア名
        * @returns IReadWriteTransaction Read write transaction.
        */
        public readWriteTransaction(storeName?: string): IReadWriteTransaction;
        /**
        * Begin read write transaction <br>
        *     読み取り/書き込み可能トランザクションを開始します (複数オブジェクトストア)
        * @param storeNames List of object store name <br>
        *     オブジェクトストア名の配列
        * @returns IReadWriteTransaction Read write transaction.
        */
        public readWriteTransaction(storeNames?: string[]): IReadWriteTransaction;
        /**
        * Begin read write transaction <br>
        *     読み取り/書き込み可能トランザクションを開始します (複数オブジェクトストア)
        * @param storeNames List of object store name <br>
        *     オブジェクトストア名の配列
        * @returns IReadWriteTransaction Read write transaction.
        */
        public readWriteTransaction(storeNames?: DOMStringList): IReadWriteTransaction;
    }
    /**
    * open DB request
    */
    interface IOpenDBRequest {
        /**
        * 対象のデータベース接続リクエストオブジェクト
        */
        target: IDBOpenDBRequest;
        onSuccess(callback: (event: Event) => void): IOpenDBRequest;
        onError(callback: (error: DOMError, event: Event) => void): IOpenDBRequest;
        onBlocked(callback: (event: Event) => void): IOpenDBRequest;
        onCreated(callback: (transaction: IVersionChangeTransaction, event: IDBVersionChangeEvent) => void): IOpenDBRequest;
    }
    interface IMigration {
        /**
        * 現在のバージョンにおけるマイグレーションを完了し、次のバージョンへのマイグレーションに移行します
        *
        * ※このメソッドを呼び出した後にデータの操作を行うとデータの不整合が発生する恐れがあります
        */
        next(): void;
    }
    /**
    * transaction
    */
    interface _ITransactionBase<Transaction> {
        /**
        * トランザクションを呼び出したデータベース
        */
        source: Database;
        /**
        * 実行中のトランザクション
        */
        target: IDBTransaction;
        results: {
            [id: number]: any;
        };
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
    interface ITransactionBase extends _ITransactionBase<ITransactionBase> {
    }
    interface _IReadOnlyTransaction<Transaction> extends _ITransactionBase<Transaction> {
        getByKey(storeName: string, key: any): IRequest;
        getByIndex(storeName: string, indexName: string, key: any): IRequest;
        findByKey(storeName: string, range: any, direction: string): IRequestWithCursor;
        findByIndex(storeName: string, indexName: string, range: any, direction: string): IRequestWithCursor;
    }
    /**
    * Read only transaction
    *
    * 読み取り専用トランザクション
    */
    interface IReadOnlyTransaction extends _IReadOnlyTransaction<IReadOnlyTransaction> {
    }
    /**
    * Read/Write transaction
    *
    * 読み取り/書き込み可能トランザクション
    */
    interface _IReadWriteTransaction<ReadWriteTransaction> extends _IReadOnlyTransaction<ReadWriteTransaction> {
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
    interface IReadWriteTransaction extends _IReadWriteTransaction<IReadWriteTransaction> {
    }
    /**
    * Version change transaction
    */
    interface _IVersionChangeTransaction<VersionChangeTransaction> extends _IReadWriteTransaction<VersionChangeTransaction> {
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
    interface IVersionChangeTransaction extends _IVersionChangeTransaction<IVersionChangeTransaction> {
    }
    /**
    * requests
    */
    interface IRequestBase {
        /**
        * トランザクション内で実行したリクエストの通し番号
        */
        id: number;
        /**
        * リクエストを実行したトランザクション
        */
        source: ITransactionBase;
        target: {
            error: any;
        };
    }
    interface _IRequest<Req> extends IRequestBase {
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
    interface IRequest extends _IRequest<IRequest> {
    }
    interface _IRequestWithCursor<Req> extends _IRequest<Req> {
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
    interface IRequestWithCursor extends _IRequestWithCursor<IRequestWithCursor> {
    }
    interface IRequestGroup extends IRequestBase {
        add(request: IRequestBase): void;
        remove(request: IRequestBase): void;
        joinAll(): void;
        onComplete(callback: (results: {
            [id: number]: any;
        }, errors?: {
            [id: number]: DOMError;
        }) => void): IRequestGroup;
    }
}
