import $ from 'jquery';
class CascaderDataSelect {
  // filtedNodes = [];
  constructor(element, options) {
    this.config = $.extend({
      treedata: [], // 树菜单数据
    }, options);
    // 必要结构性元素
    this.$element = $(element);
    console.log(this.$element, options)
  }
}
function CascaderDataSelect(elements, options) {
  const instanceArr = [];
  $(elements).each(function() {
    let instance = $(this).data('treeDataSelect_instance');
    if (!instance) {
      instance = new CascaderDataSelect(this, options);
      $(this).data('treeDataSelect_instance', instance);
    }
    instanceArr.push(instance);
  });
  const result = instanceArr.length === 1 ? instanceArr[0] : instanceArr;
  return result;
}
$.fn.CascaderDataSelect = function(options) {
  const instanceArr = CascaderDataSelect(this, options);
  return instanceArr;
}
module.exports = CascaderDataSelect;

