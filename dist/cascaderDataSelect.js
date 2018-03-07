(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'jquery'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, require('jquery'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, global.jQuery);
    global.cascaderDataSelect = mod.exports;
  }
})(this, function (module, _jquery) {
  'use strict';

  var _jquery2 = _interopRequireDefault(_jquery);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var CascaderDataSelect =
  // filtedNodes = [];
  function CascaderDataSelect(element, options) {
    _classCallCheck(this, CascaderDataSelect);

    this.config = _jquery2.default.extend({
      treedata: [] // 树菜单数据
    }, options);
    // 必要结构性元素
    this.$element = (0, _jquery2.default)(element);
    console.log(this.$element, options);
  };

  function CascaderDataSelect(elements, options) {
    var instanceArr = [];
    (0, _jquery2.default)(elements).each(function () {
      var instance = (0, _jquery2.default)(this).data('treeDataSelect_instance');
      if (!instance) {
        instance = new CascaderDataSelect(this, options);
        (0, _jquery2.default)(this).data('treeDataSelect_instance', instance);
      }
      instanceArr.push(instance);
    });
    var result = instanceArr.length === 1 ? instanceArr[0] : instanceArr;
    return result;
  }
  _jquery2.default.fn.CascaderDataSelect = function (options) {
    var instanceArr = CascaderDataSelect(this, options);
    return instanceArr;
  };
  module.exports = CascaderDataSelect;
});