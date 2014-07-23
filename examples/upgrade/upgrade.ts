/// <reference path="../../src/jaid.ts" />
/// <reference path="../../d.ts/jquery/jquery.d.ts" />
/// <reference path="../../d.ts/bootstrap/bootstrap.d.ts" />
"use strict";

interface Schema {
    schema: Jaid.IObjectStore[];
    history?: Jaid.IMigrationHistory;
    created?: (transaction: Jaid.IVersionChangeTransaction, event: IDBVersionChangeEvent) => void;
}
interface SchemaTable {
    [version: string]: Schema;
}

var upgradeHistoryFunc2 = function(transaction: Jaid.IVersionChangeTransaction, migration: Jaid.IMigration){
    console.log('migration 2');
    $('#alerts').append($('<div class="alert alert-success">').text('Migrate to ver.2'));
    var join1 = transaction.grouping();
    var join3 = transaction.grouping();
    var join10 = transaction.grouping();
    var nestedJoin = transaction.grouping([join1, join3, join10]);
    join1.onComplete((results: any)=>{
        var req = transaction.findByKey('store2_2', null, 'next').onStopIteration((values: any) => {
            console.log(values);
        });
        nestedJoin.add(req);
        console.log(nestedJoin);
        nestedJoin.joinAll();
    });
    nestedJoin.onComplete((results: any)=>{
        console.log(results);
        console.log('migration 2 completed.');
        migration.next();
    });
    for(var i=0; i<10000; i++){
        var result = transaction.add('store2_2', {message: 'hogeeeeeeeeeeeeeeeee', updated: new Date()});
        result.onError((error: DOMError, event: Event)=>{});
        join1.add(result);
        if(i%3 == 0){
            join3.add(result);
        }
        if(i%10 == 0){
            join10.add(result);
        }
    }
    join1.joinAll();
    join3.joinAll();
    join10.joinAll();
    //transaction.put('store1', {message: 'set version2', updated: new Date()});
};
var upgradeHistoryFunc3000 = function(transaction: Jaid.IVersionChangeTransaction, migration: Jaid.IMigration){
    console.log('migration 3000');
    /*
    transaction.findByKey('store2_2', null, 'next').onStopIteration((values: any) => {
        console.log(values);
    });
    */
    $('#alerts').append($('<div class="alert alert-success">').text('Migrate to ver.3000'));
    migration.next();
    //transaction.put('store1', {message: 'set version3', updated: new Date()});
};

var createdFunc1 = function(transaction: Jaid.IVersionChangeTransaction) {
    $('#alerts').append($('<div class="alert alert-success">').text('Create database on ver.1'));
    transaction.put('store1', {message: 'create DB version1'});
};
var createdFunc2 = function(transaction: Jaid.IVersionChangeTransaction) {
    $('#alerts').append($('<div class="alert alert-success">').text('Create database on ver.2'));
    transaction.put('store1', {message: 'create DB version2'});
};
var createdFunc3 = function(transaction: Jaid.IVersionChangeTransaction) {
    $('#alerts').append($('<div class="alert alert-success">').text('Create database on ver.3000'));
    transaction.put('store1', {message: 'create DB version3000'});
};

