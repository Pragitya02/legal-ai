import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router'
import jsPDF from 'jspdf'
import {
  Send, Mic, Square, Paperclip, RotateCcw, Scale, FileText, Users,
  Clock, ChevronRight, Sparkles, MessageSquare, Plus, X, Volume2, Loader2,
  Download,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: string
  metadata?: {
    caseType?: string
    laws?: string[]
    actions?: string[]
    documents?: string[]
    timeline?: string
  }
}

const suggestedPrompts = [
  'My landlord is refusing to return my security deposit',
  'I was wrongfully terminated without notice period',
  'A company cheated me in an online transaction',
  'My neighbor is encroaching on my property',
  'How do I file an RTI application?',
  'What are my rights if I am arrested?',
]

const aiResponses: Record<string, Message> = {
  default: {
    id: 'ai-1',
    role: 'ai',
    content: 'I\'ve analyzed your situation carefully. Here\'s a comprehensive legal assessment based on Indian law.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    metadata: {
      caseType: 'Property Law — Security Deposit Dispute',
      laws: [
        'Transfer of Property Act, 1882 — Section 108',
        'Model Tenancy Act, 2021 — Section 24',
        'Specific Relief Act, 1963 — Section 38',
        'Consumer Protection Act, 2019 (if builder involved)',
      ],
      actions: [
        'Send a legal notice to landlord via registered post within 7 days',
        'File complaint with Rent Authority / Rent Controller of your district',
        'Approach Consumer Disputes Redressal Commission if amount > ₹1 lakh',
        'File civil suit under Order XXXVII CPC for recovery of money',
      ],
      documents: [
        'Original rent agreement with landlord signature',
        'Bank receipts / UPI transaction proofs of deposit payment',
        'Written communication with landlord (WhatsApp, email)',
        'Utility bills and possession certificate (proof of vacancy)',
        'Photos/video of property condition at time of leaving',
      ],
      timeline: '2–6 weeks for Rent Authority resolution; 6–18 months for civil court',
    },
  },
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: 'Namaste! I\'m NyayaAI, your AI-powered legal assistant trained on Indian law — IPC, CrPC, CPC, IBC, RTI Act, and thousands of court judgments.\n\nDescribe your legal problem in simple terms, upload a document, or choose a suggested topic below. I\'ll provide detailed legal guidance instantly.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentStep, setAgentStep] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null)
  // One database case per chat conversation.
  const [caseId, setCaseId] = useState<number | null>(null)
  const activeChat = conversationId?.toString() || ''
  const [chatHistory, setChatHistory] = useState<
  { id: string; title: string; date: string }[]
>([])
  const [fileUploaded, setFileUploaded] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [loadingSpeechId, setLoadingSpeechId] = useState<string | null>(null)
  const [voiceEngine, setVoiceEngine] = useState<'browser' | 'sarvam'>('sarvam')
  // Selected language for voice input.
  // Hindi is the default; change it from the language selector.
  const [voiceLanguage, setVoiceLanguage] = useState('hi-IN')
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const speechRecognitionRef = useRef<any>(null)
const loadConversations = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) return;

    const res = await fetch(
      "https://legal-ai-z7vb.onrender.com/api/chat/conversations",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(
        data.message || "Failed to load conversations"
      );
    }

    setChatHistory(
      data.conversations.map((chat: any) => ({
        id: String(chat.id),
        title: chat.title || "New Chat",
        date: new Date(
          chat.updated_at || chat.created_at
        ).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      }))
    );
  } catch (err) {
    console.error("LOAD CONVERSATIONS ERROR:", err);
  }
};

