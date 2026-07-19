const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('./env');

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const generationModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

module.exports = { genAI, generationModel, embeddingModel };
