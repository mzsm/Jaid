/// <reference path="../../src/jaid.ts" />
/// <reference path="../../d.ts/jquery/jquery.d.ts" />
/// <reference path="../../d.ts/bootstrap/bootstrap.d.ts" />

interface MemoData {
    title?: string;
    body?: string;
    tags?: string[];
}

var schemaTable = {
    1: {
        store1 : {
            autoIncrement: true,
            indexes: {
                index1_1: {keyPath: 'foo'}
            }
        }
    },
    2: {
        store1 : {
            autoIncrement: true,
            indexes: {
                index1_1: {keyPath: 'foo'},
                index1_2: {keyPath: 'bar', since: 2}
            }
        },
        store2 : {
            autoIncrement: true,
            indexes: {
                index2_1: {keyPath: 'egg'},
                index2_2: {keyPath: 'spam'}
            },
            since: 2
        }
    },
    3000: {
        store1 : {
            autoIncrement: true,
            indexes: {
                index1_1: {keyPath: 'foo'},
                index1_2: {keyPath: 'bar', since: 2},
                index1_3: {keyPath: 'baz', since: 3000}
            }
        },
        store2 : {
            autoIncrement: true,
            indexes: {
                index2_1: {keyPath: 'egg'},
                index2_2: {keyPath: 'spam'},
                index2_3: {keyPath: 'spamspamspam', since: 3000}
            },
            since: 2
        },
        store3 : {
            autoIncrement: true,
            indexes: {
                index3_1: {keyPath: 'hoge'}
            },
            since: 3000
        }
    }
};

function execute(version: number, schema: any) {
    var db = new Jaid.Database('upgradeTest', version, schema)
        .open();
}

function reset() {
    indexedDB.deleteDatabase('upgradeTest');
}

$(document).ready(function(){
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

        console.log(id, data);
        dbcon.save('memo', data, id);

        event.preventDefault();
        return false;
    });
});
