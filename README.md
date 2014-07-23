Jaid
====

Jane Indexed Database library

How to use
----------

    var db = Jaid.Database({
      name: 'library',
      version: 1,
      objectStores: [
        {
          name: 'books',
          keyPath: 'isbn',
          autoIncrement: false,
          indexes: [
            {name: 'title', keyPath: 'title'},
            {name: 'publisher', keyPath: 'publisher'},
            {name: 'author', keyPath: 'authors', multiEntry: true}
          ]
        }
      ]
    });
    db.onSuccess(function(){
      var transaction = db.readWriteTransaction('books');
      transaction.put(
        'books',
        {
          title: 'TypeScript Reference',
          publisher: 'Impress Japan',
          isbn: '9784844335887',
          authors: ['WAKAME Masahiro']
        }
      );
    });


TypeScript compile settings
---------------------------

intelliJ IDEA, File Watcher arguments:

    --sourcemap $FileName$ --target ES5