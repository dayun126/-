const GITHUB_API_BASE = 'https://api.github.com';
const REPO_OWNER = 'dayun126';
const REPO_NAME = 'dayun';
const BRANCH = 'main';
const DECRYPT_SALT = "k7m3p";
const ENCRYPTED_TOKEN = "sPhx6l72hLbmr1Ab1pHvTXMaMFMCAqMH0kaI8L5FlunmtXr9hPV6m/dbX+w0MrPbR46GU0dps+QCu2C6OAz2JH65EuZE9kGVyzXhRQA2/jzTIS+QPe2FDE+SLP2Bxe8zp8JUiQMb8mw8JSFQZjWqBA==";
const FILE_MAPPING = {
  'activation': 'Permission.txt',
  'filter': 'README.md',
  'log': 'log.txt'
};
async function decryptToken(userPassword) {
    try {
        const saltedPassword = userPassword + DECRYPT_SALT;
        const passwordBuffer = new TextEncoder().encode(saltedPassword);
        const keyBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
        
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            keyBuffer,
            { name: "AES-CBC" },
            false,
            ["decrypt"]
        );

        const base64Data = atob(ENCRYPTED_TOKEN);
        const encryptedData = new Uint8Array(base64Data.length);
        for (let i = 0; i < base64Data.length; i++) {
            encryptedData[i] = base64Data.charCodeAt(i);
        }
        
        const iv = encryptedData.slice(0, 16);
        const data = encryptedData.slice(16);
        
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-CBC",
                iv: iv
            },
            keyMaterial,
            data
        );
        
        return new TextDecoder().decode(decrypted).trim();
    } catch (error) {
        console.error('解密失败:', error);
        throw new Error('解密失败');
    }
}

// 构建API请求头
async function getGitHubHeaders() {
    try {
        const password = sessionStorage.getItem('auth_key');
        if (!password) {
            throw new Error('未授权访问');
        }
        const token = await decryptToken(password);
        return {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        };
    } catch (error) {
        console.error('获取Headers失败:', error);
        throw error;
    }
}


function decodeBase64Content(base64Content) {
  try {

    return decodeURIComponent(escape(atob(base64Content)));
  } catch (error) {
    console.error('Base64解码失败:', error);

    return atob(base64Content);
  }
}

// 获取文件内容
async function getFileContent(tabName) {
  try {
    // 获取对应的文件名
    const fileName = FILE_MAPPING[tabName];
    if (!fileName) {
      throw new Error(`未找到对应的文件名: ${tabName}`);
    }
    
    // 构建API请求
    const headers = await getGitHubHeaders();
    // 添加时间戳参数防止缓存
    const timestamp = new Date().getTime();
    const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${fileName}?ref=${BRANCH}&t=${timestamp}`;
    
    // 发送请求
    const response = await fetch(url, { 
      headers,
      cache: 'no-store' // 禁止使用缓存
    });
    
    // 检查响应
    if (!response.ok) {
      // 如果是404错误，表示文件不存在
      if (response.status === 404) {
        return {
          content: '',
          sha: '',
          fileExists: false
        };
      }
      
      const errorData = await response.json();
      throw new Error(`获取文件失败: ${response.status} - ${errorData.message || '未知错误'}`);
    }
    
    // 解析响应
    const data = await response.json();
    
    // 解码Base64内容，正确处理UTF-8字符
    const content = decodeBase64Content(data.content);
    
    // 返回内容和SHA（用于后续更新），添加文件存在标记
    return {
      content,
      sha: data.sha,
      fileExists: true
    };
  } catch (error) {
    console.error('获取文件内容失败:', error);
    throw error;
  }
}

// 更新文件内容
async function updateFileContent(fileName, content, sha) {
    try {
        // 如果没有sha，说明文件不存在，无法更新
        if (!sha) {
            throw new Error('文件不存在，无法保存');
        }
        
        const headers = await getGitHubHeaders();
        const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${fileName}`;
        
        const requestBody = {
            message: `通过Chrome扩展更新 ${fileName}`,
            content: btoa(unescape(encodeURIComponent(content))),
            sha: sha,
            branch: BRANCH
        };
        
        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 409) {
                throw new Error('文件已被修改，请重新获取后再保存');
            }
            throw new Error(`更新文件失败: ${response.status} - ${errorData.message || '未知错误'}`);
        }
        
        const data = await response.json();
        return {
            success: true,
            sha: data.content.sha
        };
    } catch (error) {
        console.error('更新文件内容失败:', error);
        throw error;
    }
}

window.GitHubAPI = {
    getFileContent,
    updateFileContent
};
/* 
 * © 2025 大沄. All rights reserved.
 * Unauthorized copying or reuse prohibited.
 */ 