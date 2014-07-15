/// <reference path="../../src/jaid.ts" />
/// <reference path="../../d.ts/jquery/jquery.d.ts" />
/// <reference path="../../d.ts/bootstrap/bootstrap.d.ts" />
//indexedDB.deleteDatabase('memopad');

//IndexedDBの構造を定義
var db = new Jaid.Database({
    name: 'memopad',
    version: 1,
    objectStores: [
        {
            name: 'memo',
            autoIncrement: true,
            indexes: [
                { name: 'title', keyPath: 'title', unique: true },
                { name: 'tags', keyPath: 'tags', multiEntry: true },
                { name: 'createdAt', keyPath: 'createdAt' },
                { name: 'modifiedAt', keyPath: 'modifiedAt' }
            ]
        }
    ]
});

function reloadAllData() {
    $('#modalBody').text('Loading...');
    $('#modal').modal({ backdrop: false, keyboard: false });
    var transaction = db.connection.readOnlyTransaction('memo');

    $('#memoNames').empty();
    var req = transaction.findByIndex('memo', 'createdAt', null, 'prev');
    req.onSuccess(function (result) {
        var data = result.value;
        var pk = result.primaryKey;

        var title = data.title;
        if (title.length > 15) {
            title = data.title.slice(0, 15) + '…';
        }
        var body = data.body;
        if (body.length > 15) {
            body = data.body.slice(0, 15) + '…';
        }
        $('#memoNames').append($('<a href="#" class="list-group-item">').append($('<h4 class="list-group-item-heading">').text(title)).append($('<p class="list-group-item-text">').text(body)).append($('<div>').text(data.tags.join(' '))).append($('<div>').text(data.createdAt)).data('id', pk));
    });

    transaction.onComplete(function () {
        $('#modal').modal('hide');
    }).onError(function () {
        $('#modal').modal('hide');
    });
}

$(document).ready(function () {
    $('#modal').modal({ backdrop: false, keyboard: false });
    db.open().onSuccess(function () {
        reloadAllData();
        //$('#modal').modal('hide');
    }).onError(function (error, event) {
        $('#modalBody').empty().append($('<p class="lead">').text(error.name)).append($('<p>').text(error.message));
    });

    $('#inputForm').on('submit', function (event) {
        var id;
        var data = {};
        $(this).serializeArray().forEach(function (val) {
            switch (val.name) {
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
                    _tags.filter(function () {
                        return (this.length > 0);
                    });
                    data.tags = _tags;
            }
        });
        data.modifiedAt = new Date().toISOString();
        if (!id) {
            data.createdAt = data.modifiedAt;
        }

        console.log(data);
        var transaction = db.connection.readWriteTransaction('memo');
        var req = transaction.put('memo', data, id);
        req.onSuccess(function (result, event) {
            $('#memoId').val(result);
        });
        transaction.onComplete(function (event) {
            reloadAllData();
        });
        event.preventDefault();
        return false;
    });
});
//# sourceMappingURL=memopad.js.map
