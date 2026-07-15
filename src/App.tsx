import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Trash2,
  Copy,
  Check,
  History,
  ArrowRight,
  Info,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  ChevronRight,
  CheckCircle,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { Correction, CheckResult, HistoryItem, CorrectionCategory } from "./types.ts";

const MAX_CHAR_LIMIT = 1500;

const SAMPLES = [
  {
    title: "띄어쓰기 오류",
    text: "오늘날씨가정말좋네요.친구랑같이갈래요.",
  },
  {
    title: "맞춤법 오류",
    text: "어제 빌린 책을 다 읽었대요. 감기가 빨리 낳아서 다행이에요. 요새 무난한 가방이 유행이더라고요.",
  },
  {
    title: "문법 및 문체",
    text: "그는 회의에 참여하는 것을 바랬다. 결제를 어제 했었어야 됬는데 깜빡했다. 왠일인지 기분이 설레인다.",
  },
];

const KOREAN_TIPS = [
  {
    category: "대 vs 데",
    title: "~대요 vs ~데?",
    description: "'~대'는 남이 말한 내용을 전달할 때, '~데'는 자신이 겪은 직접적인 과거 경험을 회상해 설명할 때 씁니다.",
  },
  {
    category: "율 vs 률",
    title: "백분율 vs 합격률",
    description: "모음이나 'ㄴ' 받침으로 끝나는 말 뒤에는 '율/열'을 쓰고, 그 외의 받침 뒤에는 '률/렬'을 사용합니다.",
  },
  {
    category: "로서 vs 로써",
    title: "교사로서 vs 대화로써",
    description: "'로서'는 지위나 신분, 자격을 나타낼 때 쓰고, '로써'는 도구, 수단, 재료를 나타낼 때 씁니다.",
  },
  {
    category: "어떻게 vs 어떡해",
    title: "어떻게 하지 vs 나 어떡해",
    description: "'어떻게'는 '어떠하다'의 부사형으로 뒤에 서술어가 오고, '어떡해'는 '어떻게 해'가 줄어든 말로 그 자체로 완결된 구절에 쓰입니다.",
  },
  {
    category: "왠지 vs 웬지",
    title: "왠지 설레인다 vs 웬 떡이야",
    description: "'왠지'는 '왜인지'의 줄임말로 오직 '왠지'로만 쓰이며, 그 외의 '웬 일', '웬 떡' 등은 모두 '웬'으로 적습니다.",
  },
  {
    category: "안 vs 않",
    title: "안 가다 vs 가지 않다",
    description: "'안'은 '아니'의 줄임말로 단어 앞에 쓰이고, '않'은 '아니하'의 줄임말로 '~지 않다' 형태로 뒤에 쓰입니다.",
  },
  {
    category: "던지 vs 든지",
    title: "얼마나 춥던지 vs 하든지 말든지",
    description: "'던지'는 지난 일을 회상할 때 쓰며, '든지'는 대상들 중 어느 것이든 선택될 수 있음을 나타낼 때 씁니다.",
  },
  {
    category: "다르다 vs 틀리다",
    title: "모양이 다르다 vs 답이 틀리다",
    description: "'다르다'는 비교 대상이 같지 않음을 뜻하고, '틀리다'는 셈이나 사실이 어긋나거나 올바르지 않을 때 씁니다.",
  },
  {
    category: "봬요 vs 봐요",
    title: "내일 봬요 vs 내일 봐요",
    description: "'봬요'는 '뵈어요'의 줄임말이므로 '봬요'가 맞습니다. '봬' 자리에 '해', '뵈' 자리에 '하'를 넣어보면 구분이 쉽습니다.",
  },
  {
    category: "맞히다 vs 맞추다",
    title: "퀴즈를 맞히다 vs 답안을 맞추다",
    description: "'맞히다'는 적중하거나 옳은 답을 낼 때(정답을 맞히다), '맞추다'는 둘 이상의 대상을 비교하거나 조정할 때 씁니다.",
  },
  {
    category: "바램 vs 바람",
    title: "색이 바램 vs 너의 바람",
    description: "소망이나 기대를 나타내는 동사는 '바라다'이므로 명사형은 '바람'이 맞습니다. '바램'은 색이 변하는 것을 뜻합니다.",
  },
  {
    category: "무난하다 vs 문안하다",
    title: "무난한 성격 vs 웃어른께 문안",
    description: "별다른 어려움이나 흠이 없다는 뜻은 '무난(無難)하다'입니다. '문안(問安)하다'는 웃어른께 안부를 묻는 인사입니다.",
  }
];

