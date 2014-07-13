/// <reference path="../../src/jaid.ts" />
/// <reference path="../../d.ts/jquery/jquery.d.ts" />
/// <reference path="../../d.ts/bootstrap/bootstrap.d.ts" />
indexedDB.deleteDatabase('memopad');

//IndexedDBの構造を定義
var db = new Jaid.Database({
    name: 'memopad',
    version: 1,
    objectStores: [
        {
            name: 'memo',
            autoIncrement: true,
            indexes: [
                { name: 'tags', keyPath: 'tags', multiEntry: true },
                { name: 'createdAt', keyPath: 'createdAt', since: 2 },
                { name: 'modifiedAt', keyPath: 'modifiedAt', since: 2 }
            ]
        }
    ]
});

var dbcon;

$(document).ready(function () {
    $('#modal').modal({ backdrop: false, keyboard: false });
    db.open().success(function (con) {
        dbcon = con;
        $('#modal').modal('hide');
    }).error(function (error, event) {
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

        console.log(id, data);
        dbcon.save('memo', data, id);

        event.preventDefault();
        return false;
    });
});
//# sourceMappingURL=memopad.js.map
