/// <reference path="../../src/jaid.ts" />
/// <reference path="../../d.ts/jquery/jquery.d.ts" />
/// <reference path="../../d.ts/bootstrap/bootstrap.d.ts" />
"use strict";

interface Schema {
    schema: Jaid.ObjectStoreParams[];
    history?: Jaid.MigrationHistory;
    created?: (transaction: Jaid.VersionChangeTransaction, event: IDBVersionChangeEvent) => void;
}
interface SchemaTable {
    [version: string]: Schema;
}

var upgradeHistoryFunc2 = function(transaction: Jaid.VersionChangeTransaction){
    $('#alerts').append($('<div class="alert alert-success">').text('Migrate to ver.2'));
    transaction.put('store1', {message: 'set version2', updated: new Date()});
};
var upgradeHistoryFunc3000 = function(transaction: Jaid.VersionChangeTransaction){
    $('#alerts').append($('<div class="alert alert-success">').text('Migrate to ver.3000'));
    transaction.put('store1', {message: 'set version3', updated: new Date()});
};

var createdFunc1 = function(transaction: Jaid.VersionChangeTransaction) {
    $('#alerts').append($('<div class="alert alert-success">').text('Create database on ver.1'));
    transaction.put('store1', {message: 'create DB version1'});
};
var createdFunc2 = function(transaction: Jaid.VersionChangeTransaction) {
    $('#alerts').append($('<div class="alert alert-success">').text('Create database on ver.2'));
    transaction.put('store1', {message: 'create DB version3'});
};
var createdFunc3 = function(transaction: Jaid.VersionChangeTransaction) {
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
                {name: 'index1_2', keyPath: 'bar', created: 2, removed: 3000},
                {name: 'index1_3', keyPath: 'baz', created: 3000}
            ]
        },
        {
            name: 'store2',
            autoIncrement: true,
            indexes: [
                {name: 'index2_1', keyPath: 'egg', removed: 3000},
                {name: 'index2_2', keyPath: 'spam'},
                {name: 'index2_3', keyPath: 'spamspamspam', created: 3000}
            ],
            created: 2
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
        3: upgradeHistoryFunc3000
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
    var objectStoreNames = db.connection.db.objectStoreNames;
    var OSLength = objectStoreNames.length;
    for(var i=0; i<OSLength; i++){
        var storeName: string = objectStoreNames[i];
        var li = $('<li>').text(storeName);

        $showSchema.append(li);
    }
}

function execute(version: number, schema: Schema): void {
    $('#alerts').empty();
    var db: Jaid.Database = new Jaid.Database('upgradeTest', version, schema.schema)
        .open().onSuccess(function(){
            checkVersion(db);
            db.connection.close();
        }).onError(function(err: DOMError, event: Event){
            var alert = $('<div class="alert alert-danger">');
            alert.append($('<p class="lead">').text(err.name));
            alert.append($('<p>').text(err.message));
            $('#alerts').append(alert);
        });
    if (schema.history){
        db.onMigration(schema.history);
    }
    if (schema.created){
        db.onCreated(schema.created);
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
