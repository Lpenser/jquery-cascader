import $ from 'jquery';
import 'ztree';

class TreeDataSelectGenerator {
  filtedNodes = [];

  constructor(element, options) {
    this.config = $.extend({
      treedata: [], // 树菜单数据
      onTreeClick: $.noop, // 树节点点击回调
      afterTreeClick: $.noop, // 树节点点击后回调
      onSearch: $.noop,
      onSearchReset: $.noop,
      treeSearch: true, // 是否开启搜索功能
      searchResultHideSiblings: true, // 搜索结果是否隐藏命中节点的无关兄弟节点
      ztreeSetting: [],
      actionBtn: [],
      searchBarActionBtn: [],

      // 初始化触发元素为 input 时，生成为点击文本框触发下拉菜单
      showTextTemplate: (treeNode) => treeNode.name, // 显示文本格式
      valueTemplate: (treeNode) => treeNode.id, // input 值格式，生成后该元素会隐藏
      autoDropdownWidth: false,
      dropdownWidth: 250, // 下拉宽度，默认样式内设置 250px
      dropdownHeight: 350, // 下拉树高度
      dropdownSpeed: 100, // 下拉动画时间
      clickTreeHideDropdown: true, // 点击树菜单选项后是否收起下拉
      resetTreeAfterClick: true, // 点击树菜单选项后是否重置树结构，为 true 可让下拉每次都弹出原始状态的树，为 false 则每次弹出都会保持上次操作后的状态，包括选中项、筛选项。
      beforeShowDropdown: $.noop,
      afterShowDropdown: $.noop,
      beforeHideDropdown: $.noop,
      afterHideDropdown: $.noop,
      disabled: false,
      appendTo: null,
    }, options);

    // 必要结构性元素
    this.$element = $(element);
    this.$dropdownContainer = $('<div class="tree-wrap" />');
    this.treeSelectedNodes = [];
    this.needSelectedNodeBtns = [];

    // 存储用户自定义的 onTreeClick
    const _onTreeClick = this.config.onTreeClick;

    // 初始化整体结构
    if (element.tagName === 'INPUT') {
      // 初始化触发元素为 input ，生成树结构外框，点击 element 触发下拉展开树菜单

      const _this = this;

      this.$value = this.$element;
      // $trigger 用于点击监听点击下拉
      // this.$trigger = this.$value.clone();
      // 直接 clone 保留原有属性可能会和一些使用特殊属性作为判断依据的功能冲突，
      // 修改为接受固定属性 class ，若有其他必要属性则在下方继续添加
      this.$trigger = $('<input />', {
        type: this.$value.attr('type'),
        class: this.$value.attr('class'),
        style: this.$value.attr('style'),
        placeholder: this.$value.attr('placeholder'),
        readonly: true,
      });

      this.$trigger
        .addClass('tree-trigger')
        // .removeAttr('id name')
        .insertAfter(this.$element);

      // 隐藏原始 input 元素
      this.$value.addClass('tree-trigger-origin');

      // 处理 input 配合 cleanInput 效果清除内容时同时清除 trigger 内内容
      this.$value.on('change', function() {
        if (this.value === '') {
          _this.$trigger.val('');
        }
      });

      // this.$element 重新定义为树菜单容器
      this.$element = $('<ul class="ztree" />');
      this.$element.attr('id', this.$value[0].id || `ztree-${Math.random().toString().substr(2, 4)}`);
      this.$treeBody = $('<div class="tree-body" />').css('max-height', this.config.dropdownHeight);
      this.$dropdownContainer
        .addClass('tree-wrap-fixed')
        .append(this.$treeBody.append(this.$element))
        .hide();

      // 配置下拉元素宽度
      if (this.config.autoDropdownWidth) {
        this.$dropdownContainer.width(this.$trigger.outerWidth());
      } else {
        this.$dropdownContainer.width(this.config.dropdownWidth);
      }

      // 默认下拉元素插入至 $trigger 元素之后
      // 也可以通过设置 appendTo 参数重新设置需要插入的位置
      const $appendTo = $(this.config.appendTo);
      if ($appendTo.length) {
        this.$dropdownContainer.appendTo($appendTo);
        const offset = this.$trigger.offset();
        this.$dropdownContainer.css({
          left: offset.left,
          top: offset.top + this.$trigger.outerHeight(),
        });
      } else {
        this.$dropdownContainer.insertAfter(this.$trigger);
      }

      // 用于点击树后填充展示元素和原始触发元素的值
      this.config.onTreeClick = (treeNode, clickFlag) => {
        if (!treeNode) {
          return false;
        }

        // 执行原始从 config 传入的 onTreeClick 并取返回值
        const preventClick = _onTreeClick.call(this, treeNode, clickFlag);

        this.treeSelectedNodes = this.treeObj.getSelectedNodes();

        this._updateActionBtnStatus();

        // 如果传入的原始 onTreeClick 返回 false ，则不执行数据填充操作
        if (preventClick !== false) {
          const { showTextTemplate, valueTemplate, clickTreeHideDropdown, resetTreeAfterClick } = this.config;

          // 设置触发元素显示值
          this.$trigger.val(showTextTemplate.call(this, treeNode));

          // 设置原始隐藏文本框值
          this.$value.val(valueTemplate.call(this, treeNode)).change();

          // 点击树节点后是否隐藏下拉展开树
          clickTreeHideDropdown && this.hideDropdown();

          // 点击树节点后是否重置树结构
          resetTreeAfterClick && this._initTree();
        }

        this.config.afterTreeClick && this.config.afterTreeClick.call(this, treeNode);
      };

      // 监听点击下拉，初始化树结构
      this._initTreeExpand();
    } else {
      // 初始化触发元素不为 input ，则常规生成树型结构于其内部
      this.$element.addClass('ztree');
      this.$dropdownContainer.insertAfter(this.$element).append(
        $('<div class="tree-body" />').append(this.$element)
      );

      // 用于点击树后填充展示元素和原始触发元素的值
      this.config.onTreeClick = (treeNode, clickFlag) => {
        if (!treeNode) {
          return false;
        }

        this.treeSelectedNodes = this.treeObj.getSelectedNodes();

        _onTreeClick.call(this, treeNode, clickFlag);

        this._updateActionBtnStatus();
      };

      // 初始化树结构
      this._initTree();
    }

    // 初始化树搜索相关功能
    this.config.treeSearch && this._initSearch();

    // 初始化树操作按钮
    if (this.config.actionBtn) {
      this._initActionBtn();
      this._updateActionBtnStatus();
    }
  }

