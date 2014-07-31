/// <reference path="../../src/jaid.ts" />
/// <reference path="../../d.ts/jquery/jquery.d.ts" />
/// <reference path="../../d.ts/bootstrap/bootstrap.d.ts" />
//indexedDB.deleteDatabase('aozora');

interface MemoData {
    title?: string;
    body?: string;
    tags?: string[];
    createdAt?: Date;
    modifiedAt?: Date;
}

//IndexedDBの構造を定義
var db = new Jaid.Database({
    name: 'aozora',
    version: 1,
    objectStores: [
        {
            name: 'book',
            keyPath: 'id',
            autoIncrement: false,
            indexes: [
                {keyPath: 'title'},
                {keyPath: 'kana'},
                {keyPath: 'kana_sort'},
                {keyPath: 'authors', multiEntry: true},
                {keyPath: 'translators', multiEntry: true},
            ]
        },
        {
            name: 'author',
            keyPath: 'id',
            autoIncrement: false,
            indexes: [
                {keyPath: 'name'},
                {keyPath: 'kana'},
                {keyPath: 'kana_sort'},
                {keyPath: 'works', multiEntry: true},
                {keyPath: 'translations', multiEntry: true},
            ]
        }
    ]
});

function initialize(){
    function load(){
        var transaction = db.readOnlyTransaction('book');
        var cursor = transaction.findByIndex('book', 'kana_sort', IDBKeyRange.bound('や', 'よ', true, true), 'next');
        cursor.onStopIteration((data) => {
            console.log(data);
        })
    }

    if(!localStorage.getItem('dataLoadedAt')){
        $.ajax({
            url: './aozora.json',
            type: 'GET',
            dataType: 'json'
        }).done(function(data){
            console.log(data);

            var transaction = db.readWriteTransaction(['book', 'author']);
            transaction.put_all('author', data.authors);
            transaction.put_all('book', data.catalog);
            transaction.onComplete(function(){
                localStorage.setItem('dataLoadedAt', new Date().getTime().toString());
                load();
            })
        }).fail(function(){

        });
    }else{
        load();
    }
}

$(document).ready(function(){
    $('#modal').modal({backdrop: false, keyboard: false});
    db.open()
        .onSuccess(function(){
            initialize();
            //$('#modal').modal('hide');
        })
        .onError(function(error: DOMError, event: Event){
            $('#modalBody').empty()
                .append($('<p class="lead">').text(error.name))
                .append($('<p>').text(error.message));
        });

    $('#inputForm').on('submit', function(event){
        event.preventDefault();
        return false;
    }).on('reset', function(){
        $('#memoId').val('');
    });

});
