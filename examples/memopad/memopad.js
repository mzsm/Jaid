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
    var transaction = db.readOnlyTransaction('memo');

    $('#memoNames').empty();
    var req = transaction.findByIndex('memo', 'createdAt', null, 'prev');
    req.onSuccess(function (result) {
        var data = result.value;
        var pk = result.primaryKey;

        var title = data.title;

        /*
        if(title.length > 15){
        title = data.title.slice(0, 15) + '…';
        }
        */
        var body = data.body || '';
        if (body.length > 15) {
            body = data.body.slice(0, 15) + '…';
        }
        $('#memoNames').append($('<a href="#" class="list-group-item showonmousewrapper">').append($('<button type="button" class="deleteMemo btn pull-right btn-xs showonmouse"><span class="glyphicon glyphicon-remove"></span></button>')).append($('<h4 class="list-group-item-heading">').text(title)).append($('<p class="list-group-item-text">').text(body)).append($('<div>').text('Tags: ' + (data.tags || ['']).join(' '))).append($('<div>').text('Created at:' + data.createdAt.toLocaleString())).data('id', pk));
    });

    transaction.onComplete(function () {
        $('#modal').modal('hide');
    }).onError(function () {
        $('#modal').modal('hide');
    });
}

function deleteData(id) {
    var transaction = db.readWriteTransaction('memo');

    transaction.deleteByKey('memo', id);

    transaction.onComplete(function () {
        reloadAllData();
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
        $('#alerts').empty();

        var id;
        var data = {};
        $(this).serializeArray().forEach(function (val) {
            if (val.value.length == 0) {
                return;
            }
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

        data.modifiedAt = new Date();
        if (!id) {
            data.createdAt = data.modifiedAt;
        }

        if (!data.title || data.title.length == 0) {
            if (!id) {
                data.title = 'no title - ' + new Date().toLocaleString();
            } else {
                var alert = $('<div class="alert alert-warning">').append($('<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span></button>')).append($('<p>').text('Please input title'));
                $('#alerts').append(alert);
                event.preventDefault();
                return;
            }
        }

        var transaction = db.readWriteTransaction('memo');
        var req = transaction.put('memo', data, id);
        req.onSuccess(function (result, event) {
            $('#memoId').val(result);
        });
        req.onError(function (error, event) {
            var alert = $('<div class="alert alert-danger">').append($('<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span></button>')).append($('<p class="lead">').text(error.name)).append($('<p>').text(error.message));
            $('#alerts').append(alert);
        });
        transaction.onComplete(function (event) {
            reloadAllData();
        });
        event.preventDefault();
        return false;
    }).on('reset', function () {
        $('#memoId').val('');
    });

    $('#memoNames').on('click', 'a', function (event) {
        //console.log('click a');
        //console.log($(this).closest('.list-group-item').data('id'));
        event.preventDefault();
    }).on('click', '.deleteMemo', function (event) {
        deleteData(parseInt($(this).closest('.list-group-item').data('id')));
        event.preventDefault();
        event.stopPropagation();
    });
});
//# sourceMappingURL=memopad.js.map
