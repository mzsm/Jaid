/// <reference path="../../src/jaid.ts" />
/// <reference path="../../d.ts/jquery/jquery.d.ts" />
/// <reference path="../../d.ts/bootstrap/bootstrap.d.ts" />
//indexedDB.deleteDatabase('memopad');

interface MemoData {
    title?: string;
    body?: string;
    tags?: string[];
    createdAt?: string;
    modifiedAt?: string;
}

//IndexedDBの構造を定義
var db = new Jaid.Database({
    name: 'memopad',
    version: 1,
    objectStores: [
        {
            name: 'memo',
            autoIncrement: true,
            indexes: [
                {name: 'title', keyPath: 'title', unique: true},
                {name: 'tags', keyPath: 'tags', multiEntry: true},
                {name: 'createdAt', keyPath: 'createdAt'},
                {name: 'modifiedAt', keyPath: 'modifiedAt'}
            ]
        }
    ]
});

function reloadAllData(){
    $('#modalBody').text('Loading...');
    $('#modal').modal({backdrop: false, keyboard: false});
    var transaction = db.connection.readOnlyTransaction('memo');

    $('#memoNames').empty();
    var req = transaction.findByIndex('memo', 'createdAt', null, 'prev');
    req.onSuccess(function (result: IDBCursorWithValue){
        var data = <MemoData>result.value;
        var pk = result.primaryKey;

        var title = data.title;
        if(title.length > 15){
            title = data.title.slice(0, 15) + '…';
        }
        var body = data.body;
        if(body.length > 15){
            body = data.body.slice(0, 15) + '…';
        }
        $('#memoNames').append(
            $('<a href="#" class="list-group-item showonmousewrapper">')
                .append($('<button class="deleteMemo btn pull-right btn-xs showonmouse"><span class="glyphicon glyphicon-remove"></span></button>'))
                .append($('<h4 class="list-group-item-heading">').text(title))
                .append($('<p class="list-group-item-text">').text(body))
                .append($('<div>').text(data.tags.join(' ')))
                .append($('<div>').text(data.createdAt))
                .data('id', pk)
        );
    });

    transaction.onComplete(function(){
        $('#modal').modal('hide');
    }).onError(function(){
        $('#modal').modal('hide');
    });
}

function deleteData(id: number) {
    var transaction = db.connection.readWriteTransaction('memo');

    transaction.deleteByKey('memo', id);

    transaction.onComplete(function(){
        reloadAllData();
    });
}


$(document).ready(function(){
    $('#modal').modal({backdrop: false, keyboard: false});
    db.open()
        .onSuccess(function(){
            reloadAllData();
            //$('#modal').modal('hide');
        })
        .onError(function(error: DOMError, event: Event){
            $('#modalBody').empty()
                .append($('<p class="lead">').text(error.name))
                .append($('<p>').text(error.message));
        });

    $('#inputForm').on('submit', function(event){
        var id: number;
        var data: MemoData = {};
        $(this).serializeArray().forEach(function(val: {name:string; value:string}){
            switch(val.name){
                case 'id':
                    id = parseInt(val.value);
                    break;
                case 'title':
                    data.title = val.value;
                    break;
                case 'body':
                    data.body = val.value;
                    break;
                case 'tags':
                    var _tags = val.value.replace(',', ' ').split(' ');
                    _tags.filter(function(){return (this.length > 0)});
                    data.tags = _tags;
            }
        });
        data.modifiedAt = new Date().toISOString();
        if(!id){
            data.createdAt = data.modifiedAt;
        }

        var transaction = db.connection.readWriteTransaction('memo');
        var req: Jaid.IRequest = transaction.put('memo', data, id);
        req.onSuccess(function(result: any, event: Event){
            $('#memoId').val(result);
        });
        req.onError(function(error: DOMError, event: Event){
            $('#modalBody').empty()
                .append($('<p class="lead">').text(error.name))
                .append($('<p>').text(error.message));
            $('#modal').modal({backdrop: true, keyboard: true});
        });
        transaction.onComplete(function(event: Event){
            reloadAllData();
        });
        event.preventDefault();
        return false;
    }).on('reset', function(){
        $('#memoId').val('');
    });

    $('#memoNames')
        .on('click', 'a', function(event: JQueryEventObject){
            //console.log('click a');
            //console.log($(this).closest('.list-group-item').data('id'));
            event.preventDefault();
        })
        .on('click', '.deleteMemo', function(event: JQueryEventObject){
            deleteData(parseInt($(this).closest('.list-group-item').data('id')));
            event.preventDefault();
            event.stopPropagation();
        });
});
