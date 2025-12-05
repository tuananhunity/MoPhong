import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5174;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// System prompt cho chuyên gia hóa học
const CHEMISTRY_EXPERT_PROMPT = `Bạn là một chuyên gia hóa học với kiến thức sâu rộng về các phản ứng hóa học, cơ chế phản ứng, và giáo dục hóa học. 
Nhiệm vụ của bạn là tạo ra các câu hỏi trắc nghiệm chất lượng cao về hóa học bằng tiếng Việt.

Yêu cầu:
- Câu hỏi phải chính xác về mặt khoa học
- Đáp án phải rõ ràng, chỉ có một đáp án đúng
- Câu hỏi phải phù hợp với trình độ học sinh phổ thông
- Sử dụng ký hiệu hóa học đúng chuẩn (ví dụ: H₂O, CO₂, H₂SO₄)
- Trả về định dạng JSON với cấu trúc:
{
  "questions": [
    {
      "question": "Câu hỏi",
      "options": ["A. Đáp án 1", "B. Đáp án 2", "C. Đáp án 3", "D. Đáp án 4"],
      "correctAnswer": 0,
      "explanation": "Giải thích tại sao đáp án đúng"
    }
  ]
}`;

// Endpoint để tạo câu hỏi trắc nghiệm
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { reactionTitle, reactionDescription, numberOfQuestions = 5 } = req.body;

    if (!reactionTitle) {
      return res.status(400).json({ error: 'reactionTitle là bắt buộc' });
    }

    // Xác định loại chủ đề để tạo prompt phù hợp
    const titleLower = reactionTitle.toLowerCase();
    let topicType = 'chủ đề hóa học';
    let specificGuidance = '';

    if (titleLower.includes('phản ứng') || titleLower.includes('reaction')) {
      topicType = 'phản ứng hóa học';
      specificGuidance = `Các câu hỏi nên bao gồm:
- Phương trình hóa học và cân bằng
- Điều kiện phản ứng
- Sản phẩm tạo thành
- Ứng dụng thực tế
- Cơ chế phản ứng (nếu có)`;
    } else if (titleLower.includes('phân tử') || titleLower.includes('molecule') || 
               titleLower.includes('h₂o') || titleLower.includes('co₂') || 
               titleLower.includes('caffeine') || titleLower.includes('glucose') ||
               titleLower.includes('benzene') || titleLower.includes('aspirin')) {
      topicType = 'phân tử hóa học';
      specificGuidance = `Các câu hỏi nên bao gồm:
- Cấu trúc phân tử và công thức hóa học
- Tính chất vật lý và hóa học
- Liên kết hóa học và hình học phân tử
- Ứng dụng trong đời sống và công nghiệp
- Phản ứng đặc trưng của phân tử này`;
    } else if (titleLower.includes('dụng cụ') || titleLower.includes('thiết bị') || 
               titleLower.includes('phòng thí nghiệm') || titleLower.includes('lab')) {
      topicType = 'dụng cụ và thiết bị phòng thí nghiệm';
      specificGuidance = `Các câu hỏi nên bao gồm:
- Công dụng và cách sử dụng
- Nguyên lý hoạt động
- An toàn khi sử dụng
- Ứng dụng trong thí nghiệm cụ thể
- Bảo quản và bảo dưỡng`;
    } else if (titleLower.includes('thí nghiệm') || titleLower.includes('experiment') ||
               titleLower.includes('acid') || titleLower.includes('base') ||
               titleLower.includes('khí') || titleLower.includes('gas') ||
               titleLower.includes('nồng độ') || titleLower.includes('molarity')) {
      topicType = 'thí nghiệm hóa học';
      specificGuidance = `Các câu hỏi nên bao gồm:
- Nguyên lý và mục đích thí nghiệm
- Các bước thực hiện
- Hiện tượng quan sát được
- Kết quả và giải thích
- Ứng dụng thực tế`;
    } else if (titleLower.includes('cấu trúc') || titleLower.includes('tinh thể') ||
               titleLower.includes('kim cương') || titleLower.includes('crystal')) {
      topicType = 'cấu trúc tinh thể và vật liệu';
      specificGuidance = `Các câu hỏi nên bao gồm:
- Cấu trúc tinh thể
- Tính chất vật lý
- Ứng dụng trong công nghiệp
- Phương pháp tổng hợp
- So sánh với các vật liệu khác`;
    } else {
      specificGuidance = `Các câu hỏi nên bao gồm:
- Kiến thức cơ bản về chủ đề
- Tính chất và đặc điểm
- Ứng dụng thực tế
- Mối liên hệ với các khái niệm hóa học khác
- An toàn và lưu ý khi sử dụng`;
    }

    const prompt = `${CHEMISTRY_EXPERT_PROMPT}

Hãy tạo ${numberOfQuestions} câu hỏi trắc nghiệm về ${topicType} sau:

Tên chủ đề: ${reactionTitle}
${reactionDescription ? `Mô tả: ${reactionDescription}` : ''}

${specificGuidance}

Trả về JSON với đúng định dạng đã yêu cầu.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON từ response (có thể có markdown code blocks)
    let jsonText = text.trim();
    
    // Loại bỏ markdown code blocks nếu có
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    const quizData = JSON.parse(jsonText);

    res.json({
      success: true,
      data: quizData
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Không thể tạo câu hỏi. Vui lòng thử lại.',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chemistry AI Server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Chemistry AI Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📝 Đảm bảo đã cấu hình GEMINI_API_KEY trong file .env`);
});

