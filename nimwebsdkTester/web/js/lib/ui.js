function initUI () {
  initTabs()
  initMenuLink()
}

function initTabs () {
  $('#menu').on('click', 'a.pure-menu-link', function () {
    hideAllTabs()
    showTab($(this))
  })
  var activeTab
  if (window.tabCmd) {
    activeTab = $('a.pure-menu-link[data-cmd=' + window.tabCmd + ']')
  } else {
    activeTab = $('a.pure-menu-link:first')
  }
  activeTab.click()
}

function hideAllTabs () {
  $('.pure-menu-item').removeClass('active')
  $('.tab').addClass('f-dn')
}

function showTab (node) {
  node = $(node)
  node.parent().addClass('active')
  var cmd = node.attr('data-Cmd')
  $('.tab-' + cmd).removeClass('f-dn')
  document.body.scrollTop = 0
  $('#layout').removeClass('active')
}

function initMenuLink () {
  $('#menuLink').on('click', function () {
    $('#layout').toggleClass('active')
  })
}
