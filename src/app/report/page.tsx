'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Mic,
  MicOff,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ArrowLeft,
  FileText,
  Copy,
  Check,
  Building,
  ThumbsUp,
  RefreshCw,
  HelpCircle,
  FileCheck2,
  Printer,
  ChevronDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useI18n } from '@/lib/i18n';
import { GeminiAnalysisResult, DuplicateCheckResult } from '@/lib/types';
import { CATEGORIES } from '@/lib/gemini';
import { validateAndCompressImage } from '@/lib/imageCompression';

// Dynamically import Leaflet Map component with SSR disabled
const LocationPickerMap = dynamic(
  () => import('@/components/Map/LocationPickerMap'),
  { ssr: false, loading: () => <div className="h-[280px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" /> }
);

export default function ReportPage() {
  const router = useRouter();
  const { language, t, translateCategory, translateDepartment, translateStatus, translatePriority } = useI18n();

  // Wizard Step: 1 = Details, 2 = AI Triage Review, 3 = Acknowledgement
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

  // Image Upload Handler with client-side compression (max 1280px, ~200KB) and 5MB validation
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await validateAndCompressImage(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.75,
      });
      setImageBase64(compressedDataUrl);
    } catch (err: any) {
      console.error('Image compression error:', err);
      alert(err.message || 'Image upload failed. Please ensure the image is under 5MB.');
    }
  };

  // Preset incident loader
  const handleLoadSample = (sampleType: string) => {
    if (sampleType === 'tamil-garbage') {
      setTitle('மார்க்கெட் வாசலில் கடும் குப்பை துர்நாற்றம்');
      setDescription('பெருந்துறை பூ மார்க்கெட் வாசலில் கடந்த 2 நாட்களாக குப்பைகள் தேங்கி கிடக்கிறது. ஈக்கள் மற்றும் துர்நாற்றம் தாங்க முடியவில்லை. உடனே அகற்றவும்.');
      setCategory('Garbage Overflow');
      setLocationText('Near Flower Market, Brough Road, Erode');
      setLat(11.3432);
      setLng(77.7214);
      setWard('Ward 1 - Central Market');
      setImageBase64('/seed/garbage-before.svg');
      setPreferredReplyLanguage('Tamil');
    } else if (sampleType === 'tanglish-pothole') {
      setTitle('Dangerous deep pothole near Clock Tower signal');
      setDescription('Clock tower signal kitta romba periya pothole irukku. Raathiri nerathula theriyama 2 bike slip aaguthu. School buses kooda kashtapadudhu. Please fix urgently!');
      setCategory('Pothole');
      setLocationText('Clock Tower Junction, Netaji Road, Erode');
      setLat(11.3440);
      setLng(77.7225);
      setWard('Ward 1 - Central Market');
      setImageBase64('/seed/pothole-before.svg');
      setPreferredReplyLanguage('Tamil');
    } else if (sampleType === 'hindi-light') {
      setTitle('स्ट्रीट लाइट बंद होने से अंधेரா');
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

  // Analyze Issue with Gemini AI
  const handleAnalyzeWithAi = async () => {
    if (!description.trim()) {
      alert('Please enter a description of the issue.');
      return;
    }

    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/issues/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          location: locationText,
          imageBase64: imageBase64?.startsWith('data:') ? imageBase64 : undefined,
          lang: language,
        }),
      });

      const data = await res.json();

      if (data.analysis) {
        setAnalysisResult(data.analysis);
        if (data.analysis.suggestedTitle && !title) {
          setTitle(data.analysis.suggestedTitle);
        }
        setCurrentStep(2);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      alert('Analysis completed with municipal rule fallback.');
      setCurrentStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Final Grievance Submission
  const handleSubmitGrievance = async (force = false) => {
    setIsSubmitting(true);
    try {
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

        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Institutional Breadcrumb Progress Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Municipal Form CGRS-1 • Erode City Corporation
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {currentStep === 1 && 'Lodge a Civic Infrastructure Grievance'}
              {currentStep === 2 && 'Review Automated Triage & SLA Routing'}
              {currentStep === 3 && 'Grievance Registered Successfully'}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {currentStep === 1 && 'Provide details in any Indian language or voice dictation. Location and photo evidence help expedite field dispatch.'}
              {currentStep === 2 && 'Verify automated department assignment, risk assessment, and statutory resolution SLA.'}
              {currentStep === 3 && 'An official tracking identifier has been generated. Use this number to track resolution progress.'}
            </p>
          </div>

          {/* Sample Incident Pre-loader (Clean Dropdown) */}
          {currentStep === 1 && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Load Sample:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) handleLoadSample(e.target.value);
                }}
                defaultValue=""
                className="text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-200"
              >
                <option value="" disabled>Select test incident...</option>
                <option value="tamil-garbage">Garbage Overflow (Tamil)</option>
                <option value="tanglish-pothole">Dangerous Pothole (Tanglish)</option>
                <option value="hindi-light">Streetlight Defect (Hindi)</option>
              </select>
            </div>
          )}
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <div className={`h-1.5 rounded-full ${currentStep >= 1 ? 'bg-blue-700' : 'bg-slate-200 dark:bg-slate-800'}`} />
          <div className={`h-1.5 rounded-full ${currentStep >= 2 ? 'bg-blue-700' : 'bg-slate-200 dark:bg-slate-800'}`} />
          <div className={`h-1.5 rounded-full ${currentStep >= 3 ? 'bg-blue-700' : 'bg-slate-200 dark:bg-slate-800'}`} />
        </div>
      </div>

      {/* ================= STEP 1: GRIEVANCE FORM ================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 sm:p-6 space-y-5">
            {/* Description & Multilingual Voice Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-900 dark:text-white">
                  Description of Issue <span className="text-rose-600">*</span>
                </label>

                {/* Voice Dictation Controls */}
                <div className="flex items-center gap-2">
                  <select
                    value={speechLocale}
                    onChange={(e) => setSpeechLocale(e.target.value)}
                    className="text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-700 dark:text-slate-300"
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
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition ${
                      isRecording
                        ? 'bg-rose-600 text-white border-rose-700'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />}
                    <span>{isRecording ? 'Listening...' : 'Voice Dictate'}</span>
                  </button>

                  {description && (
                    <button
                      type="button"
                      onClick={() => setDescription('')}
                      className="text-[11px] text-slate-400 hover:text-slate-600 px-1"
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
                placeholder="Describe what is damaged, exact street landmarks, how long it has been broken, or public danger..."
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Accepts complaints in English, Tamil, Hindi, or any Indian regional language. Transliterated text (Tanglish, Hinglish) is automatically recognized.
              </p>
            </div>

            {/* Title & Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Short Title <span className="text-slate-400 font-normal">(Optional, AI will summarize if empty)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Deep pothole opposite Clock Tower signal"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Grievance Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                >
                  <option value="Let AI decide">Auto-Detect via AI (Recommended)</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {translateCategory(cat)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Photo Upload & Preview */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Photographic Evidence <span className="text-slate-400 font-normal">(Optional)</span>
              </label>

              {imageBase64 ? (
                <div className="relative w-full sm:w-64 h-36 rounded border border-slate-300 dark:border-slate-700 overflow-hidden">
                  <img src={imageBase64} alt="Evidence" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageBase64(undefined)}
                    className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[11px] hover:bg-slate-900"
                  >
                    Remove
                  </button>
                  <div className="absolute bottom-1.5 left-1.5 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded">
                    Photo Attached
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 border border-dashed border-slate-300 dark:border-slate-700 rounded cursor-pointer bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  <div className="flex flex-col items-center justify-center">
                    <Camera className="w-6 h-6 text-slate-400 mb-1" />
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Click to upload grievance photo
                    </p>
                    <p className="text-[10px] text-slate-400">JPG, PNG or SVG. Used for severity assessment and resolution verification.</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Location & Map Pinpoint */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>Geographic Location &amp; Ward Assignment</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Corporation Ward:</span>
                  <select
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-800 dark:text-slate-200"
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
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
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

          {/* Action Button */}
          <div className="flex flex-col items-center gap-3">
            {isAnalyzing && (
              <div className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-400 font-semibold text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing Automated Triage Pipeline...</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Parsing complaint language, calculating multi-factor safety impact score, and mapping to responsible department SLA.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyzeWithAi}
              disabled={isAnalyzing || !description.trim()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xs"
            >
              <span>{isAnalyzing ? 'Processing Triage...' : 'Proceed to Review & Triage'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: REVIEW & CONFIRMATION ================= */}
      {currentStep === 2 && analysisResult && (
        <div className="space-y-5">
          {/* Duplicate Incident Warning */}
          {duplicateAlert && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-md p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                    Similar Grievance Already Reported Nearby ({duplicateAlert.distanceMeters || 60}m away)
                  </h3>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    {duplicateAlert.matchReason}
                  </p>
                  <p className="text-xs font-mono text-amber-900 dark:text-amber-200">
                    Existing ID: <strong>{duplicateAlert.duplicateTrackingId}</strong> — &ldquo;{duplicateAlert.duplicateTitle}&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => router.push(`/issues/${duplicateAlert.duplicateId || duplicateAlert.duplicateTrackingId}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold transition"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Upvote Existing Grievance (+Priority Weight)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitGrievance(true)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded border border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 text-xs font-medium hover:bg-amber-50 transition"
                >
                  {isSubmitting ? 'Registering...' : 'File as Separate Grievance Anyway'}
                </button>
              </div>
            </div>
          )}

          {/* Triage Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center font-mono">
                  <span className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                    {analysisResult.priorityScore}
                  </span>
                  <span className="text-[9px] uppercase tracking-tighter text-slate-500">Score</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        analysisResult.priority === 'CRITICAL'
                          ? 'chip-critical'
                          : analysisResult.priority === 'HIGH'
                          ? 'chip-high'
                          : analysisResult.priority === 'MEDIUM'
                          ? 'chip-medium'
                          : 'chip-low'
                      }`}
                    >
                      {translatePriority(analysisResult.priority)} PRIORITY
                    </span>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        analysisResult.isAiGenerated
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                          : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {analysisResult.isAiGenerated ? 'AI analysed (Gemini)' : 'Basic rules (AI unavailable)'}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {title || analysisResult.suggestedTitle}
                  </h2>
                </div>
              </div>

              {/* Department & SLA badge */}
              <div className="flex flex-col sm:items-end text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <Building className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>{translateDepartment(analysisResult.department)}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>Category: {translateCategory(analysisResult.category)}</span>
                </div>
              </div>
            </div>

            {/* Multilingual Translation Audit */}
            {analysisResult.detectedLanguage !== 'English' && (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-3 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Source: {analysisResult.detectedScript} {analysisResult.isRomanizedIndic && '(Transliterated)'}
                  </span>
                  <span className="text-[10px] font-mono">Original: &ldquo;{description.slice(0, 30)}...&rdquo;</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                  &ldquo;{analysisResult.englishTranslation}&rdquo;
                </p>
              </div>
            )}

            {/* Triage Reasoning */}
            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Official Routing &amp; Risk Justification
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded border border-slate-200 dark:border-slate-700 leading-relaxed">
                {analysisResult.reasoning}
              </p>
            </div>

            {/* Priority Factor Breakdown Table */}
            {analysisResult.priorityFactors && analysisResult.priorityFactors.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Risk Factors Assessed
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {analysisResult.priorityFactors.map((f, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                        <span>{f.factor}</span>
                        <span className="font-mono text-slate-600 dark:text-slate-400">{f.weight}%</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {f.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vision Observation */}
            {analysisResult.imageObservations && (
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-2.5 rounded">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Photographic Cross-Check:</strong> {analysisResult.imageObservations}
                </span>
              </div>
            )}

            {/* Missing Info Prompt */}
            {analysisResult.missingInfo && analysisResult.missingInfo.length > 0 && (
              <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
                  <HelpCircle className="w-4 h-4 text-amber-700" />
                  <span>Optional Details to Accelerate Field Resolution:</span>
                </div>
                <div className="space-y-1.5">
                  {analysisResult.missingInfo.map((q, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <label className="text-[11px] text-slate-700 dark:text-slate-300">
                        {q}
                      </label>
                      <input
                        type="text"
                        value={missingInfoAnswers[q] || ''}
                        onChange={(e) =>
                          setMissingInfoAnswers((prev) => ({ ...prev, [q]: e.target.value }))
                        }
                        placeholder="Provide landmark or details if known"
                        className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirmation Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1 px-4 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Modify Details</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmitGrievance(duplicateAlert ? true : false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Submitting to Municipal Ledger...'
                  : duplicateAlert
                  ? 'Submit Anyway as New Grievance'
                  : 'Confirm & Register Grievance'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: OFFICIAL ACKNOWLEDGEMENT ================= */}
      {currentStep === 3 && submittedTrackingId && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-10 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Grievance Officially Registered
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">
              {submittedTrackingId}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Assigned to <strong>{analysisResult?.department}</strong>. Field inspection SLA timer is active under the Citizen Charter.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleOpenFormalLetter}
              className="flex items-center gap-1.5 px-4 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 text-xs font-semibold transition"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Generate Formal Petition Letter</span>
            </button>

            <button
              onClick={() => router.push(`/issues/${submittedIssueId}`)}
              className="flex items-center gap-1.5 px-5 py-2 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition"
            >
              <span>View Audit Timeline</span>
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
              className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-medium"
            >
              File Another Grievance
            </button>
          </div>
        </div>
      )}

      {/* ================= FORMAL COMPLAINT MODAL ================= */}
      {isLetterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-md max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Official Grievance Memorandum
                </h3>
              </div>
              <button
                onClick={() => setIsLetterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm px-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 rounded border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {formalLetterText}
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 mt-3">
              <button
                onClick={copyLetterToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition"
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied' : 'Copy Memorandum'}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