  /**
   * 初始化触发元素为 input ，生成树结构外框，点击 element 触发下拉展开树菜单
   */
  _initTreeExpand() {
    const _this = this;

    _this.$dropdownContainer.on('click', (e) => {
      e.stopPropagation();
    });

    _this.$trigger.data('treeDataSelect', true);

    _this.$trigger.click(function() {
      if (_this.config.disabled) {
        return;
      }

      !_this.$dropdownContainer.is(':visible') && $(window).trigger('click.hideTree');

      // Event: beforeShowDropdown
      _this.config.beforeShowDropdown.call(_this);

      _this.$dropdownContainer.slideDown(_this.config.dropdownSpeed, function() {
        // Event: afterShowDropdown
        _this.config.afterShowDropdown.call(_this);
      });
      _this.$dropdownContainer.find('.tree-search__keyword').focus();

      // Click outside the component to hide the dropdown.
      $(window).off('click.hideTree').on('click.hideTree', function(e) {
        if (!$(e.target).data('treeDataSelect')) {
          _this.config.beforeHideDropdown.call(_this);
          _this.$dropdownContainer.hide();
          _this.config.afterHideDropdown.call(_this);
          $(window).off('click.hideTree');
        }
      });
    });

    _this._initTree();
  }

  /**
   * 树结构初始化
   */
  _initTree() {
    const _this = this;
    const ztreeSetting = $.extend(true, {
      view: {
        fontCss: function(treeId, treeNode) {
          var highlightStyle = treeNode.highlight
            ? { color: '#f00', 'font-weight': 'bold' }
            : { color: '#333', 'font-weight': 'normal' };
          var customFontStyle = $.isPlainObject(treeNode.font)
            ? treeNode.font
            : {};
          return $.extend(highlightStyle, customFontStyle);
        }
      },
      callback: {}
    }, _this.config.ztreeSetting, {
      view: {
        expandSpeed: 0
      }
    });

    // 判断 ztreeSetting 内是否有自定义 onClick ，避免与 onTreeClick 冲突，作兼容处理
    if (ztreeSetting.callback.onClick && $.isFunction(ztreeSetting.callback.onClick)) {
      let _onClick = ztreeSetting.callback.onClick;
      ztreeSetting.callback.onClick = function(event, treeId, treeNode, clickFlag) {
        _onClick(event, treeId, treeNode);
        _this.config.onTreeClick.call(_this, treeNode, clickFlag);
      }
    } else {
      ztreeSetting.callback.onClick = function(event, treeId, treeNode, clickFlag) {
        _this.config.onTreeClick.call(_this, treeNode, clickFlag);
      }
    }

    const _beforeCheck = $.isFunction(ztreeSetting.callback.beforeCheck)
      ? ztreeSetting.callback.beforeCheck
      : null
    ztreeSetting.callback.beforeCheck = function(treeId, treeNode) {
      // 每一次勾选记录当前已勾选节点数据，提供给 onCheck 内勾选逻辑使用
      _this._checkedNodes = _this.treeObj.getCheckedNodes();
      if (_beforeCheck) {
        return _beforeCheck(treeId, treeNode);
      }
      return true;
    }

    // 避免搜索结果未显示的节点触发勾选，勾选后判断如果是隐藏的节点，再重新取消其勾选效果
    const _onCheck = $.isFunction(ztreeSetting.callback.onCheck)
      ? ztreeSetting.callback.onCheck
      : null
    ztreeSetting.callback.onCheck = function(event, treeId, treeNode) {
      _onCheck && _onCheck(event, treeId, treeNode);
      _this.treeObj.getChangeCheckedNodes().forEach(node => {
        const $node = $('#' + node.tId);
        // 通过 beforeCheck 内记录当前已勾选的节点，
        // 判断改变节点不存在于其中，再执行取消勾选操作，
        // 避免搜索新关键字后再勾选，导致原有记录丢失。
        if ($node.siblings('.__keep').length > 0 &&
            !$node.hasClass('__keep') &&
            _this._checkedNodes.indexOf(node) < 0) {
          _this.treeObj.checkNode(node, false, true);
          _onCheck && _onCheck(null, _this.treeObj.setting.treeId, node);
        }
      })
    }

    // 设置 ztree 实例，以供外部调用
    this.treeObj = $.fn.zTree.init(this.$element, ztreeSetting, _this.config.treedata);
    // 存储默认展开的节点，供 searchReset 使用
    this.defaultOpenNodes = this.treeObj.getNodesByParam('open', true);
  }