var schemaTable: SchemaTable = {};
schemaTable[1] = {
    schema: [
        {
            name: 'store1',
            autoIncrement: true,
            indexes: [
                {name: 'index1_1', keyPath: 'foo'}
            ]
        }
    ],
    history: {},
    created: createdFunc1
};
schemaTable[2] = {
    schema: [
        {
            name: 'store1',
            autoIncrement: true,
            indexes: [
                {name: 'index1_1', keyPath: 'foo'},
                {name: 'index1_2', keyPath: 'bar', created: 2}
            ]
        },
        {
            name: 'store2',
            autoIncrement: true,
            indexes: [
                {name: 'index2_1', keyPath: 'egg'},
                {name: 'index2_2', keyPath: 'spam'}
            ],
            created: 2
        },
        {
            name: 'store2_2',
            autoIncrement: true,
            indexes: [
                {name: 'index2_1', keyPath: 'egg'},
                {name: 'index2_2', keyPath: 'spam'}
            ],
            created: 2
        }
    ],
    history: {
        2: upgradeHistoryFunc2
    },
    created: createdFunc2
};
schemaTable[3000] = {
    schema: [
         {
            name: 'store1',
            autoIncrement: true,
            indexes: [
                {name: 'index1_1', keyPath: 'foo'},
                {name: 'index1_2', keyPath: 'bar', created: 2, dropped: 3000},
                {name: 'index1_3', keyPath: 'baz', created: 3000}
            ]
        },
        {
            name: 'store2',
            autoIncrement: true,
            indexes: [
                {name: 'index2_1', keyPath: 'egg', dropped: 3000},
                {name: 'index2_2', keyPath: 'spam'},
                {name: 'index2_3', keyPath: 'spamspamspam', created: 3000}
            ],
            created: 2
        },
        {
            name: 'store2_2',
            autoIncrement: true,
            indexes: [
                {name: 'index2_1', keyPath: 'egg'},
                {name: 'index2_2', keyPath: 'spam'}
            ],
            created: 2,
            dropped: 3000
        },
        {
            name: 'store3',
            autoIncrement: true,
            indexes: [
                {name: 'index3_1', keyPath: 'hoge'}
            ],
            created: 3000
        }
    ],
    history: {
        2: upgradeHistoryFunc2,
        3000: upgradeHistoryFunc3000
    },
    created: createdFunc3
};
schemaTable["1 (with ver.3000's schema)"] = {
    schema: schemaTable[3000].schema,
    history: schemaTable[3000].history,
    created: createdFunc1
};
schemaTable["2 (with ver.3000's schema)"] = {
    schema: schemaTable[3000].schema,
    history: schemaTable[3000].history,
    created: createdFunc2
};
schemaTable["1 (with ver.2's schema)"] = {
    schema: schemaTable[2].schema,
    history: schemaTable[2].history,
    created: createdFunc1
};

function checkVersion(db: Jaid.Database): void{
    $('#dbVersion').text(db.version);

    var $showSchema = $('#showSchema').empty();
    var objectStoreNames = db.target.objectStoreNames;
    var OSLength = objectStoreNames.length;
    for(var i=0; i<OSLength; i++){
        var storeName: string = objectStoreNames[i];
        var li = $('<li>').text(storeName);

        var transaction = db.readOnlyTransaction(objectStoreNames);

        var req = transaction.findByKey('store1', null, 'next');

        transaction.onComplete(function (result: any){
            //console.log(result);
        });

        $showSchema.append(li);
    }
}

function execute(version: number, schema: Schema): void {
    $('#alerts').empty();
    var db: Jaid.Database = new Jaid.Database('upgradeTest', version, schema.schema, schema.history);
    var opener = db.open().onSuccess(function(){
            checkVersion(db);
            db.close();
        }).onError(function(err: DOMError, event: Event){
            var alert = $('<div class="alert alert-danger">');
            alert.append($('<p class="lead">').text(err.name));
            alert.append($('<p>').text(err.message));
            $('#alerts').append(alert);
        });
    if (schema.created){
        opener.onCreated(schema.created);
    }
}

function reset() {
    new Jaid.Database('upgradeTest').delete();
    $('#alerts').empty();
    $('#dbVersion').empty();
    $('#showSchema').empty();
}

$(document).ready(function(){
    var $versions = $('#versions');
    Object.keys(schemaTable).forEach((ver: string) => {
        $versions.append($('<option>').attr('val', ver).text(ver));
    });
    $versions.on('change', function(){
        var ver: number = $versions.val();
        $('#schemaPreview').text(JSON.stringify(schemaTable[ver].schema, null, '  '));
        var historyText: string = '';
        if(schemaTable[ver].history){
            historyText += '{\n';
            Object.keys(schemaTable[ver].history).map((key: string) => {return parseInt(key)})
                .sort().forEach(function(version: number){
                    historyText += '  ' + version + ': ' + schemaTable[ver].history[version].toString() + ',\n';
                });
            historyText += '}';
        }
        $('#historyPreview').text(historyText);
        $('#onCreatedPreview').text(schemaTable[ver].created.toString());
    }).trigger('change');

    $('.setVersionForm').on('submit', function(event){
        var ver: string = $versions.val();
        execute(parseInt(ver), schemaTable[ver]);

        event.preventDefault();
        return false;
    });
    $('.deleteDBForm').on('submit', function(){
        reset();
        event.preventDefault();
    });
});
