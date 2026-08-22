// 記錄目前狀態：false = 全部收起, true = 全部展開
  let allExpanded = false;

  // 單個項目開關
  function toggleOne(btn) {
    const content = btn.nextElementSibling;
    const iconSpan = btn.querySelector('.material-symbols-outlined');

    if (content.classList.contains('show')) {
      content.classList.remove('show');
      if (iconSpan) iconSpan.textContent = 'add_2';
    } else {
      content.classList.add('show');
      if (iconSpan) iconSpan.textContent = 'close'; // 或者用其他 icon
    }
  }

  // 全局開關
  function toggleAll() {
    const items = document.querySelectorAll('.collapsible');
    const globalBtn = document.getElementById('global-toggle-btn');

    allExpanded = !allExpanded;

    items.forEach(item => {
      if (allExpanded) {
        item.classList.add('show');
      } else {
        item.classList.remove('show');
      }
    });

    globalBtn.textContent = allExpanded ? 'close_fullscreen' : 'add_2';
  }

  // 去頂
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 去底
  function scrollToBottom() {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  }