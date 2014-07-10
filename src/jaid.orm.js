/**
* Jaid ORM - Jane Indexed Database library, O-R mapper
*
* @version 0.0.1a
* @author mzsm j@mzsm.me
* @license <a href="http://www.opensource.org/licenses/mit-license.php">The MIT License</a>
*/
/// <reference path="./jaid.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Jaid;
(function (Jaid) {
    (function (ORM) {
        var Model = (function (_super) {
            __extends(Model, _super);
            function Model() {
                _super.apply(this, arguments);
            }
            return Model;
        })(Jaid.ObjectStore);
    })(Jaid.ORM || (Jaid.ORM = {}));
    var ORM = Jaid.ORM;
})(Jaid || (Jaid = {}));
//# sourceMappingURL=jaid.orm.js.map
