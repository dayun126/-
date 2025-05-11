// 监听扩展图标点击事件
chrome.action.onClicked.addListener(async () => {
  try {
    // 获取扩展页面的URL
    const extensionUrl = chrome.runtime.getURL("popup.html");
    
    // 查询所有标签页，查找已打开的扩展页面
    const tabs = await chrome.tabs.query({});
    const existingTab = tabs.find(tab => tab.url && tab.url.startsWith(extensionUrl));
    
    if (existingTab) {
      // 如果已有标签页，则激活该标签页
      await chrome.tabs.update(existingTab.id, { active: true });
      // 如果标签页不在当前窗口，则切换到该窗口
      await chrome.windows.update(existingTab.windowId, { focused: true });
    } else {
      // 如果没有已打开的标签页，则创建新标签页
      await chrome.tabs.create({
        url: extensionUrl
      });
    }
  } catch (error) {
    console.error("打开标签页时出错:", error);
  }
}); 
/* 
 * © 2025 大沄. All rights reserved.
 * Unauthorized copying or reuse prohibited.
 */