  /**
   * 初始化树搜索功能
   */
  _initSearch() {
    const $search = $('<div class="tree-search"></div>').append('<div class="tree-search__inner"></div>');
    const $keyword = $('<input class="tree-search__keyword" placeholder="请输入搜索关键字" />');
    const $resultCount = $('<span class="tree-search__count">共<span>0</span>项</span>');
    const $reset = $('<button type="button" class="tree-search__reset">&times;</button>');
    const $submit = $('<button type="button" class="tree-search__submit"><i class="fa fa-search"></i></button>');
    this.$resultCountNum = $resultCount.find('span');
    this.$searchResetBtn = $reset;

    const $searchAct = $('<span class="tree-search__act" />');
    if ($.isArray(this.config.searchBarActionBtn)) {
      $.map(this.config.searchBarActionBtn, (btn) => {
        const $btn = this._createActionBtn(btn);
        // searchbar 内部是右浮动，因此按钮用 prepend 插入才是按从左到右顺序显示
        $btn && $searchAct.prepend($btn);
      });
    }

    $search.find('.tree-search__inner').append(
      $searchAct.append(
        $submit,
        $reset.hide(),
        $resultCount.hide()
      ),
      $keyword,
    );

    // 重置树结构，用于点击 reset 之后、查询空字符
    const __resetTree = () => {
      this.lastKeyword = '';
      $keyword.val('');
      this.$resultCountNum.html(0);

      this._setNodeHighlight(false); // 清除高亮效果
    }

    // 集中设置搜索栏状态，包括 reset、count 显示与否， keyword 框宽度设置
    const __setSearchAct = () => {
      const keyword = $.trim($keyword.val());
      if (keyword) {
        $reset.show();
      } else {
        $reset.hide();
        $resultCount.hide();
      }
      $keyword.css('padding-right', $('.tree-search__act').outerWidth());
    }

    $keyword.on('keydown', (e) => {
      if (e.keyCode === 13) {
        e.preventDefault();
        $submit.click();
      }
    });

    $reset.on('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      __resetTree();
      __setSearchAct();

      // reset callback
      $.isFunction(this.config.onSearchReset) && this.config.onSearchReset.call(this);
    });

