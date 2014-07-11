/// <reference path="../src/jaid.ts" />

/*
module SampleA {
    class Foo extends Jaid.Database {
        name = 'foo';
        version = 3;
        objectStores: Jaid.Interfaces.ObjectStores = {
            "books": new Books(),
            "authors": new Authors()
        };
    }

    class Books extends Jaid.ObjectStore {
        name = 'books';
        keyPath = 'isbn';
    }

    class Authors extends Jaid.ObjectStore {
        name = 'authors';
        keyPath = 'id';
        autoIncrement = true;
        indexes: Jaid.Interfaces.Indexes = {
            birthday: new BirthdayIndex()
        };
    }

    class BirthdayIndex extends Jaid.Index {
        name = 'birthday';
        keyPath = 'birthday';
    }
}
*/

module SampleB {
    var database = new Jaid.Database(
        'hoge',
        10,
        {
            books: {
                keyPath: 'isbn',
                indexes: {
                    published_at: {keyPath:'published_at'},
                    author: {keyPath:'author_id', since: 3}
                }
            },
            authors: {
                autoIncrement: true,
                indexes: {
                    firstName: {keyPath:'firstName'},
                    familyName: {keyPath:'familyName'},
                    alterNames: {keyPath:'alterNames', multiEntry: true},
                    birthday: {keyPath:'birthday', since:5}
                },
                since: 3
            }
        }
    ).history({
        2: function(db: IDBDatabase){
        },
        3: function(db: IDBDatabase){
        }
    }).error(function(){

    }).success(function(){

    }).versionchange(function(){

    }).open();

}

/*
module SampleC {
    class AIObjectStore extends Jaid.ObjectStore {
        keyPath = 'id';
        autoIncrement = true;
    }

    var db = new Jaid.Database(
        'sampleC', 3,
        {
            artists: new AIObjectStore('artists'),
            albums: new AIObjectStore('albums'),
            tracks: new AIObjectStore('tracks')
        }
    )
}
*/