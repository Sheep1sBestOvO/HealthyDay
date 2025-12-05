# LLM Integration Guide for HealthyDay

## 🚀 Free LLM API Options

### 1. **Groq API (推荐) ⭐**
- **完全免费**，无需信用卡
- **速度极快**（使用 GPU 加速）
- **注册地址**: https://console.groq.com/
- **获取 API Key**: 注册后即可在 Dashboard 获取
- **模型**: Llama 3.1 70B (免费且强大)

### 2. **Hugging Face Inference API**
- **免费 tier**: 每月 30,000 次请求
- **注册地址**: https://huggingface.co/
- **多种模型可选**

### 3. **OpenAI API**
- **免费额度**: $5 (新用户)
- **需要信用卡验证**
- **注册地址**: https://platform.openai.com/

---

## 📝 Setup Instructions

### Step 1: 获取 Groq API Key
1. 访问 https://console.groq.com/
2. 注册账号（使用 GitHub/Google 登录）
3. 在 Dashboard 中创建 API Key
4. 复制 API Key

### Step 2: 配置环境变量
在 `backend/` 目录下创建 `.env` 文件：

```env
GROQ_API_KEY=your_groq_api_key_here
MONGO_URI=mongodb://localhost:27017/healthyday_db
JWT_SECRET_KEY=your-secret-key
```

### Step 3: 安装依赖
```bash
cd backend
pip install -r requirements.txt
```

### Step 4: 运行后端
```bash
python app.py
```

---

## 🎯 Prompt Engineering 策略

### 系统提示词 (System Prompt)
- 定义 AI 的角色：专业营养师和厨师
- 明确输出格式：JSON 数组
- 强调准确性：营养信息必须准确

### 用户提示词 (User Prompt) 结构
1. **可用食材列表** - 从用户冰箱获取
2. **用户偏好** - 饮食类型、辣度、过敏、健康目标
3. **明确要求** - 使用主要食材、尊重限制、匹配偏好
4. **输出格式** - 详细的 JSON Schema

### 关键设计点
- ✅ **结构化输入**: 将食材和偏好格式化为清晰文本
- ✅ **约束条件**: 明确要求（过敏、饮食限制）
- ✅ **输出格式**: 强制 JSON 格式，便于解析
- ✅ **错误处理**: 如果 API 失败，返回备用食谱

---

## 🔧 API 使用示例

### 前端调用
```javascript
import { generateRecipes } from './api';

const handleGenerate = async () => {
  try {
    const result = await generateRecipes();
    console.log(result.recipes); // Array of recipe objects
  } catch (error) {
    console.error(error);
  }
};
```

### 后端路由
```
POST /api/recipes/generate
Headers: Authorization: Bearer <token>
Response: {
  "recipes": [...],
  "count": 5,
  "message": "Recipes generated successfully!"
}
```

---

## 📊 返回的食谱格式

```json
{
  "name": "Recipe Name",
  "description": "Brief description",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["Step 1", "Step 2"],
  "nutrition": {
    "calories": 350,
    "protein": 25,
    "carbs": 30,
    "fat": 12
  },
  "cookingTime": "30 minutes",
  "difficulty": "Easy",
  "tags": ["high-protein", "quick"]
}
```

---

## 💡 优化建议

1. **缓存机制**: 相同食材组合可以缓存结果
2. **流式输出**: 使用 streaming API 提升用户体验
3. **多模型支持**: 可以添加多个 API 作为备选
4. **营养验证**: 使用营养数据库验证 LLM 返回的营养信息