    $submit.on('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const keyword = $.trim($keyword.val());
      if (keyword) {
        $resultCount.show();
        this._searchNode(keyword);
        this.lastKeyword = keyword;
        __setSearchAct();

        // onSearch callback
        $.isFunction(this.config.onSearch) && this.config.onSearch.call(this);
      }
      //  else if (this.lastKeyword) {
      //   // 已有搜索结果下，搜索空内容，重置树结构
      //   __resetTree();
      // }
    });

    this.$dropdownContainer.prepend($search);
  }

  /**
   * 初始化树功能按钮
   */
  _initActionBtn() {
    const _this = this;

    // 初始化 actionBtn 结构
    // actionBtn: [] 配置左侧按钮
    // actionBtn: { left: [], right: [] } 配置左右按钮
    let leftBtns = [];
    let rightBtns = [];
    try {
      if (this.config.actionBtn) {
        // 获取左右按钮
        leftBtns = $.isArray(this.config.actionBtn.left)
          ? this.config.actionBtn.left
          : $.isArray(this.config.actionBtn)
            ? this.config.actionBtn
            : [];
        rightBtns = $.isArray(this.config.actionBtn.right)
          ? this.config.actionBtn.right
          : [];
      }
    } catch (e) {}

    // 插入按钮元素
    if (leftBtns.length || rightBtns.length) {
      const $btnWrap = $('<div class="tree-action clearfix" />');
      const $leftBtns = $('<div class="pull-left" />');
      const $rightBtns = $('<div class="pull-right" />');

      if (leftBtns.length) {
        $.map(leftBtns, function(btn) {
          const $btn = _this._createActionBtn(btn);
          $btn && $leftBtns.append($btn);
        });
        $btnWrap.append($leftBtns);
      }

      if (rightBtns.length) {
        $.map(rightBtns, function(btn) {
          const $btn = _this._createActionBtn(btn);
          $btn && $rightBtns.append($btn);
        });
        $btnWrap.append($rightBtns);
      }

      this.$dropdownContainer.prepend($btnWrap);
    }
  }

  /**
   * 生成 action button
   * @param  {Object|String|jQuery} option 按钮配置项
   * @return {jQuery Object}        生成的按钮元素
   */
  _createActionBtn(option) {
    // option 是一个 jQuery 对象，直接返回
    if (option instanceof $) {
      return option;
    }
    const _this = this;

    // 预设配置
    const preset = {
      expandCurNode: {
        content: '<i class="fa fa-fw fa-plus"></i>',
        title: '展开当前节点',
        _click: function() {
          const node = this.treeSelectedNodes[0];
          node && this.treeObj.expandNode(node, true, false, false);
        }
      },
      unExpandCurNode: {
        content: '<i class="fa fa-fw fa-minus"></i>',
        title: '收起当前节点',
        _click: function() {
          const node = this.treeSelectedNodes[0];
          node && this.treeObj.expandNode(node, false, false, false);
        }
      },
      expandAllNode: {
        content: '<i class="fa fa-fw fa-expand"></i>',
        title: '展开所有节点',
        _click: function() {
          this.treeObj.expandAll(true);
        }
      },
      unExpandAllNode: {
        content: '<i class="fa fa-fw fa-compress"></i>',
        title: '收起所有节点',
        _click: function() {
          this.treeObj.expandAll(false);
        }
      },
      expandCurAllNode: {
        content: '<i class="fa fa-fw fa-expand"></i>',
        title: '完全展开当前节点',
        _click: function() {
          const node = this.treeSelectedNodes[0];
          node && this.treeObj.expandNode(node, true, true, false);
        }
      },
      toggleCurNode: {
        content: '<i class="fa fa-fw fa-expand"></i>',
        title: '切换当前节点展开状态',
        _click: function(btn) {
          const node = this.treeSelectedNodes[0];
          if (node) {
            $(btn).html(node.open ? '<i class="fa fa-fw fa-expand"></i>' : '<i class="fa fa-fw fa-compress"></i>');
            this.treeObj.expandNode(node, !node.open, false, false);
          }
        }
      },
      toggleCurAllNode: {
        content: '<i class="fa fa-fw fa-expand"></i>',
        title: '切换当前节点所有子节点展开状态',
        _click: function(btn) {
          const node = this.treeSelectedNodes[0];
          if (node) {
            $(btn).html(node.open ? '<i class="fa fa-fw fa-expand"></i>' : '<i class="fa fa-fw fa-compress"></i>');
            this.treeObj.expandNode(node, !node.open, true, false);
          }
        }
      },
      resetTree: {
        content: '<i class="fa fa-fw fa-refresh"></i>',
        title: '重置树',
        _click: function() {
          this.resetTree();
          this.treeSelectedNodes = [];
          this._updateActionBtnStatus();
        }
      },
    };

    // 传入 string 但获取不到对应的预设配置，则不生成内容
    if (typeof option === 'string' && !preset[option]) {
      return null;
    }

    // 传入参数多状态处理
    const _option = typeof option === 'string' ? { actionType: option } : option;

    // 提取 actionType 用于获取预设
    const {
      actionType,
      ...restOption
    } = _option;

    // 合并预设配置项
    const config = $.extend({}, preset[actionType], restOption);

    // 从最终配置内容 config 提取配置
    const {
      className,
      border = true,
      content,
      click,
      _click,
      ...restConfig
    } = config;

    // class 属性拼接
    const _class = ['tree-action-btn'];
    border && _class.push('tree-action-btn-border')
    className && _class.push(className);

    // 最终 button
    const $btn = $('<button />', {
      class: _class.join(' '),
      onclick: typeof click === 'string' ? click : null,
      ...restConfig,
    }).append(content);

    const isNeedSelectedNode = [
      'expandCurNode',
      'unExpandCurNode',
      'expandCurAllNode',
      'toggleCurNode',
      'toggleCurAllNode'
    ].indexOf(option) > -1;
    isNeedSelectedNode && this.needSelectedNodeBtns.push($btn);

    // 预设内的点击回调，与 click 属性独立，让它支持预设 + 自定义定义点击事件
    $.isFunction(_click) && $btn.on('click', function() {
      _click.call(_this, this);
    });

    // 自定义点击事件
    $.isFunction(click) && $btn.on('click', function() {
      click.call(_this, this);
    });

    return $btn;
  }

  /**
   * 更新 action button 禁用状态
   * @return {[type]} [description]
   */
  _updateActionBtnStatus() {
    this.needSelectedNodeBtns.forEach($btn => {
      if (this.treeSelectedNodes.length > 0) {
        $btn.removeClass('tree-action-btn-disabled');
      } else {
        $btn.addClass('tree-action-btn-disabled');
      }
    })
  }

  /**
   * 查询节点
   * @param  {String} keyword    查询关键字
   * @param  {String} searchType 查询 key ，需要模糊匹配的属性名称
   */
  _searchNode(keyword, searchType = 'name') {
    if (this.lastKeyword !== keyword) {
      // 删除上一次筛选结果的高亮
      this._setNodeHighlight(false);

      // 模糊查询匹配节点
      this.filtedNodes = this.treeObj.getNodesByParamFuzzy(searchType, keyword).filter(node => !node.isHidden);
      this.$resultCountNum.html(this.filtedNodes.length);

      // 应用节点高亮
      this._setNodeHighlight(true);
    }
  }

  /**
   * 设置 this.filtedNodes 内记录的节点的高亮与否
   * @param {Boolean} isHighlight 'true' 为高亮， 'false' 为撤销高亮
   * @param {Boolean} keepExpand 保持节点折叠状态
   */
  _setNodeHighlight(isHighlight, keepExpand) {
    // 记录高亮节点，用于最后隐藏其它无关兄弟节点
    const tIdArr = [];

    $.map(this.filtedNodes, (node) => {
      const $parentNode = node.getParentNode() || node;

      // 设置高亮变量
      node.highlight = isHighlight;

      if (isHighlight) {
        // 设置高亮时将搜索到的节点的所有父节点展开
        this.treeObj.expandNode($parentNode, true, false, false);
      } else {
        // 清除高亮效果时折叠所有子节点
        !keepExpand && this.treeObj.expandAll(false);
      }

      // 更新节点样式
      this.treeObj.updateNode(node);

      tIdArr.push('#' + node.tId + '_a');
    });

    if (this.config.searchResultHideSiblings) {
      // 隐藏高亮节点其它无关兄弟节点
      if (isHighlight) {
        // 用 .__keep-s 标识是搜索结果的隐藏
        // 用于区分树权限控制时使用 hideNode 隐藏的情况
        $(tIdArr.join(',')).parents('li').addClass('__keep')
          .siblings(':not(.__keep)').not(':hidden').hide().addClass('__keep-s');
      } else {
        $(tIdArr.join(',')).parents('li').removeClass('__keep')
          .siblings('.__keep-s').show().removeClass('__keep-s');
      }
    }
  }

  /**
   * 隐藏下拉框，可用于手动触发隐藏下拉的操作
   */
  hideDropdown() {
    $(window).trigger('click.hideTree');
  }

  /**
   * 刷新树结构
   * @param  {object} treedata 需要刷新的数据源
   */
  setTreedata(treedata) {
    this.config.treedata = treedata;
    this._initTree();
  }

  /**
   * 重置树结构
   * @param  {Function} callback Callback Function on after reset tree
   */
  resetTree(callback) {
    this.config.treeSearch && this.$searchResetBtn.click();
    this._initTree();
    $.isFunction(callback) && callback.call(this);
  }

  /**
   * 清空显示值并重置树
   */
  reset() {
    this.$value && this.$value.val('');
    this.$trigger && this.$trigger.val('');
    this.resetTree.apply(this, arguments)
  }

  /**
   * 返回 treeNode 节点的所有子级节点的数据
   * @param  {Object}       treeNode ztree 树数据的其中一个节点
   * @param  {String|Array} field    需要返回所有子节点的 key 值，若留空则反正整个节点 Object
   * @return {Array}                 根据 field 返回的节点数据
   */
  getAllChildren(treeNode, field) {
    const result = [];

    if (treeNode) {
      (function _mapNode(treeNode) {
        if (treeNode.isHidden === false) {
          if ($.isArray(treeNode.children)) {
            $.map(treeNode.children, (node) => {
              let rowResult;

              if ($.isArray(field)) {
                rowResult = {};
                $.map(field, (row) => {
                  if (typeof row === 'string' && node[row]) {
                    rowResult[row] = node[row];
                  }
                });
              } else if (field) {
                rowResult = node[field]
              } else {
                rowResult = node;
              }

              result.push(rowResult);
              _mapNode(node, field);
            });
          }
        }
      })(treeNode);
    }

    return result;
  }

  /**
   * 返回 treeNode 节点的所有子级【叶子节点】的数据
   * @param  {Object}       treeNode ztree 树数据的其中一个节点
   * @param  {String|Array} field    需要返回所有子节点的 key 值，若留空则反正整个节点 Object
   * @return {Array}                 根据 field 返回的节点数据
   */
  getAllLeafChildren(treeNode, field) {
    const result = [];

    if (treeNode) {
      (function _mapNode(treeNode) {
        if (treeNode.isHidden === false) {
          if (treeNode.isParent) {
            $.isArray(treeNode.children) && $.map(treeNode.children, (node) => {
              _mapNode(node, field);
            });
          } else {
            let rowResult;

            if ($.isArray(field)) {
              rowResult = {};
              $.map(field, (row) => {
                if (typeof row === 'string' && treeNode[row]) {
                  rowResult[row] = treeNode[row];
                }
              });
            } else if (field) {
              rowResult = treeNode[field]
            } else {
              rowResult = treeNode;
            }

            result.push(rowResult);
          }
        }
      })(treeNode);
    }

    return result;
  }

  /**
   * 切换控件为可用状态
   */
  setEnable() {
    this.$trigger.removeClass('tree-trigger-disabled');
    this.config.disabled = false;
  }

  /**
   * 切换控件为不可用状态
   */
  setDisabled() {
    this.$trigger.addClass('tree-trigger-disabled');
    this.config.disabled = true;
  }

  /**
   * 设置树下拉结构高度
   */
  setDropdownHeight(height) {
    if (this.$treeBody) {
      const newHeight = parseInt(height, 10);

      if (newHeight > 0 && !isNaN(newHeight)) {
        this.$treeBody.css('max-height', newHeight);
      }
    }
  }
}

function treeDataSelect(elements, options) {
  const instanceArr = [];

  $(elements).each(function() {
    let instance = $(this).data('treeDataSelect_instance');

    if (!instance) {
      instance = new TreeDataSelectGenerator(this, options);
      $(this).data('treeDataSelect_instance', instance);
    }

    instanceArr.push(instance);
  });

  const result = instanceArr.length === 1 ? instanceArr[0] : instanceArr;
  return result;
}

$.fn.treeDataSelect = function(options) {
  const instanceArr = treeDataSelect(this, options);

  return instanceArr;
}

module.exports = treeDataSelect;