export default function App() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"result" | "cards">("result");
  const [highlightedCorrection, setHighlightedCorrection] = useState<Correction | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [randomTips, setRandomTips] = useState<typeof KOREAN_TIPS>([
    {
      category: "대 vs 데",
      title: "~대요 vs ~데?",
      description: "'~대'는 남이 말한 내용을 전달할 때, '~데'는 자신이 겪은 직접적인 과거 경험을 회상해 설명할 때 씁니다.",
    },
    {
      category: "율 vs 률",
      title: "백분율 vs 합격률",
      description: "모음이나 'ㄴ' 받침으로 끝나는 말 뒤에는 '율/열'을 쓰고, 그 외의 받침 뒤에는 '률/렬'을 사용합니다.",
    },
  ]);

  const correctionListRef = useRef<HTMLDivElement>(null);

  // Load input and history from localStorage on mount
  useEffect(() => {
    const savedInput = localStorage.getItem("spelling_check_input");
    if (savedInput) {
      setInputText(savedInput);
    }

    const saved = localStorage.getItem("spelling_check_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    // Select 2 unique random tips from KOREAN_TIPS
    const shuffled = [...KOREAN_TIPS].sort(() => 0.5 - Math.random());
    setRandomTips(shuffled.slice(0, 2));
  }, []);

  // Auto-save input text whenever it changes
  useEffect(() => {
    if (inputText) {
      localStorage.setItem("spelling_check_input", inputText);
    } else {
      localStorage.removeItem("spelling_check_input");
    }
  }, [inputText]);

  // Save history to localStorage
  const saveToHistory = (item: HistoryItem) => {
    const updated = [item, ...history.filter((h) => h.originalText !== item.originalText)].slice(0, 20); // Keep last 20
    setHistory(updated);
    localStorage.setItem("spelling_check_history", JSON.stringify(updated));
  };

  const handleReset = () => {
    setInputText("");
    setResult(null);
    setError(null);
    setHighlightedCorrection(null);
    localStorage.removeItem("spelling_check_input");
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("spelling_check_history");
  };

  const deleteHistoryItem = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    localStorage.setItem("spelling_check_history", JSON.stringify(updated));
  };

  // Loading animation step cycle
  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 800);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleCheck = async (textToCheck = inputText) => {
    const trimmed = textToCheck.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setHighlightedCorrection(null);
    setActiveTab("result");

    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!response.ok) {
        let errorMsg = "서버 응답 오류가 발생했습니다.";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
            if (errData.details) {
              errorMsg += ` (${errData.details})`;
            }
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const data: CheckResult = await response.json();
      setResult(data);

      // Save to history
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        originalText: trimmed,
        correctedText: data.correctedText,
        corrections: data.corrections,
      };
      saveToHistory(historyItem);
    } catch (err: any) {
      setError(err.message || "맞춤법 검사 중 네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setInputText(item.originalText);
    setResult({
      correctedText: item.correctedText,
      corrections: item.corrections,
    });
    setError(null);
    setHighlightedCorrection(null);
    setActiveTab("result");
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy text", e);
    }
  };

  // Filter corrections by category
  const filteredCorrections = result?.corrections.filter((c) => {
    if (selectedCategory === "all") return true;
    return c.category === selectedCategory;
  }) || [];

  const getCategoryColor = (cat: CorrectionCategory, type: "badge" | "border" | "text" | "bg" | "highlight") => {
    switch (cat) {
      case "spacing":
        if (type === "badge") return "bg-blue-100 text-blue-800";
        if (type === "border") return "border-blue-200";
        if (type === "text") return "text-blue-600";
        if (type === "bg") return "bg-blue-50/50";
        return "bg-blue-100/80 text-blue-900 border-b-2 border-blue-400 hover:bg-blue-200 cursor-pointer";
      case "spelling":
        if (type === "badge") return "bg-rose-100 text-rose-800";
        if (type === "border") return "border-rose-200";
        if (type === "text") return "text-rose-600";
        if (type === "bg") return "bg-rose-50/50";
        return "bg-rose-100/80 text-rose-900 border-b-2 border-rose-400 hover:bg-rose-200 cursor-pointer";
      case "grammar":
        if (type === "badge") return "bg-amber-100 text-amber-800";
        if (type === "border") return "border-amber-200";
        if (type === "text") return "text-amber-600";
        if (type === "bg") return "bg-amber-50/50";
        return "bg-amber-100/80 text-amber-900 border-b-2 border-amber-400 hover:bg-amber-200 cursor-pointer";
      case "style":
        if (type === "badge") return "bg-emerald-100 text-emerald-800";
        if (type === "border") return "border-emerald-200";
        if (type === "text") return "text-emerald-600";
        if (type === "bg") return "bg-emerald-50/50";
        return "bg-emerald-100/80 text-emerald-900 border-b-2 border-emerald-400 hover:bg-emerald-200 cursor-pointer";
      default:
        if (type === "badge") return "bg-slate-100 text-slate-800";
        if (type === "border") return "border-slate-200";
        if (type === "text") return "text-slate-600";
        if (type === "bg") return "bg-slate-50";
        return "bg-slate-100 text-slate-900";
    }
  };

  const getCategoryLabel = (cat: CorrectionCategory) => {
    switch (cat) {
      case "spacing":
        return "띄어쓰기";
      case "spelling":
        return "맞춤법";
      case "grammar":
        return "표준어/문법";
      case "style":
        return "문체/표현";
      default:
        return cat;
    }
  };

  // Helper to highlight original text with clickable spans
  const renderOriginalHighlighted = (text: string, corrections: Correction[]) => {
    if (!corrections || corrections.length === 0) return text;

    // Start with a single plain text segment
    let segments: Array<{ text: string; correction?: Correction }> = [{ text }];

    // Sort corrections descending by length of the original text to prevent sub-string matching bugs
    const sorted = [...corrections].sort((a, b) => b.original.length - a.original.length);

    sorted.forEach((corr) => {
      const nextSegments: Array<{ text: string; correction?: Correction }> = [];
      
      segments.forEach((seg) => {
        // If this segment is already a matched correction, keep it as is
        if (seg.correction) {
          nextSegments.push(seg);
          return;
        }

        // Search for corr.original in plain text segment
        let remainingText = seg.text;
        const originalText = corr.original;
        
        if (!originalText) {
          nextSegments.push(seg);
          return;
        }

        let index = remainingText.indexOf(originalText);
        while (index !== -1) {
          if (index > 0) {
            nextSegments.push({ text: remainingText.substring(0, index) });
          }
          nextSegments.push({ text: originalText, correction: corr });
          remainingText = remainingText.substring(index + originalText.length);
          index = remainingText.indexOf(originalText);
        }

        if (remainingText.length > 0) {
          nextSegments.push({ text: remainingText });
        }
      });
      
      segments = nextSegments;
    });

    return segments.map((seg, index) => {
      if (seg.correction) {
        const corr = seg.correction;
        const isHighlighted = highlightedCorrection && highlightedCorrection.original === corr.original;
        return (
          <span
            key={index}
            onClick={() => {
              setHighlightedCorrection(corr);
              setActiveTab("cards");
              // Scroll to card index
              setTimeout(() => {
                const element = document.getElementById(`corr-${corr.original}`);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }, 100);
            }}
            className={`transition-all duration-200 border-b-2 rounded-sm px-1 py-0.5 mx-0.5 font-medium inline-block ${
              isHighlighted
                ? "ring-2 ring-offset-2 ring-emerald-500 scale-105"
                : ""
            } ${getCategoryColor(corr.category, "highlight")}`}
            title={`${corr.corrected} (${getCategoryLabel(corr.category)})`}
          >
            {seg.text}
          </span>
        );
      }
      return <span key={index}>{seg.text}</span>;
    });
  };

  const renderCorrectedHighlighted = (text: string, corrections: Correction[]) => {
    if (!corrections || corrections.length === 0) return text;

    let segments: Array<{ text: string; isCorrected?: boolean }> = [{ text }];

    const sorted = [...corrections].sort((a, b) => b.corrected.length - a.corrected.length);

    sorted.forEach((corr) => {
      const nextSegments: Array<{ text: string; isCorrected?: boolean }> = [];

      segments.forEach((seg) => {
        if (seg.isCorrected) {
          nextSegments.push(seg);
          return;
        }

        let remainingText = seg.text;
        const correctedText = corr.corrected;

        if (!correctedText) {
          nextSegments.push(seg);
          return;
        }

        let index = remainingText.indexOf(correctedText);
        while (index !== -1) {
          if (index > 0) {
            nextSegments.push({ text: remainingText.substring(0, index) });
          }
          nextSegments.push({ text: correctedText, isCorrected: true });
          remainingText = remainingText.substring(index + correctedText.length);
          index = remainingText.indexOf(correctedText);
        }

        if (remainingText.length > 0) {
          nextSegments.push({ text: remainingText });
        }
      });

      segments = nextSegments;
    });

    return segments.map((seg, idx) => {
      if (seg.isCorrected) {
        return (
          <span
            key={idx}
            className={`font-semibold px-1 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border-b-2 border-emerald-400`}
          >
            {seg.text}
          </span>
        );
      }
      return <span key={idx}>{seg.text}</span>;
    });
  };

  const loadingTips = [
    "한글 맞춤법 규정을 꼼꼼하게 대조하는 중입니다...",
    "문장의 전후 맥락을 파악하여 최적의 단어를 탐색 중입니다...",
    "더욱 자연스럽고 명확한 표준어 표현을 정밀 조정하고 있습니다...",
    "띄어쓰기와 문장 부호의 정밀 검사를 진행하고 있습니다...",
  ];

  return (
    <div id="app-root" className="min-h-screen bg-neutral-50 text-neutral-800 flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <header id="app-header" className="border-b border-neutral-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-md shadow-emerald-600/15">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
                한국어 맞춤법 검사기
              </h1>
            </div>
          </div>
          <div className="text-xs font-mono text-neutral-400 hidden sm:block">
            최대 {MAX_CHAR_LIMIT.toLocaleString()}자
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Text Inputs & Templates */}
        <section id="input-section" className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs flex flex-col overflow-hidden h-[480px]">
            {/* Toolbar */}
            <div className="bg-neutral-50/80 px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                원문 입력
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleReset}
                  disabled={!inputText}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                  title="지우기"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Input Textarea */}
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHAR_LIMIT))}
                placeholder="검사하고 싶은 한국어 문장을 여기에 입력하거나 붙여넣으세요. 맞춤법, 띄어쓰기, 문맥 오류를 완벽하게 고쳐 드립니다."
                className="w-full h-full p-4 lg:p-5 resize-none border-0 focus:ring-0 text-base text-neutral-800 placeholder-neutral-400 leading-relaxed outline-none"
              />
            </div>

            {/* Footer Limit Indicator & Submit */}
            <div className="px-4 py-3 bg-white border-t border-neutral-200 flex items-center justify-between">
              {/* Character Limit indicator */}
              <div className="flex items-center space-x-3">
                <div className="text-xs font-semibold text-neutral-500">
                  <span className={inputText.length >= MAX_CHAR_LIMIT ? "text-rose-600" : "text-neutral-700"}>
                    {inputText.length}
                  </span>{" "}
                  / {MAX_CHAR_LIMIT}자
                </div>
                <div className="w-24 bg-neutral-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className={`h-full transition-all duration-300 ${
                      inputText.length > MAX_CHAR_LIMIT * 0.9 ? "bg-rose-500" : "bg-emerald-600"
                    }`}
                    style={{ width: `${(inputText.length / MAX_CHAR_LIMIT) * 100}%` }}
                  />
                </div>
              </div>

              {/* Action trigger button */}
              <button
                onClick={() => handleCheck()}
                disabled={loading || !inputText.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-all duration-150 flex items-center space-x-2 shadow-sm active:scale-95 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>분석 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>맞춤법 검사하기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Right column: Correction Panel / Loading State / Welcome */}
        <section id="output-section" className="lg:col-span-5 flex flex-col h-[576px] lg:h-auto">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs flex flex-col h-full overflow-hidden">
            {/* STATE 1: LOADING SCREEN */}
            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white transition-opacity duration-300">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
                  <Sparkles className="w-6 h-6 text-emerald-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-2">원문을 정밀 진단하는 중</h3>
                <div className="h-10">
                  <p className="text-sm text-neutral-500 animate-pulse duration-1000">
                    {loadingTips[loadingStep]}
                  </p>
                </div>
              </div>
            )}

            {/* STATE 2: ERROR STATE */}
            {!loading && error && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white">
                <div className="bg-rose-100 p-3 rounded-full text-rose-600 mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-2">분석에 실패하였습니다</h3>
                <p className="text-sm text-neutral-500 max-w-sm mb-6 leading-relaxed">{error}</p>
                <button
                  onClick={() => handleCheck()}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  다시 시도하기
                </button>
              </div>
            )}

            {/* STATE 3: WELCOME PANEL (No Result) */}
            {!loading && !error && !result && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl mb-5 shadow-xs">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-2">한국어 맞춤법 검사기 준비 완료</h3>
                <p className="text-xs text-neutral-500 max-w-xs mb-6 leading-relaxed">
                  왼쪽 입력창에 맞춤법 검사를 원하는 문장을 입력하고 <strong className="text-emerald-700 font-bold">'맞춤법 검사하기'</strong> 버튼을 눌러주세요.
                </p>
                <div className="w-full max-w-xs bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-left">
                  <h4 className="text-[11px] font-bold text-neutral-700 mb-2.5 flex items-center gap-1">
                    <span>💡 스마트 주요 기능</span>
                  </h4>
                  <ul className="text-[11px] text-neutral-500 space-y-2">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>인공지능(Gemini) 기반의 고정밀 문맥 분석 교정</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>맞춤법, 띄어쓰기, 문법, 자연스러운 표현 및 문체 정밀 튜닝</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>직관적이고 상세한 오류 원인 설명 제공</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>입력 내용 실시간 자동 저장 및 최근 기록 로컬 보관</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* STATE 4: SUCCESS RESULTS */}
            {!loading && !error && result && (
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {/* Results Tabs Navigation */}
                <div className="bg-neutral-50 border-b border-neutral-200 flex px-2 py-1.5 items-center justify-between">
                  <div className="flex space-x-1.5">
                    <button
                      onClick={() => setActiveTab("result")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === "result"
                          ? "bg-white text-neutral-900 shadow-xs border border-neutral-200"
                          : "text-neutral-500 hover:text-neutral-800"
                      }`}
                    >
                      교정 결과 비교
                    </button>
                    <button
                      onClick={() => setActiveTab("cards")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                        activeTab === "cards"
                          ? "bg-white text-neutral-900 shadow-xs border border-neutral-200"
                          : "text-neutral-500 hover:text-neutral-800"
                      }`}
                    >
                      <span>교정 상세 정보</span>
                      {result.corrections.length > 0 && (
                        <span className="bg-neutral-200 text-neutral-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                          {result.corrections.length}
                        </span>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => handleCopy(result.correctedText)}
                    className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-emerald-700 transition-colors flex items-center space-x-1 text-xs font-bold cursor-pointer"
                    title="교정 결과 복사"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">복사됨!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>올바른 문장 복사</span>
                      </>
                    )}
                  </button>
                </div>

                {/* TAB 1: RESULT COMPARISON VIEW */}
                {activeTab === "result" && (
                  <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
                    {/* Original Highlighting */}
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-bold text-neutral-400">교정 전 원문 (비교)</span>
                      <div className="p-3.5 bg-neutral-50/50 rounded-xl border border-neutral-200 text-sm leading-relaxed whitespace-pre-wrap select-text">
                        {result.corrections.length > 0 ? (
                          renderOriginalHighlighted(inputText, result.corrections)
                        ) : (
                          <span className="text-neutral-500 italic">교정할 오류가 발견되지 않은 깨끗한 문장입니다.</span>
                        )}
                      </div>
                    </div>

                    {/* Corrected Highlighting */}
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-bold text-emerald-600">최종 교정본</span>
                      <div className="p-4 bg-emerald-50/10 rounded-xl border border-emerald-100 text-sm font-medium leading-relaxed whitespace-pre-wrap select-text">
                        {result.corrections.length > 0 ? (
                          renderCorrectedHighlighted(result.correctedText, result.corrections)
                        ) : (
                          <span>{inputText}</span>
                        )}
                      </div>
                    </div>

                    {/* Brief statistics */}
                    {result.corrections.length > 0 ? (
                      <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                        <div className="flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-neutral-400" />
                          <span>위 원문에서 형광펜으로 된 단어를 누르면 교정 이유를 확인할 수 있습니다.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/30 text-emerald-800 rounded-xl p-4 border border-emerald-100 flex items-center space-x-3 text-xs">
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold">아주 훌륭한 문장입니다!</p>
                          <p className="text-emerald-700/80 mt-0.5">맞춤법과 띄어쓰기가 완벽하게 지켜졌습니다.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: DETAILED BREAKDOWN LIST */}
                {activeTab === "cards" && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Filter category badges */}
                    <div className="px-4 py-2 bg-neutral-50/50 border-b border-neutral-200 flex flex-wrap gap-1 items-center">
                      <button
                        onClick={() => setSelectedCategory("all")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          selectedCategory === "all"
                            ? "bg-neutral-800 text-white"
                            : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        전체 ({result.corrections.length})
                      </button>
                      {["spacing", "spelling", "grammar", "style"].map((cat) => {
                        const count = result.corrections.filter((c) => c.category === cat).length;
                        if (count === 0) return null;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                              selectedCategory === cat
                                ? "bg-emerald-700 text-white"
                                : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                            }`}
                          >
                            {getCategoryLabel(cat as CorrectionCategory)} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Detailed correction cards list */}
                    <div ref={correctionListRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                      {filteredCorrections.length === 0 ? (
                        <div className="text-center py-12 text-neutral-400">
                          <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-xs">이 범주의 수정 사항이 없습니다.</p>
                        </div>
                      ) : (
                        filteredCorrections.map((corr, idx) => {
                          const isHighlighted = highlightedCorrection?.original === corr.original;
                          return (
                            <div
                              key={idx}
                              id={`corr-${corr.original}`}
                              className={`rounded-xl border p-3.5 transition-all duration-300 ${
                                isHighlighted
                                  ? "bg-emerald-50/40 border-emerald-400 shadow-md ring-2 ring-emerald-500/20"
                                  : "bg-white border-neutral-200 hover:border-neutral-300"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${getCategoryColor(
                                    corr.category,
                                    "badge"
                                  )}`}
                                >
                                  {getCategoryLabel(corr.category)}
                                </span>
                                {isHighlighted && (
                                  <span className="text-[10px] font-bold text-emerald-600 animate-pulse bg-emerald-100/50 px-2 py-0.5 rounded-full">
                                    클릭으로 선택됨
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-2 flex-wrap mb-2">
                                <span className="text-sm line-through text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded font-mono">
                                  {corr.original}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                                <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                                  {corr.corrected}
                                </span>
                              </div>

                              <p className="text-xs text-neutral-600 leading-relaxed mt-1 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                                {corr.explanation}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* History panel & Tips Grid (Bento) */}
      <footer id="history-footer" className="bg-white border-t border-neutral-200 py-8 px-4 lg:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* History Panel */}
          <div className="md:col-span-6 space-y-4">
            {/* Quick Copy-Paste Sample Templates */}
            <div className="bg-white rounded-xl p-3 border border-neutral-200 shadow-xs">
              <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                빠른 오류 테스트 예제
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SAMPLES.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(sample.text);
                      handleCheck(sample.text);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-left text-[11px] bg-neutral-50 hover:bg-emerald-50 hover:border-emerald-200 p-2 rounded-lg border border-neutral-100 transition-all duration-150 group cursor-pointer"
                  >
                    <div className="font-bold text-neutral-800 group-hover:text-emerald-700 flex items-center justify-between mb-0.5">
                      {sample.title}
                      <ChevronRight className="w-3 h-3 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-neutral-500 line-clamp-1 italic">"{sample.text}"</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-600" />
                최근 검사 기록
              </h2>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs text-neutral-400 hover:text-rose-600 transition-colors font-medium cursor-pointer"
                >
                  모두 지우기
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="border border-dashed border-neutral-200 rounded-xl p-6 text-center text-neutral-400 text-xs">
                검사한 기록이 없습니다. 맞춤법 검사를 시작해보세요!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                {history.map((item) => (
                  deletingId === item.id ? (
                    <div
                      key={item.id}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-between p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-left transition-all duration-150"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-xs font-bold text-rose-800 line-clamp-1 mb-0.5">
                          정말 삭제할까요?
                        </p>
                        <p className="text-[10px] text-rose-600 truncate">
                          {item.originalText}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item.id);
                            setDeletingId(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                        >
                          예
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-neutral-600 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors cursor-pointer"
                        >
                          아니요
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={item.id}
                      onClick={() => loadHistoryItem(item)}
                      className="flex items-center justify-between p-3 bg-neutral-50 hover:bg-emerald-50/50 border border-neutral-200 hover:border-emerald-200 rounded-xl text-left transition-all duration-150 group cursor-pointer"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-xs font-semibold text-neutral-800 line-clamp-1 mb-0.5">
                          {item.originalText}
                        </p>
                        <div className="flex items-center space-x-2 text-[10px] text-neutral-400">
                          <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(item.id);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="기록 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          {/* Grammar Tips / Guide Card */}
          <div className="md:col-span-6 space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              자주 헷갈리는 한국어 팁
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {randomTips.map((tip, idx) => (
                <div key={idx} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">{tip.category}</span>
                    <p className="text-xs font-bold text-neutral-800 mt-1">{tip.title}</p>
                    <p className="text-[11px] text-neutral-500 leading-relaxed mt-1">
                      {tip.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>


      </footer>
    </div>
  );
}
