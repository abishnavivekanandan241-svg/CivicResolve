import * as dotenv from 'dotenv';
dotenv.config();
import { analyzeIssue } from '../src/lib/gemini';

const sampleComplaints = [
  {
    lang: 'Tamil (தமிழ்)',
    title: 'குப்பை மேடு',
    description: 'பெருந்துறை மார்க்கெட் வாசலில் குப்பைகள் குவிந்து கிடக்கிறது, துர்நாற்றம் தாங்க முடியவில்லை.',
    location: 'Brough Road Flower Market, Ward 1, Erode',
  },
  {
    lang: 'Tanglish (Romanized Tamil)',
    title: 'Big pothole near Clock Tower',
    description: 'Clock tower kitta periya pothole irukku, night time la theriyave illa bikes slip aaguthu accident danger.',
    location: 'Clock Tower Junction, Ward 1, Erode',
  },
  {
    lang: 'Hindi (हिन्दी)',
    title: 'स्ट्रीट लाइट बंद',
    description: 'कलेक्टर ऑफिस के सामने स्ट्रीट लाइट पिछले 4 दिनों से बंद पड़ी है, रात में अंधेरा रहता है महिलाओं के लिए असुरक्षित।',
    location: 'Perundurai Road near Collectorate, Ward 3, Erode',
  },
  {
    lang: 'Telugu (తెలుగు)',
    title: 'రైల్వే అండర్‌పాస్ వాటర్ లాగింగ్',
    description: 'రైల్వే అండర్‌పాస్ కింద మోకాళ్ళ లోతు నీరు నిలిచిపోయింది, వాహనాలు వెళ్ళలేకపోతున్నాయి.',
    location: 'Railway Subway, Ward 2, Erode',
  },
  {
    lang: 'English',
    title: 'High-pressure water pipeline burst',
    description: 'Main drinking water pipeline burst in front of Erode Junction Railway Station gate wasting thousands of liters.',
    location: 'Station Road, Erode Junction, Ward 2, Erode',
  },
];

async function runGeminiTests() {
  console.log('🧪 Testing CivicResolve Gemini Intelligence Engine & Fallback Pipeline...\n');

  for (let i = 0; i < sampleComplaints.length; i++) {
    const item = sampleComplaints[i];
    console.log(`[Test ${i + 1}/5] Input Language: ${item.lang}`);
    console.log(`Input: "${item.description}"`);

    const result = await analyzeIssue({
      title: item.title,
      description: item.description,
      location: item.location,
    });

    console.log(`✓ Detected Lang/Script: ${result.detectedLanguage} (${result.detectedScript}) | Romanized: ${result.isRomanizedIndic}`);
    console.log(`✓ Category: ${result.category} -> Dept: ${result.department}`);
    console.log(`✓ Priority: ${result.priority} (${result.priorityScore}/100) | Safety Risk: ${result.safetyRisk}`);
    console.log(`✓ Summary: ${result.summary}`);
    console.log(`✓ Translation: ${result.englishTranslation}`);
    console.log(`✓ Engine Mode: ${result.isAiGenerated ? 'Live Gemini AI' : 'Deterministic Fallback'}\n`);
  }

  console.log('🎉 All 5 sample complaints processed successfully!');
}

runGeminiTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});

