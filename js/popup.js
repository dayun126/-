// DOM元素引用
const loginContainer = document.getElementById('login-container');
const mainContainer = document.getElementById('main-container');
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');
const tabActivation = document.getElementById('tab-activation');
const tabFilter = document.getElementById('tab-filter');
const tabLog = document.getElementById('tab-log');
const editor = document.getElementById('editor');
const fetchButton = document.getElementById('fetch-button');
const saveButton = document.getElementById('save-button');
const modifiedIndicator = document.getElementById('modified-indicator');
const statusMessage = document.getElementById('status-message');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const ADMIN_PASSWORD_HASH = "ce128f7610a0084dd96fa34e4bf184caf251eeef0838cacecf7d8d8c09586298";
const SALT = "d9e1b";


let currentTab = 'activation'; // 'activation', 'filter', 'log'
let isModified = false;
let editorOriginalContent = '';

// 用于记录每个标签页对应的GitHub文件信息
const tabFileMap = {
  'activation': {
    fileName: 'Permission.txt',
    content: '',
    sha: '',
    fileExists: true
  },
  'filter': {
    fileName: 'README.md',
    content: '',
    sha: '',
    fileExists: true
  },
  'log': {
    fileName: 'log.txt',
    content: '',
    sha: '',
    fileExists: true
  }
};

// ===== 界面控制函数 =====

// 显示/隐藏加载动画
function showLoading(text = '加载中...') {
  loadingText.textContent = text;
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

// 显示状态消息
function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? '#d32f2f' : 'rgb(108, 174, 194)';
  
  // 3秒后清除消息
  setTimeout(() => {
    statusMessage.textContent = '';
  }, 3000);
}

// 清除状态消息
function clearStatus() {
  statusMessage.textContent = '';
}

// 切换到主界面
function switchToMainInterface() {
  loginContainer.classList.add('hidden');
  mainContainer.classList.remove('hidden');
}

// 标记编辑器内容已修改
function markAsModified() {
  if (!isModified) {
    isModified = true;
    modifiedIndicator.classList.remove('hidden');
  }
}

// 标记编辑器内容未修改
function markAsUnmodified() {
  isModified = false;
  modifiedIndicator.classList.add('hidden');
}

// 根据当前标签页更新编辑器样式
function updateEditorStyle() {
  // 移除所有可能的特殊样式类
  editor.classList.remove('filter-mode');
  
  // 如果是卡审词管理，添加特殊样式
  if (currentTab === 'filter') {
    editor.classList.add('filter-mode');
  }
}

// 更新编辑器内容
function updateEditorContent() {
  // 使用当前标签页的缓存内容更新编辑器
  editor.value = tabFileMap[currentTab].content;
  editorOriginalContent = editor.value;
  
  // 根据文件是否存在来启用或禁用保存按钮
  saveButton.disabled = !tabFileMap[currentTab].fileExists;
  
  // 重置修改状态
  markAsUnmodified();
}

// 切换当前活动的标签页
function switchTab(tab) {
  // 移除所有标签页的激活状态
  tabActivation.classList.remove('active');
  tabFilter.classList.remove('active');
  tabLog.classList.remove('active');
  
  // 激活当前标签页
  switch (tab) {
    case 'activation':
      tabActivation.classList.add('active');
      break;
    case 'filter':
      tabFilter.classList.add('active');
      break;
    case 'log':
      tabLog.classList.add('active');
      break;
  }
  
  // 更新当前标签页变量
  currentTab = tab;
  
  // 更新编辑器样式
  updateEditorStyle();
  
  // 清除状态消息，每次切换标签页都清除
  clearStatus();
  
  // 更新编辑器内容并检查文件存在状态
  updateEditorContent();
}

// ===== GitHub API 交互函数 =====

// 从GitHub获取文件内容
async function fetchFileFromGitHub() {
  showLoading('获取中...');
  
  // 禁用按钮，防止重复操作
  fetchButton.disabled = true;
  saveButton.disabled = true;
  
  try {
    // 使用GitHub API获取文件内容，传递当前标签页名称
    const result = await window.GitHubAPI.getFileContent(currentTab);
    
    // 检查文件是否存在
    if (!result.fileExists) {
      // 文件不存在，禁用保存按钮
      saveButton.disabled = true;
      // 显示警告消息
      showStatus(`文件 ${tabFileMap[currentTab].fileName} 不存在，无法保存`, true);
      // 清空编辑器内容
      editor.value = '';
      editorOriginalContent = '';
      // 更新缓存
      tabFileMap[currentTab].content = '';
      tabFileMap[currentTab].sha = '';
      tabFileMap[currentTab].fileExists = false;
      return;
    }
    
    // 更新缓存
    tabFileMap[currentTab].content = result.content;
    tabFileMap[currentTab].sha = result.sha;
    tabFileMap[currentTab].fileExists = true;
    
    // 更新编辑器内容
    updateEditorContent();
    
    // 显示成功消息
    showStatus('获取成功');
  } catch (error) {
    console.error('获取文件失败:', error);
    showStatus(`获取失败: ${error.message}`, true);
  } finally {
    // 无论成功还是失败，都恢复获取按钮状态并隐藏加载动画
    fetchButton.disabled = false;
    // 注意：我们不恢复保存按钮状态，因为这取决于文件是否存在
    hideLoading();
  }
}

