/**
 * Jaid - Jane Indexed Database library
 *
 * @version 0.0.1a
 * @author mzsm j@mzsm.me
 * @license <a href="http://www.opensource.org/licenses/mit-license.php">The MIT License</a>
 */
//var indexedDB = window.indexedDB;

module Jaid {
    export module Interfaces {
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
            [key: string]: IndexParams
        }
    }

    export class Database {
        name: string;
        version: number;
        objectStores: Interfaces.ObjectStores = {};
        onsuccess: Function = function(){};
        onerror: Function = function(){};
        onversionchange: Function = (event: IDBVersionChangeEvent) => {};
        upgradeHistory: {[version: number]: Function} = {};

        constructor(name?: string, version?: number, objectStores?: Interfaces.ObjectStores){
            this.name = name || this.name;
            this.version = version || this.version;
            this.objectStores = objectStores || this.objectStores;
        }
        open(): Database{
            var opener: IDBOpenDBRequest = indexedDB.open(this.name, this.version);
            opener.onsuccess = (event: Event) => {
                var db = <IDBDatabase>(<IDBOpenDBRequest>event.target).result;
                var con = new Connection(db);
                this.onsuccess(con);
            };
            opener.onerror = (event: Event) => {
                this.onerror(event);
            };
            opener.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                var db = <IDBDatabase>(<IDBOpenDBRequest>event.target).result;
                Object.keys(this.upgradeHistory).map((v) =>{return parseInt(v)}).sort().forEach((v: any) => {
                    this.upgradeHistory[v](db);
                });

                this.onversionchange(event);
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
        history(upgradeHistory: {[version: number]: Function}): Database{
            this.upgradeHistory = upgradeHistory;
            return this;
        }
    }

    /**
     * object store.
     */
    export class ObjectStore {
        name: string;
        keyPath: string;
        autoIncrement: boolean = false;
        indexes: Interfaces.Indexes = {};

        constructor(name?: string, options?: {keyPath?: string; autoIncrement?: boolean}, indexes?: Interfaces.Indexes){
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

        select(objectStores: any) {

        }
        save(objectStores: any) {

        }
    }

    /**
     * transaction
     */
    export class Transaction {

        constructor(){

        }
    }
}