const loadConversation = async (id: string) => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login again.");
      return;
    }

    const res = await fetch(
      `https://legal-ai-z7vb.onrender.com/api/chat/conversations/${id}/messages`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(
        data.message || "Failed to load conversation"
      );
    }

    setConversationId(Number(id))

    // Restore the database case linked to this conversation.
    const savedCaseId = localStorage.getItem(`nyaya_case_${id}`)
    setCaseId(savedCaseId ? Number(savedCaseId) : null)

    const loadedMessages: Message[] = data.messages.map(
      (msg: any, index: number) => ({
        id: String(msg.id ?? index),
        role: msg.sender === "user" ? "user" : "ai",
        content: msg.message,
        timestamp: msg.created_at
          ? new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
      })
    );

    setMessages(loadedMessages);
  } catch (err) {
    console.error("LOAD CONVERSATION ERROR:", err);
    alert("Failed to load conversation.");
  }
};

useEffect(() => {
  loadConversations();
}, []);

  const saveMessage = async (
  conversationId: number,
  sender: "user" | "ai",
  message: string,
  token: string
) => {
  const res = await fetch(
    `https://legal-ai-z7vb.onrender.com/api/chat/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sender,
        message,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(
      data.message || "Failed to save message"
    );
  }

  return data;
};
const createCase = async (
  title: string,
  description: string,
  token: string
) => {
  const res = await fetch(
    "https://legal-ai-z7vb.onrender.com/api/cases",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title:
          title.trim().slice(0, 100) ||
          "New Legal Case",
        description:
          description.trim() ||
          "Legal matter started through NyayaAI.",
        category: "General Legal Matter",
        severity: "Medium",
        status: "open",
      }),
    }
  );

  const data = await res.json();

  console.log("CREATE CASE RESPONSE:", data);

  if (!res.ok || !data.success) {
    throw new Error(
      data.message || "Failed to create case"
    );
  }

  return data;
};

const sendMessage = async (text: string) => {
  if (!text.trim()) return;

  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login again.");
    return;
  }

  const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setAgentStep("🧠 Master Agent is understanding your case...");
    await new Promise(r => setTimeout(r, 700));

    setAgentStep("📄 Case Analyzer is classifying the zcase...");
    await new Promise(r => setTimeout(r, 700));

    setAgentStep("⚖️ Law Research Agent is finding relevant laws...");
    await new Promise(r => setTimeout(r, 700));

    setAgentStep("👨‍⚖️ Lawyer Recommendation Agent is selecting advocates...");
    await new Promise(r => setTimeout(r, 700));

    setAgentStep("📝 Report Generator is preparing your legal report...");

    try {
      let currentConversationId = conversationId
      let currentCaseId = caseId

      // Create a conversation only for a brand-new chat.
      if (!currentConversationId) {
        const conversationRes = await fetch(
          "https://legal-ai-z7vb.onrender.com/api/chat/conversations",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: text.trim().slice(0, 60) || "New Legal Case",
            }),
          }
        )

        const conversationData = await conversationRes.json()

        if (!conversationRes.ok || !conversationData.success) {
          throw new Error(
            conversationData.message || "Failed to create conversation"
          )
        }

        currentConversationId = Number(conversationData.conversationId)
        setConversationId(currentConversationId)
      }

      // Create exactly one real case for this conversation.
      // Further messages in the same chat reuse this case.
      if (!currentCaseId) {
        const caseData = await createCase(text, text, token)

        currentCaseId = Number(caseData.caseId)
        setCaseId(currentCaseId)

        if (currentConversationId) {
          localStorage.setItem(
            `nyaya_case_${currentConversationId}`,
            String(currentCaseId)
          )
        }

        console.log("NEW NYAYAAI CASE CREATED:", currentCaseId)
      }
if (currentConversationId !== null) {
  await saveMessage(
    currentConversationId,
    "user",
    text,
    token
  );
}
       const res = await fetch("https://legal-ai-z7vb.onrender.com/analyze", {
          method: "POST",
          headers: {
             "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          body: JSON.stringify({
             case: text,
          }),
    });

        const data = await res.json();

        const aiMsg: Message = {
            id: Date.now().toString() + "-ai",
            role: "ai",
            content: data.response,
            timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
        };
setMessages(prev => [...prev, aiMsg]);

if (currentConversationId !== null) {
  await saveMessage(
    currentConversationId,
    "ai",
    data.response,
    token
  );
}

    } catch (err) {
        console.error(err);

        setMessages(prev => [
            ...prev,
            {
                id: Date.now().toString(),
                role: "ai",
                content: "Unable to connect to backend.",
                timestamp: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            },
        ]);
    } finally {
        setLoading(false);
        setAgentStep("");
    }
};


  // =========================================================
  // DOWNLOAD LEGAL CASE REPORT AS PDF
  // =========================================================
  const generateCaseReport = (
    caseSummary: string,
    reportText: string,
    metadata?: Message['metadata']
  ) => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 18
    const contentWidth = pageWidth - margin * 2

    const gold: [number, number, number] = [212, 175, 55]
    const black: [number, number, number] = [15, 15, 15]
    const darkGray: [number, number, number] = [55, 55, 55]

    let y = 20

    const ensureSpace = (requiredHeight: number) => {
      if (y + requiredHeight > pageHeight - 22) {
        pdf.addPage()
        y = 20
      }
    }

    const addWrappedText = (
      text: string,
      fontSize = 9,
      lineHeight = 4.5,
      color: [number, number, number] = darkGray
    ) => {
      pdf.setTextColor(...color)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(fontSize)

      const lines = pdf.splitTextToSize(text, contentWidth)

      for (const line of lines) {
        ensureSpace(lineHeight)
        pdf.text(line, margin, y)
        y += lineHeight
      }
    }

    // ---------------------------------------------------------
    // HEADER
    // ---------------------------------------------------------
    pdf.setFillColor(...black)
    pdf.rect(0, 0, pageWidth, 32, 'F')

    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(20)
    pdf.text('NYAYAAI', margin, 14)

    pdf.setFontSize(8.5)
    pdf.setTextColor(...gold)
    pdf.text('AI LEGAL ASSISTANT', margin, 22)

    pdf.setDrawColor(...gold)
    pdf.setLineWidth(0.5)
    pdf.line(margin, 32, pageWidth - margin, 32)

    y = 46

    // ---------------------------------------------------------
    // TITLE
    // ---------------------------------------------------------
    pdf.setTextColor(...black)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(21)
    pdf.text('LEGAL CASE REPORT', margin, y)

    y += 8

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(100, 100, 100)
    pdf.text(
      `Generated on ${new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`,
      margin,
      y
    )

    y += 12

    // ---------------------------------------------------------
    // CASE TYPE
    // ---------------------------------------------------------
    if (metadata?.caseType) {
      ensureSpace(16)

      pdf.setFillColor(248, 246, 238)
      pdf.setDrawColor(...gold)
      pdf.setLineWidth(0.35)
      pdf.roundedRect(
        margin,
        y,
        contentWidth,
        14,
        2.5,
        2.5,
        'FD'
      )

      pdf.setTextColor(...gold)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.text('CASE TYPE', margin + 5, y + 5.5)

      pdf.setTextColor(...black)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.text(metadata.caseType, margin + 5, y + 10.5)

      y += 21
    }

    // ---------------------------------------------------------
    // CASE SUMMARY
    // ---------------------------------------------------------
    ensureSpace(45)

    pdf.setFillColor(248, 246, 238)
    pdf.setDrawColor(...gold)
    pdf.setLineWidth(0.35)
    pdf.roundedRect(
      margin,
      y,
      contentWidth,
      42,
      3,
      3,
      'FD'
    )

    pdf.setTextColor(...gold)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text('CASE SUMMARY', margin + 6, y + 8)

    pdf.setTextColor(...darkGray)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.8)

    const summaryLines = pdf.splitTextToSize(
      caseSummary,
      contentWidth - 12
    )

    pdf.text(
      summaryLines.slice(0, 6),
      margin + 6,
      y + 15
    )

    y += 49

    // ---------------------------------------------------------
    // STRUCTURED LEGAL INFORMATION
    // ---------------------------------------------------------
    const addListSection = (
      title: string,
      items?: string[],
      bullet = '•'
    ) => {
      if (!items || items.length === 0) return

      ensureSpace(18)

      pdf.setTextColor(...gold)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.text(title, margin, y)
      y += 7

      pdf.setTextColor(...darkGray)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8.8)

      for (const item of items) {
        const lines = pdf.splitTextToSize(
          `${bullet} ${item}`,
          contentWidth - 3
        )

        for (const line of lines) {
          ensureSpace(4.5)
          pdf.text(line, margin + 2, y)
          y += 4.5
        }

        y += 1
      }

      y += 3
    }

    addListSection('RELEVANT LAWS', metadata?.laws)
    addListSection('RECOMMENDED ACTIONS', metadata?.actions)
    addListSection('DOCUMENTS REQUIRED', metadata?.documents)

    if (metadata?.timeline) {
      ensureSpace(24)

      pdf.setTextColor(...gold)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.text('ESTIMATED TIMELINE', margin, y)
      y += 7

      pdf.setFillColor(248, 248, 248)
      pdf.setDrawColor(210, 210, 210)

      const timelineLines = pdf.splitTextToSize(
        metadata.timeline,
        contentWidth - 12
      )

      const boxHeight = Math.max(
        16,
        timelineLines.length * 4.5 + 8
      )

      ensureSpace(boxHeight)

      pdf.roundedRect(
        margin,
        y - 2,
        contentWidth,
        boxHeight,
        2,
        2,
        'FD'
      )

      pdf.setTextColor(...darkGray)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8.8)
      pdf.text(
        timelineLines,
        margin + 6,
        y + 5
      )

      y += boxHeight + 7
    }

    // ---------------------------------------------------------
    // FULL AI REPORT
    // ---------------------------------------------------------
    ensureSpace(20)

    pdf.setTextColor(...black)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(15)
    pdf.text('LEGAL ANALYSIS & REPORT', margin, y)
    y += 9

    const paragraphs = reportText.split(/\r?\n/)

    for (const rawParagraph of paragraphs) {
      const line = rawParagraph.trim()

      if (!line) {
        y += 3
        continue
      }

      const normalized = line
        .replace(/^#+\s*/, '')
        .replace(/^\*\*(.*?)\*\*$/, '$1')
        .trim()

      const looksLikeHeading =
        /^#{1,6}\s/.test(line) ||
        /^[A-Z][A-Z\s&/:-]{4,}$/.test(normalized) ||
        /^(case analysis|legal research|applicable laws?|relevant laws?|recommended actions?|lawyer recommendation|documents required|estimated timeline|case summary|conclusion|next steps|legal disclaimer)$/i.test(
          normalized
        )

      if (looksLikeHeading) {
        ensureSpace(14)

        pdf.setTextColor(...gold)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)

        const headingLines = pdf.splitTextToSize(
          normalized,
          contentWidth
        )

        pdf.text(headingLines, margin, y)
        y += headingLines.length * 5 + 3
        continue
      }

      // Remove simple markdown emphasis markers while keeping content.
      const cleanText = normalized
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/^[-•]\s*/, '• ')

      addWrappedText(cleanText, 8.8, 4.5)
      y += 2
    }

    // ---------------------------------------------------------
    // DISCLAIMER
    // ---------------------------------------------------------
    ensureSpace(46)

    y += 6

    const disclaimer =
      'This report is generated by NyayaAI for general informational and educational purposes only. It is not professional legal advice, does not create an advocate-client relationship, and should not be treated as a substitute for consultation with a qualified advocate. Laws, procedures, limitation periods, and facts may change or require case-specific verification.'

    const disclaimerLines = pdf.splitTextToSize(
      disclaimer,
      contentWidth - 12
    )

    const disclaimerHeight =
      18 + disclaimerLines.length * 4

    pdf.setFillColor(248, 248, 248)
    pdf.setDrawColor(190, 190, 190)

    pdf.roundedRect(
      margin,
      y,
      contentWidth,
      disclaimerHeight,
      3,
      3,
      'FD'
    )

    pdf.setTextColor(70, 70, 70)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.text(
      'LEGAL DISCLAIMER',
      margin + 6,
      y + 7
    )

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.3)

    pdf.text(
      disclaimerLines,
      margin + 6,
      y + 13
    )

    // ---------------------------------------------------------
    // FOOTER + PAGE NUMBERS
    // ---------------------------------------------------------
    const totalPages = pdf.getNumberOfPages()

    for (let page = 1; page <= totalPages; page++) {
      pdf.setPage(page)

      pdf.setDrawColor(220, 220, 220)
      pdf.setLineWidth(0.25)
      pdf.line(
        margin,
        pageHeight - 12,
        pageWidth - margin,
        pageHeight - 12
      )

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(120, 120, 120)

      pdf.text(
        'NyayaAI • AI Legal Assistant',
        margin,
        pageHeight - 6
      )

      pdf.text(
        `Page ${page} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 6,
        { align: 'right' }
      )
    }

    // ---------------------------------------------------------
    // DOWNLOAD
    // ---------------------------------------------------------
    const datePart = new Date()
      .toISOString()
      .slice(0, 10)

    pdf.save(
      `NyayaAI-Legal-Case-Report-${datePart}.pdf`
    )
  }

  // ---- Speech-to-text (mic input) ----

  // Browser-native path: uses the Web Speech API (free, no backend call, English-strongest)
  const startBrowserRecognition = () => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      alert('Your browser does not support built-in speech recognition. Try Chrome, or switch to the Sarvam AI engine.')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = voiceLanguage
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => (prev ? prev + ' ' : '') + transcript)
    }
    recognition.onerror = (event: any) => {
      console.error('Browser speech recognition error:', event.error)
    }
    recognition.onend = () => setIsRecording(false)

    speechRecognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const stopBrowserRecognition = () => {
    speechRecognitionRef.current?.stop()
    setIsRecording(false)
  }

  // Sarvam path: records audio and sends it to the backend for transcription
  // using the language selected above.
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)
      }

      recorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Mic access error:', err)
      alert('Could not access microphone. Please check browser permissions.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const handleMicClick = () => {
    if (voiceEngine === 'browser') {
      isRecording ? stopBrowserRecognition() : startBrowserRecognition()
    } else {
      isRecording ? stopRecording() : startRecording()
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setTranscribing(true)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('language_code', 'unknown') // auto-detect Hindi/Punjabi/English etc.

      const res = await fetch('https://legal-ai-z7vb.onrender.com/api/voice/stt', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()
      if (data.success && data.transcript) {
        setInput(prev => (prev ? prev + ' ' : '') + data.transcript)
      } else {
        console.error('STT failed:', data.message)
        alert(`Voice input failed: ${data.message || 'unknown error'}`)
      }
    } catch (err) {
      console.error('STT error:', err)
      alert('Voice input failed — could not reach the server. Check that the backend is running on port 5001.')
    } finally {
      setTranscribing(false)
    }
  }

  // ---- Text-to-speech (read AI reply aloud) ----
  const handleSpeak = async (messageId: string, text: string) => {
    // If this message is already playing, stop it
    if (speakingId === messageId) {
      if (voiceEngine === 'browser') {
        window.speechSynthesis.cancel()
      } else {
        audioPlayerRef.current?.pause()
      }
      setSpeakingId(null)
      return
    }

    // Stop anything else currently playing
    window.speechSynthesis.cancel()
    audioPlayerRef.current?.pause()
    setSpeakingId(null)

    if (voiceEngine === 'browser') {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-IN'
      utterance.onend = () => setSpeakingId(null)
      utterance.onerror = () => setSpeakingId(null)
      setSpeakingId(messageId)
      window.speechSynthesis.speak(utterance)
      return
    }

    setLoadingSpeechId(messageId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('https://legal-ai-z7vb.onrender.com/api/voice/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, language_code: 'en-IN' }),
      })

      const data = await res.json()
      if (data.success && data.audio) {
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`)
        audioPlayerRef.current = audio
        audio.onended = () => setSpeakingId(null)
        setSpeakingId(messageId)
        await audio.play()
      } else {
        console.error('TTS failed:', data.message)
        alert(`Voice output failed: ${data.message || 'unknown error'}`)
      }
    } catch (err) {
      console.error('TTS error:', err)
      alert('Voice output failed — could not reach the server. Check that the backend is running on port 5001.')
    } finally {
      setLoadingSpeechId(null)
    }
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 116px)', gap: 0, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* Chat history sidebar */}
      <aside style={{
        width: 240, flexShrink: 0, background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }} className="ai-sidebar">
        <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--border)' }}>
          <button className="btn-primary"
            onClick={() => {
  setConversationId(null)
  setCaseId(null)

  setMessages([{
    id: 'welcome-new',
    role: 'ai',
    content: 'New conversation started. How can I help you with your legal matter today?',
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }),
  }]);
}}
            style={{
              width: '100%', padding: '9px', borderRadius: 8, fontWeight: 600, fontSize: '0.8rem',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <Plus size={14} /> New Chat
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {chatHistory.map(ch => (
            <div
           key={ch.id}
  onClick={() => loadConversation(ch.id)}
  style={{
                padding: '10px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                background: ch.id === activeChat ? 'var(--bg-card)' : 'transparent',
                border: ch.id === activeChat ? '1px solid var(--border)' : '1px solid transparent',
              }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <MessageSquare size={13} style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>{ch.title}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{ch.date}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-subtle)', lineHeight: 1.5 }}>
          NyayaAI provides general legal information, not professional legal advice. Consult a qualified advocate for your specific situation.
        </div>
      </aside>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', minWidth: 0 }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-glass)', backdropFilter: 'blur(20px)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--blue), #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Scale size={16} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>NyayaAI Legal Assistant</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />
              Online · Trained on Indian Law
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setVoiceEngine(v => v === 'sarvam' ? 'browser' : 'sarvam')}
              title="Switch voice engine"
              style={{
                padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)',
                background: 'var(--bg-secondary)', fontSize: '0.75rem', color: 'var(--text-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <Volume2 size={12} /> Voice: {voiceEngine === 'sarvam' ? 'Sarvam AI' : 'Browser'}
            </button>

            <select
              value={voiceLanguage}
              onChange={e => setVoiceLanguage(e.target.value)}
              disabled={isRecording || transcribing}
              title="Voice input language"
              aria-label="Voice input language"
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: isRecording || transcribing ? 'not-allowed' : 'pointer',
                outline: 'none',
              }}
            >
              <option value="hi-IN">Hindi</option>
              <option value="pa-IN">Punjabi</option>
              <option value="en-IN">English</option>
              <option value="gu-IN">Gujarati</option>
              <option value="mr-IN">Marathi</option>
              <option value="bn-IN">Bengali</option>
              <option value="ta-IN">Tamil</option>
              <option value="te-IN">Telugu</option>
              <option value="kn-IN">Kannada</option>
              <option value="ml-IN">Malayalam</option>
              <option value="od-IN">Odia</option>
            </select>

            <button style={{
              padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'var(--bg-secondary)', fontSize: '0.75rem', color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}
              onClick={() => setMessages([{
                id: 'clear',
                role: 'ai',
                content: 'Conversation cleared. How can I assist you today?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }])}>
              <RotateCcw size={12} /> Clear
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map((msg, index) => (
            <div key={msg.id} style={{
              display: 'flex', gap: 10,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}>
              {/* Avatar */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'ai'
                  ? 'linear-gradient(135deg, var(--blue), #7C3AED)'
                  : 'linear-gradient(135deg, #7C3AED, #EC4899)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
                fontWeight: 700, color: 'white',
              }}>
                {msg.role === 'ai' ? <Scale size={13} /> : 'G'}
              </div>

              <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Bubble */}
                <div className={msg.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'}
                  style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-line', margin: 0 }}>
                    {msg.content}
                  </p>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginTop: 6,
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{ fontSize: '0.68rem', opacity: 0.6 }}>
                      {msg.timestamp}
                    </div>
                    {msg.role === 'ai' && (
                      <button
                        onClick={() => handleSpeak(msg.id, msg.content)}
                        disabled={loadingSpeechId === msg.id}
                        title={speakingId === msg.id ? 'Stop reading' : 'Read aloud'}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 2, display: 'flex', alignItems: 'center',
                          color: speakingId === msg.id ? 'var(--blue)' : 'var(--text-muted)',
                          opacity: loadingSpeechId === msg.id ? 0.5 : 0.75,
                        }}>
                        {loadingSpeechId === msg.id ? (
                          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : speakingId === msg.id ? (
                          <Square size={11} fill="currentColor" />
                        ) : (
                          <Volume2 size={13} />
                        )}
                      </button>
                    )}

                    {msg.role === 'ai' && index > 0 && msg.content.length > 80 && (
                      <button
                        onClick={() => {
                          const previousUserMessage = [...messages]
                            .slice(0, index)
                            .reverse()
                            .find(message => message.role === 'user')

                          generateCaseReport(
                            previousUserMessage?.content ||
                              'Case details were not available in the conversation.',
                            msg.content,
                            msg.metadata
                          )
                        }}
                        title="Download legal case report"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 2,
                          display: 'flex',
                          alignItems: 'center',
                          color: 'var(--blue)',
                          opacity: 0.85,
                        }}
                      >
                        <Download size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* AI metadata card */}
                {msg.role === 'ai' && msg.metadata && (
                  <div className="card" style={{ padding: 20 }}>
                    {/* Case type */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Scale size={16} style={{ color: 'var(--blue)' }} />
                      <span style={{ fontWeight: 700, color: 'var(--blue)', fontSize: '0.9rem' }}>
                        {msg.metadata.caseType}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="metadata-grid">
                      {/* Relevant Laws */}
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                          📚 Relevant Laws
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {msg.metadata.laws?.map(l => (
                            <li key={l} style={{ fontSize: '0.78rem', color: 'var(--text)', padding: '5px 8px', borderRadius: 6, background: 'var(--blue-subtle)', border: '1px solid var(--blue-light)' }}>
                              {l}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Recommended Actions */}
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                          ⚡ Recommended Actions
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {msg.metadata.actions?.map((a, i) => (
                            <li key={i} style={{ fontSize: '0.78rem', color: 'var(--text)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                              <span style={{ color: 'var(--emerald)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Documents Required */}
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                          📄 Documents Required
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {msg.metadata.documents?.map(d => (
                            <li key={d} style={{ fontSize: '0.78rem', color: 'var(--text)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                              <FileText size={12} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Timeline */}
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                          🕐 Estimated Timeline
                        </div>
                        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.8rem', color: 'var(--text)' }}>
                          <Clock size={13} style={{ color: '#F59E0B', marginRight: 6, verticalAlign: 'middle' }} />
                          {msg.metadata.timeline}
                        </div>

                        <Link to="/dashboard/advocates" className="btn-primary"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            marginTop: 12, padding: '10px', borderRadius: 8, textDecoration: 'none',
                            fontWeight: 600, fontSize: '0.8rem',
                          }}>
                          <Users size={14} />
                          Find an Advocate <ChevronRight size={13} />
                        </Link>
                      </div>

                      <button
                        onClick={() => {
                          const previousUserMessage = [...messages]
                            .slice(0, index)
                            .reverse()
                            .find(message => message.role === 'user')

                          generateCaseReport(
                            previousUserMessage?.content ||
                              'Case details were not available in the conversation.',
                            msg.content,
                            msg.metadata
                          )
                        }}
                        style={{
                          marginTop: 16,
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 7,
                          fontWeight: 600,
                          fontSize: '0.8rem',
                        }}
                        title="Download complete legal case report"
                      >
                        <Download size={14} />
                        Download Case Report PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

         {/* Agent Status */}
{loading && (
  <div
    className="chat-bubble-ai"
    style={{
      padding: "16px",
      borderRadius: 12,
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#22c55e",
          animation: "pulse 1s infinite",
        }}
      />
      <strong>NyayaAI Agent Network Working...</strong>
    </div>

    <div
      style={{
        color: "#60a5fa",
        fontWeight: 600,
        marginBottom: 10,
      }}
    >
      {agentStep}
    </div>

    <div
      style={{
        display: "flex",
        gap: 5,
        alignItems: "center",
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#3b82f6",
            animation: `bounce 1.2s ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  </div>
)}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts */}
        {messages.length <= 1 && (
          <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {suggestedPrompts.map(p => (
              <button key={p} onClick={() => sendMessage(p)}
                style={{
                  padding: '7px 12px', borderRadius: 8, fontSize: '0.775rem', fontWeight: 500,
                  border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.borderColor = 'var(--blue)'
                  ;(e.target as HTMLElement).style.color = 'var(--blue)'
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.borderColor = 'var(--border)'
                  ;(e.target as HTMLElement).style.color = 'var(--text-muted)'
                }}>
                {p}
              </button>
            ))}
          </div>
        )}

        {/* File upload indicator */}
        {fileUploaded && (
          <div style={{ padding: '0 20px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              padding: '6px 12px', borderRadius: 8, background: 'var(--emerald-subtle)',
              border: '1px solid var(--emerald-light)', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.78rem', color: 'var(--emerald)',
            }}>
              <FileText size={13} /> {fileUploaded}
              <button onClick={() => setFileUploaded(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--emerald)', padding: 0, display: 'flex' }}>
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--border)',
          background: 'var(--bg-glass)', backdropFilter: 'blur(20px)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 8,
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '8px 8px 8px 14px',
            transition: 'border-color 0.15s',
          }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(input)
                }
              }}
              placeholder="Describe your legal issue... (Press Enter to send, Shift+Enter for new line)"
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                resize: 'none', fontSize: '0.875rem', color: 'var(--text)',
                lineHeight: 1.6, maxHeight: 120, overflowY: 'auto',
                fontFamily: 'inherit', paddingTop: 4,
              }}
            />
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <input ref={fileRef} type="file" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && setFileUploaded(e.target.files[0].name)} />
              <button onClick={() => fileRef.current?.click()}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} title="Upload document">
                <Paperclip size={15} />
              </button>
              <button
                onClick={handleMicClick}
                disabled={transcribing}
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  border: isRecording ? '1px solid #EF4444' : '1px solid var(--border)',
                  background: isRecording ? 'rgba(239,68,68,0.1)' : 'var(--bg-card)',
                  cursor: transcribing ? 'default' : 'pointer',
                  color: isRecording ? '#EF4444' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: transcribing ? 0.6 : 1,
                }}
                title={isRecording ? 'Stop recording' : `Voice input (${voiceLanguage})`}>
                {transcribing ? (
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                ) : isRecording ? (
                  <Square size={13} fill="currentColor" />
                ) : (
                  <Mic size={15} />
                )}
              </button>
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="btn-primary"
                style={{
                  width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: (!input.trim() || loading) ? 0.5 : 1,
                }}>
                <Send size={15} />
              </button>
            </div>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
            <Sparkles size={11} style={{ color: 'var(--text-subtle)' }} />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
              NyayaAI can make mistakes. For critical decisions, consult a verified advocate.
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
         0% {
         opacity: 0.4;
         transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.3);
  }
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
      `}</style>
    </div>
  )
}