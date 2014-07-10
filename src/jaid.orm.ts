/**
 * Jaid ORM - Jane Indexed Database library, O-R mapper
 *
 * @version 0.0.1a
 * @author mzsm j@mzsm.me
 * @license <a href="http://www.opensource.org/licenses/mit-license.php">The MIT License</a>
 */
/// <reference path="./jaid.ts" />

module Jaid {
    export module ORM {
        class Model extends Jaid.ObjectStore {
            data: any;
        }
    }
}