// 保存文件内容到GitHub
async function saveFileToGitHub() {
  // 检查是否有内容可以保存
  if (!editor.value.trim()) {
    showStatus('无内容可保存', true);
    return;
  }
  
  // 检查文件是否存在
  if (tabFileMap[currentTab].fileExists === false) {
    showStatus(`文件 ${tabFileMap[currentTab].fileName} 不存在，无法保存`, true);
    return;
  }
  
  showLoading('保存中...');
  
  // 禁用按钮，防止重复操作
  fetchButton.disabled = true;
  saveButton.disabled = true;
  
  try {
    // 使用GitHub API更新文件内容
    const result = await window.GitHubAPI.updateFileContent(
      tabFileMap[currentTab].fileName,
      editor.value,
      tabFileMap[currentTab].sha
    );
    
    // 更新缓存
    tabFileMap[currentTab].content = editor.value; // 更新缓存的内容
    tabFileMap[currentTab].sha = result.sha;       // 更新SHA
    tabFileMap[currentTab].fileExists = true;      // 确保fileExists标志为true
    
    // 更新原始内容为当前内容
    editorOriginalContent = editor.value;
    
    // 显示成功消息
    showStatus('保存成功');
    
    // 重置修改状态
    markAsUnmodified();
  } catch (error) {
    console.error('保存文件失败:', error);
    showStatus(`保存失败: ${error.message}`, true);
  } finally {
    // 无论成功还是失败，都恢复按钮状态并隐藏加载动画
    fetchButton.disabled = false;
    saveButton.disabled = false;
    hideLoading();
  }
}

// ===== 事件监听器 =====

// 显示错误消息
function showError(message) {
    loginError.textContent = message;
    loginError.style.color = '#d32f2f';
}

// 清除错误消息
function clearError() {
    loginError.textContent = '';
}

// 密码校验
loginButton.addEventListener('click', () => {
    const password = passwordInput.value;
    
    verifyPassword(password).then(isCorrect => {
        if (isCorrect) {
            // 保存密码用于后续解密
            sessionStorage.setItem('auth_key', password);
            // 清除错误消息
            clearError();
            // 切换到主界面
            switchToMainInterface();
            // 清空密码输入框
            passwordInput.value = '';
        } else {
            showError('密码错误，请重试');
            passwordInput.value = '';
        }
    });
});

// 处理回车键提交密码
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loginButton.click();
  }
});

// 标签页切换事件
tabActivation.addEventListener('click', () => {
  // 如果有未保存的修改，提示用户
  if (isModified) {
    if (confirm('当前有未保存的修改，切换标签页将丢失这些修改。是否继续？')) {
      switchTab('activation');
    }
  } else {
    switchTab('activation');
  }
});

tabFilter.addEventListener('click', () => {
  if (isModified) {
    if (confirm('当前有未保存的修改，切换标签页将丢失这些修改。是否继续？')) {
      switchTab('filter');
    }
  } else {
    switchTab('filter');
  }
});

tabLog.addEventListener('click', () => {
  if (isModified) {
    if (confirm('当前有未保存的修改，切换标签页将丢失这些修改。是否继续？')) {
      switchTab('log');
    }
  } else {
    switchTab('log');
  }
});

// 监听文本编辑器的内容变化
editor.addEventListener('input', () => {
  if (editor.value !== editorOriginalContent) {
    markAsModified();
  } else {
    markAsUnmodified();
  }
});

// 获取按钮点击事件
fetchButton.addEventListener('click', fetchFileFromGitHub);

// 保存按钮点击事件
saveButton.addEventListener('click', saveFileToGitHub);

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  // 初始状态：显示登录界面
  loginContainer.classList.remove('hidden');
  mainContainer.classList.add('hidden');
  
  // 默认激活"激活码管理"标签页
  switchTab('activation');
});

async function verifyPassword(inputPassword) {
    try {
        const saltedPassword = inputPassword + SALT;
        const inputBuffer = new TextEncoder().encode(saltedPassword);
        const inputHashBuffer = await crypto.subtle.digest('SHA-256', inputBuffer);
        const inputHash = Array.from(new Uint8Array(inputHashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        return inputHash === ADMIN_PASSWORD_HASH;
    } catch (error) {
        console.error('验证失败:', error);
        return false;
    }
} 
/* 
 * © 2025 大沄. All rights reserved.
 * Unauthorized copying or reuse prohibited.
 */