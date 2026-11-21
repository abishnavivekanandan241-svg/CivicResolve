'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Camera,
  Mic,
  MicOff,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  FileText,
  Copy,
  Check,
  Building2,
  ThumbsUp,
  RefreshCw,
  HelpCircle,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useI18n } from '@/lib/i18n';
import { GeminiAnalysisResult, DuplicateCheckResult } from '@/lib/types';
import { CATEGORIES } from '@/lib/gemini';

// Dynamically import Leaflet Map component with SSR disabled
const LocationPickerMap = dynamic(
  () => import('@/components/Map/LocationPickerMap'),
  { ssr: false, loading: () => <div className="h-[280px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" /> }
);

export default function ReportPage() {
  const router = useRouter();
  const { t, language } = useI18n();

  // Wizard Step: 1 = Input, 2 = AI Intelligence Review, 3 = Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Let AI decide');
  const [locationText, setLocationText] = useState('Perundurai Road, Ward 3, Erode, Tamil Nadu');
  const [lat, setLat] = useState(11.3520);
  const [lng, setLng] = useState(77.7020);
  const [ward, setWard] = useState('Ward 3 - Collectorate & Veerappanchatiram');
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [preferredReplyLanguage, setPreferredReplyLanguage] = useState('Tamil');

  // Voice Dictation
  const [isRecording, setIsRecording] = useState(false);
  const [speechLocale, setSpeechLocale] = useState('ta-IN');
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>('');

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stepperIndex, setStepperIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<GeminiAnalysisResult | null>(null);
  const [missingInfoAnswers, setMissingInfoAnswers] = useState<Record<string, string>>({});

  // Duplicate Check State
  const [duplicateAlert, setDuplicateAlert] = useState<DuplicateCheckResult | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTrackingId, setSubmittedTrackingId] = useState<string | null>(null);
  const [submittedIssueId, setSubmittedIssueId] = useState<string | null>(null);

  // Formal Letter Modal
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [formalLetterText, setFormalLetterText] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Ward Options around Erode
  const WARD_OPTIONS = [
    'Ward 1 - Central Market',
    'Ward 2 - Railway Junction',
    'Ward 3 - Collectorate & Veerappanchatiram',
    'Ward 4 - Surampatti',
    'Ward 5 - Thindal & Kongu College',
    'Ward 6 - Chithode & Bhavani Bypass',
  ];

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript + ' ';
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const combined = (baseTextRef.current + finalTranscript + interimTranscript).trim();
        setDescription(combined);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. You can type in any Indian language directly.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      baseTextRef.current = description ? description.trim() + ' ' : '';
      recognitionRef.current.lang = speechLocale;
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Demo Mode Autofill Presets
  const handleDemoPreset = (presetType: 'tamil-garbage' | 'tanglish-pothole' | 'hindi-light') => {
    if (presetType === 'tamil-garbage') {
      setTitle('மார்க்கெட் வாசலில் கடும் குப்பை துர்நாற்றம்');
      setDescription('பெருந்துறை பூ மார்க்கெட் வாசலில் கடந்த 2 நாட்களாக குப்பைகள் தேங்கி கிடக்கிறது. ஈக்கள் மற்றும் துர்நாற்றம் தாங்க முடியவில்லை. உடனே அகற்றவும்.');
      setCategory('Garbage Overflow');
      setLocationText('Near Flower Market, Brough Road, Erode');
      setLat(11.3432);
      setLng(77.7214);
      setWard('Ward 1 - Central Market');
      setImageBase64('/seed/garbage-before.svg');
      setPreferredReplyLanguage('Tamil');
    } else if (presetType === 'tanglish-pothole') {
      setTitle('Dangerous deep pothole near Clock Tower signal');
      setDescription('Clock tower signal kitta romba periya pothole irukku. Raathiri nerathula theriyama 2 bike slip aaguthu. School buses kooda kashtapadudhu. Please fix urgently!');
      setCategory('Pothole');
      setLocationText('Clock Tower Junction, Netaji Road, Erode');
      setLat(11.3440);
      setLng(77.7225);
      setWard('Ward 1 - Central Market');
      setImageBase64('/seed/pothole-before.svg');
      setPreferredReplyLanguage('Tamil');
    } else if (presetType === 'hindi-light') {
      setTitle('स्ट्रीट लाइट बंद होने से अंधेरा');
      setDescription('कलेक्टर ऑफिस के सामने मुख्य सड़क पर लगातार 4 खंभों की स्ट्रीट लाइट बंद पड़ी है। रात में पैदल चलने वाली महिलाओं और बुजुर्गों के लिए भारी खतरा है।');
      setCategory('Streetlight');
      setLocationText('Opposite District Collectorate, Perundurai Road, Erode');
      setLat(11.3522);
      setLng(77.7024);
      setWard('Ward 3 - Collectorate & Veerappanchatiram');
      setImageBase64('/seed/streetlight-before.svg');
      setPreferredReplyLanguage('Hindi');
    }
  };

  // Trigger Gemini Analysis Preview
  const handleAnalyzeWithAi = async () => {
    if (!description || description.trim().length < 5) {
      alert('Please describe the issue before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setStepperIndex(0);

    // Live Animated Stepper simulation
    const stepInterval = setInterval(() => {
      setStepperIndex((prev) => (prev < 3 ? prev + 1 : prev));
    }, 600);

    try {
      const res = await fetch('/api/issues/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          location: locationText,
          imageBase64: imageBase64?.startsWith('data:') ? imageBase64 : undefined,
        }),
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (data.analysis) {
        setAnalysisResult(data.analysis);
        if (data.analysis.suggestedTitle && !title) {
          setTitle(data.analysis.suggestedTitle);
        }
        setCurrentStep(2);
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error('Analysis error:', err);
      alert('Analysis completed with fallback rule engine.');
      setCurrentStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Final Grievance Submission
  const handleSubmitGrievance = async (force = false) => {
    setIsSubmitting(true);
    try {
      // Append missing info answers to description if provided
      let finalDescription = description;
      if (Object.keys(missingInfoAnswers).length > 0) {
        const answersStr = Object.entries(missingInfoAnswers)
          .map(([q, a]) => `[${q}: ${a}]`)
          .join(' ');
        finalDescription = `${description}\n\nAdditional Details: ${answersStr}`;
      }

      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || analysisResult?.suggestedTitle || 'Civic Grievance',
          description: finalDescription,
          category: category === 'Let AI decide' ? analysisResult?.category : category,
          locationText,
          lat,
          lng,
          ward,
          imageBase64,
          preferredReplyLanguage,
          forceCreate: force,
        }),
      });

      const data = await res.json();

      if (data.duplicateDetected && !force) {
        setDuplicateAlert(data.duplicate);
        setIsSubmitting(false);
        return;
      }

      if (data.success) {
        setSubmittedTrackingId(data.trackingId);
        setSubmittedIssueId(data.issue.id);
        setCurrentStep(3);

        // Confetti celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        alert(data.error || 'Failed to submit grievance');
      }
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch Formal Complaint Letter
  const handleOpenFormalLetter = async () => {
    if (!submittedIssueId) return;
    try {
      const res = await fetch(`/api/issues/${submittedIssueId}/complaint-letter`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.letter) {
        setFormalLetterText(data.letter);
        setIsLetterModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to generate letter:', err);
    }
  };

  const copyLetterToClipboard = () => {
    navigator.clipboard.writeText(formalLetterText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Top Header & Demo Presets Bar */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Citizen Smart Grievance
            </span>
            <span className="text-xs text-slate-400">Step {currentStep} of 3</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {currentStep === 1 && 'Report a Civic Issue'}
            {currentStep === 2 && 'Review Gemini AI Analysis'}
            {currentStep === 3 && 'Grievance Registered Successfully'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {currentStep === 1 && 'Describe in any Indian language or use voice dictation. Gemini handles classification.'}
            {currentStep === 2 && 'Verify priority score, assigned department, and impact reasoning before filing.'}
            {currentStep === 3 && 'Your grievance is entered into the municipal dispatch ledger with SLA tracking.'}
          </p>
        </div>

        {/* Demo Fast-Fill Buttons */}
        {currentStep === 1 && (
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Demo:
            </span>
            <button
              onClick={() => handleDemoPreset('tamil-garbage')}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-600 shadow-xs transition"
            >
              🇮🇳 Tamil Dump
            </button>
            <button
              onClick={() => handleDemoPreset('tanglish-pothole')}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-600 shadow-xs transition"
            >
              🏍️ Tanglish Pothole
            </button>
            <button
              onClick={() => handleDemoPreset('hindi-light')}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-600 shadow-xs transition"
            >
              💡 Hindi Light
            </button>
          </div>
        )}
      </div>

      {/* ================= STEP 1: SMART INPUT FORM ================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Description & Multilingual Voice Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{t('descriptionLabel')}</span>
                  <span className="text-red-500">*</span>
                </label>

                {/* Voice Dictation Controls */}
                <div className="flex items-center gap-2">
                  <select
                    value={speechLocale}
                    onChange={(e) => setSpeechLocale(e.target.value)}
                    className="text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-slate-700 dark:text-slate-300"
                  >
                    <option value="ta-IN">Tamil (தமிழ்)</option>
                    <option value="hi-IN">Hindi (हिन्दी)</option>
                    <option value="te-IN">Telugu (తెలుగు)</option>
                    <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                    <option value="ml-IN">Malayalam (മലയാളം)</option>
                    <option value="bn-IN">Bengali (বাংলা)</option>
                    <option value="mr-IN">Marathi (मराठी)</option>
                    <option value="en-IN">English (India)</option>
                  </select>

                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      isRecording
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-100'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isRecording ? t('listening') : t('voiceDictate')}</span>
                  </button>

                  {description && (
                    <button
                      type="button"
                      onClick={() => setDescription('')}
                      className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-500" />
                Gemini auto-detects language, transliteration (Tanglish/Hinglish), and creates an English audit translation.
              </p>
            </div>

            {/* Title & Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('titleLabel')} <span className="text-slate-400 font-normal">(Optional, AI can generate)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('titlePlaceholder')}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('categoryLabel')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Let AI decide">{t('categoryLetAiDecide')}</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Photo Upload & Preview */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('imageLabel')}
              </label>

              {imageBase64 ? (
                <div className="relative w-full sm:w-64 h-40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                  <img src={imageBase64} alt="Complaint preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageBase64(undefined)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    Image Attached for Gemini
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Camera className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {t('uploadPhotoPrompt')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG or SVG (Gemini cross-checks image severity)</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Location & Interactive Leaflet Map */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  <span>Pinpoint Grievance Spot on Map</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Ward:</span>
                  <select
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-800 dark:text-slate-200"
                  >
                    {WARD_OPTIONS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <input
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="Street address or nearby landmark"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />

              <LocationPickerMap
                lat={lat}
                lng={lng}
                onChange={(newLat, newLng, address) => {
                  setLat(newLat);
                  setLng(newLng);
                  if (address) setLocationText(address);
                }}
              />
            </div>
          </div>

          {/* Action Button & Live Stepper */}
          <div className="flex flex-col items-center gap-4">
            {isAnalyzing && (
              <div className="w-full bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900/60 rounded-2xl p-6 shadow-md text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-sky-600 font-bold text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Google Gemini Intelligence Pipeline Running...</span>
                </div>

                {/* Animated Stepper Steps */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-left">
                  {[
                    t('analyzingStepper1'),
                    t('analyzingStepper2'),
                    t('analyzingStepper3'),
                    t('analyzingStepper4'),
                  ].map((stepText, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        stepperIndex >= idx
                          ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                            stepperIndex >= idx
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-300 dark:bg-slate-700 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                          Step {idx + 1}
                        </span>
                      </div>
                      <p className="line-clamp-2">{stepText}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyzeWithAi}
              disabled={isAnalyzing || !description.trim()}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAnalyzing ? 'Analyzing with Gemini...' : t('analyzeWithAiBtn')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: AI REVIEW & CONFIRMATION ================= */}
      {currentStep === 2 && analysisResult && (
        <div className="space-y-6">
          {/* Duplicate Detected Warning Banner */}
          {duplicateAlert && (
            <div className="bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm sm:text-base">
                    Similar Issue Already Reported Nearby ({duplicateAlert.distanceMeters || 60}m away)
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {duplicateAlert.matchReason}
                  </p>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                    Existing Report ID: <span className="font-mono">{duplicateAlert.duplicateTrackingId}</span> &ldquo;{duplicateAlert.duplicateTitle}&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.push(`/issues/${duplicateAlert.duplicateId || duplicateAlert.duplicateTrackingId}`)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Upvote Existing Issue Instead (+Priority Boost)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitGrievance(true)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 text-xs font-semibold hover:bg-amber-100 transition"
                >
                  {isSubmitting ? 'Submitting...' : 'File as Separate Grievance Anyway'}
                </button>
              </div>
            </div>
          )}

          {/* AI Analysis Master Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black ${
                    analysisResult.priority === 'CRITICAL'
                      ? 'bg-red-500/10 text-red-600 border border-red-500/30'
                      : analysisResult.priority === 'HIGH'
                      ? 'bg-orange-500/10 text-orange-600 border border-orange-500/30'
                      : analysisResult.priority === 'MEDIUM'
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                  }`}
                >
                  <span className="text-xl leading-none">{analysisResult.priorityScore}</span>
                  <span className="text-[9px] uppercase tracking-tighter opacity-70">Impact</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                        analysisResult.priority === 'CRITICAL'
                          ? 'badge-critical'
                          : analysisResult.priority === 'HIGH'
                          ? 'badge-high'
                          : analysisResult.priority === 'MEDIUM'
                          ? 'badge-medium'
                          : 'badge-low'
                      }`}
                    >
                      {analysisResult.priority} PRIORITY
                    </span>

                    {/* AI Engine Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        analysisResult.isAiGenerated
                          ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300'
                      }`}
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      {analysisResult.isAiGenerated ? 'Gemini Analysed' : 'Basic rules (AI offline)'}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {title || analysisResult.suggestedTitle}
                  </h2>
                </div>
              </div>

              {/* Department & SLA badge */}
              <div className="flex flex-col sm:items-end">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Building2 className="w-4 h-4 text-sky-600" />
                  <span>{analysisResult.department}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>Category: {analysisResult.category}</span>
                </div>
              </div>
            </div>

            {/* Multilingual Translation Banner */}
            {analysisResult.detectedLanguage !== 'English' && (
              <div className="bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 rounded-xl p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                    <span>Translated from {analysisResult.detectedScript}</span>
                    {analysisResult.isRomanizedIndic && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-sky-100">
                        Transliterated
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Original: &ldquo;{description.slice(0, 30)}...&rdquo;</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 italic">
                  &ldquo;{analysisResult.englishTranslation}&rdquo;
                </p>
              </div>
            )}

            {/* Plain-Language Citizen Reasoning */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Why this priority &amp; department? (Plain Language)
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                {analysisResult.reasoning}
              </p>
            </div>

            {/* Priority Factor Breakdown */}
            {analysisResult.priorityFactors && analysisResult.priorityFactors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  AI Multi-Factor Risk Assessment
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {analysisResult.priorityFactors.map((f, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                        <span>{f.factor}</span>
                        <span className="text-sky-600 dark:text-sky-400 font-mono">{f.weight}%</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        {f.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image Observation */}
            {analysisResult.imageObservations && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Gemini Vision Cross-Check:</strong> {analysisResult.imageObservations}
                </span>
              </div>
            )}

            {/* Missing Info Prompt (Inline Q&A) */}
            {analysisResult.missingInfo && analysisResult.missingInfo.length > 0 && (
              <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Gemini noticed helpful details could improve dispatch speed:</span>
                </div>
                <div className="space-y-2">
                  {analysisResult.missingInfo.map((q, idx) => (
                    <div key={idx} className="space-y-1">
                      <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {q}
                      </label>
                      <input
                        type="text"
                        value={missingInfoAnswers[q] || ''}
                        onChange={(e) =>
                          setMissingInfoAnswers((prev) => ({ ...prev, [q]: e.target.value }))
                        }
                        placeholder="Provide details if known (optional)"
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirmation Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back &amp; Edit Details</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmitGrievance(duplicateAlert ? true : false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Registering Grievance...'
                  : duplicateAlert
                  ? 'Submit Anyway as New Grievance'
                  : t('submitGrievanceBtn')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: SUCCESS & FORMAL COMPLAINT ================= */}
      {currentStep === 3 && submittedTrackingId && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 shadow-lg text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Grievance Officially Filed
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {submittedTrackingId}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Your grievance has been routed to <strong>{analysisResult?.department}</strong>. A field crew has been notified and SLA timer is active.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={handleOpenFormalLetter}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold shadow-md transition"
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span>{t('formalComplaintBtn')}</span>
            </button>

            <button
              onClick={() => router.push(`/issues/${submittedIssueId}`)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition"
            >
              <span>View Audit Timeline &amp; Track Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setCurrentStep(1);
                setTitle('');
                setDescription('');
                setImageBase64(undefined);
                setAnalysisResult(null);
                setDuplicateAlert(null);
              }}
              className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              File Another Report
            </button>
          </div>
        </div>
      )}

      {/* ================= FORMAL COMPLAINT MODAL ================= */}
      {isLetterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Official Formal Grievance Letter
                </h3>
              </div>
              <button
                onClick={() => setIsLetterModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {formalLetterText}
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <button
                onClick={copyLetterToClipboard}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-sm"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Letter'}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <span>{t('downloadPdf')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

