import { useEffect, useRef, useState } from 'react'



import {


  Upload,

  FileText,

  ChevronRight,

  X,

  Gavel,

  Scale,

  Send,

  Plus,

  Trash2,

  Loader2,

  MessageSquare,

  ShieldCheck,

} from 'lucide-react'
import NyayaAIResearchMonogram from '../components/NyayaAIResearchMonogram'



import AnimatedMarkdown from '../components/AnimatedMarkdown'



interface ResearchSource {
  title: string
  url: string
  site_name: string
  snippet: string
  position: number | null
}

interface ResearchMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  created_at?: string
  webSources?: ResearchSource[]
}



interface ResearchChat {

  id: number

  title: string

  created_at: string

  updated_at: string

}



interface ResearchDocument {

  id: number

  file_name: string

  file_type: string

  created_at?: string

}



type ResearchMode =

  | 'standard'

  | 'deep'



const API_BASE_URL =

  import.meta.env.VITE_API_URL || 'http\://localhost:5001'



const researchTools = [

  {

    icon: FileText,

    label: 'Upload Case File',

    sub: 'PDF, DOCX, images',

    color: 'var(--blue)',

  },

  {

    icon: FileText,

    label: 'Upload FIR',

    sub: 'First Information Report',

    color: '#7C3AED',

  },

  {

    icon: Gavel,

    label: 'Upload Court Order',

    sub: 'Any court / tribunal',

    color: '#F59E0B',

  },

  {

    icon: Scale,

    label: 'Upload Judgment',

    sub: 'HC / SC judgments',

    color: 'var(--emerald)',

  },

]



const quickResearch = [

  'Summarize uploaded documents',

  'Extract all important information from the uploaded documents',

  'Check whether important fields, stamps, signatures and seals are present',

  'Find the relevant Indian laws and sections for this case',

  'Suggest arguments for the defence based on the case materials',

  'Draft a petition based on the current case materials',

]



const welcomeMessage: ResearchMessage = {

  id: 'welcome',

  role: 'ai',

  content:

    'Welcome to NyayaAI Advocate Research.\n\nUpload a Case File, FIR, Court Order, or Judgment and I will read and analyze it. You can then ask natural follow-up questions about the document, missing information, legal issues, sections, arguments, precedents, or drafting.\n\nThis research assistant is strictly limited to legal and case-related work. Unrelated questions will not be answered.',

}



export default function AIResearch() {

  const [messages, setMessages] =

    useState<ResearchMessage[]>([welcomeMessage])



  const [input, setInput] = useState('')

  const [loading, setLoading] = useState(false)



  const [researchMode, setResearchMode] =

    useState<ResearchMode>('standard')



  const [streamingMessageId, setStreamingMessageId] =

    useState<string | null>(null)



  const [uploading, setUploading] = useState(false)



  const [chatHistory, setChatHistory] =

    useState<ResearchChat[]>([])



  const [conversationId, setConversationId] =

    useState<number | null>(null)



  const [uploadedFiles, setUploadedFiles] =

    useState<ResearchDocument[]>([])



  const [uploadKind, setUploadKind] =

    useState('Case File')



  const fileRef =

    useRef<HTMLInputElement>(null)



  const bottomRef =

    useRef<HTMLDivElement>(null)



  /*

   * Central API helper.

   *

   * credentials: include is important if your backend

   * uses the existing authenticated session/cookie.

   */

  const apiFetch = async (

    path: string,

    init: RequestInit = {},

  ) => {

    return fetch(

      `${API_BASE_URL}${path}`,

      {

        ...init,

        credentials: 'include',

      },

    )

  }



  /*

   * Load all previous Advocate Research conversations.

   *

   * These are intentionally separate from the normal

   * AI Assistant conversations.

   */

  const loadChats = async () => {

    try {

      const response = await apiFetch(

        '/api/research/conversations',

      )



      if (!response.ok) {

        return

      }



      const data = await response.json()



      if (data.success) {

        setChatHistory(

          data.conversations || [],

        )

      }

    } catch (error) {

      console.error(

        'LOAD RESEARCH CHATS ERROR:',

        error,

      )

    }

  }



  /*

   * Create a new research conversation.

   */

  const createChat = async (

    title = 'New Legal Research',

  ) => {

    const response = await apiFetch(

      '/api/research/conversations',

      {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({

          title,

        }),

      },

    )



    const data = await response.json()



    if (

      !response.ok ||

      !data.success

    ) {

      throw new Error(

        data.message ||

          'Failed to create research chat.',

      )

    }



    const id = Number(

      data.conversationId,

    )



    setConversationId(id)

    setMessages([welcomeMessage])

    setUploadedFiles([])



    await loadChats()



    return id

  }



  /*

   * Load an existing research conversation,

   * including messages and uploaded documents.

   */

  const loadChat = async (

    id: number,

  ) => {

    try {

      setLoading(true)



      const response = await apiFetch(

        `/api/research/conversations/${id}`,

      )



      const data =

        await response.json()



      if (

        !response.ok ||

        !data.success

      ) {

        throw new Error(

          data.message ||

            'Failed to load research chat.',

        )

      }



      setConversationId(id)



      const loadedMessages =

        (data.messages || []).map(

          (message: any) => ({

            id: String(message.id),

            role:

              message.sender === 'user'

                ? 'user'

                : 'ai',

            content:

              message.message,

            created_at:

              message.created_at,
            webSources:
              Array.isArray(message.webSources)
                ? message.webSources
                : [],

          }),

        )



      setMessages(

        loadedMessages.length

          ? loadedMessages

          : [welcomeMessage],

      )



      setUploadedFiles(

        data.documents || [],

      )

    } catch (error) {

      console.error(

        'LOAD RESEARCH CHAT ERROR:',

        error,

      )

    } finally {

      setLoading(false)

    }

  }



  /*

   * Initial research-history load.

   */

  useEffect(() => {

    loadChats().catch(() => {})

  }, [])



  /*

   * Keep the latest message visible.

   */

  useEffect(() => {

    bottomRef.current?.scrollIntoView({

      behavior: 'smooth',

    })

  }, [

    messages,

    loading,

    uploading,

  ])



  useEffect(() => {

    if (!streamingMessageId) return



    const message = messages.find(

      message =>

        message.id === streamingMessageId,

    )



    if (!message) {

      setStreamingMessageId(null)

      return

    }



    const timeout = window.setTimeout(

      () => {

        setStreamingMessageId(null)

      },

      Math.max(

        450,

        Math.min(

          3500,

          message.content.length * 2.5,

        ),

      ),

    )



    return () =>

      window.clearTimeout(timeout)

  }, [

    messages,

    streamingMessageId,

  ])



  /*

   * Make sure a conversation exists before

   * sending a message or uploading a document.

   */

  const ensureChat = async (

    title?: string,

  ) => {

    if (conversationId) {

      return conversationId

    }



    return createChat(

      title || 'New Legal Research',

    )

  }



  /*

   * Send a real research question to the backend.

   *

   * No setTimeout().

   * No fake sample answer.

   */

  const sendQuery = async (

    text: string,

  ) => {

    const question = text.trim()



    if (

      !question ||

      loading ||

      uploading

    ) {

      return

    }



    try {

      const id =

        await ensureChat(

          question.slice(0, 60),

        )



      /*

       * Immediately show the user's message.

       */

      setMessages(prev => [

        ...prev,

        {

          id: `user-${Date.now()}`,

          role: 'user',

          content: question,

        },

      ])



      setInput('')

      setLoading(true)



      /*

       * Send the question to the real

       * Advocate Research backend.

       */

      const response = await apiFetch(

        `/api/research/conversations/${id}/messages`,

        {

          method: 'POST',

          headers: {

            'Content-Type':

              'application/json',

          },

          body: JSON.stringify({

            message: question,

            researchMode,

          }),

        },

      )



      const data =

        await response.json()



      if (

        !response.ok ||

        !data.success

      ) {

        throw new Error(

          data.message ||

            'Research request failed.',

        )

      }



      /*

       * Display the actual AI answer.

       */

      const aiMessageId =

        `ai-${Date.now()}`



      setMessages(prev => [

        ...prev,

        {

          id: aiMessageId,

          role: 'ai',

          content: data.message,
          webSources:
            Array.isArray(data.webSources)
              ? data.webSources
              : [],

        },

      ])



      setStreamingMessageId(

        aiMessageId,

      )



      /*

       * Refresh sidebar history so the

       * conversation title/timestamp updates.

       */

      await loadChats()

    } catch (error) {

      console.error(

        'RESEARCH QUERY ERROR:',

        error,

      )



      setMessages(prev => [

        ...prev,

        {

          id: `error-${Date.now()}`,

          role: 'ai',

          content:

            error instanceof Error

              ? error.message

              : 'Unable to complete the research request.',

        },

      ])

    } finally {

      setLoading(false)

    }

  }



  /*

   * Upload and analyze a real document.

   *

   * The complete File object is sent to the backend,

   * rather than only sending the filename.

   */

  const handleUpload = async (

    file: File,

  ) => {

    try {

      const id =

        await ensureChat(

          `${uploadKind}: ${file.name}`.slice(

            0,

            60,

          ),

        )



      setUploading(true)



      /*

       * Show upload event in conversation.

       */

      setMessages(prev => [

        ...prev,

        {

          id: `upload-${Date.now()}`,

          role: 'user',

          content:

            `📎 Uploaded ${uploadKind}: ${file.name}`,

        },

      ])



      const formData =

        new FormData()



      formData.append(

        'document',

        file,

      )



      formData.append(

        'documentType',

        uploadKind,

      )



      /*

       * Send actual file to backend.

       */

      const response = await apiFetch(

        `/api/research/conversations/${id}/documents`,

        {

          method: 'POST',

          body: formData,

        },

      )



      const data =

        await response.json()



      if (

        !response.ok ||

        !data.success

      ) {

        throw new Error(

          data.message ||

            'Document analysis failed.',

        )

      }



      /*

       * Add document to the current

       * research workspace.

       */

      setUploadedFiles(prev => [

        ...prev,

        data.document,

      ])



      /*

       * Backend returns the actual

       * document-analysis response.

       */

      const analysisMessageId =

        `analysis-${Date.now()}`



      setMessages(prev => [

        ...prev,

        {

          id: analysisMessageId,

          role: 'ai',

          content: data.message,
          webSources:
            Array.isArray(data.webSources)
              ? data.webSources
              : [],

        },

      ])



      setStreamingMessageId(

        analysisMessageId,

      )



      await loadChats()

    } catch (error) {

      console.error(

        'RESEARCH UPLOAD ERROR:',

        error,

      )



      setMessages(prev => [

        ...prev,

        {

          id: `upload-error-${Date.now()}`,

          role: 'ai',

          content:

            error instanceof Error

              ? error.message

              : 'Unable to analyze this document.',

        },

      ])

    } finally {

      setUploading(false)



      if (fileRef.current) {

        fileRef.current.value = ''

      }

    }

  }



  /*

   * Start a completely new research conversation.

   */

  const startNewChat = async () => {

    try {

      setLoading(true)



      await createChat()

    } catch (error) {

      console.error(

        'NEW RESEARCH CHAT ERROR:',

        error,

      )

    } finally {

      setLoading(false)

    }

  }



  /*

   * Delete one research conversation.

   */

  const deleteChat = async (

    id: number,

  ) => {

    try {

      const response =

        await apiFetch(

          `/api/research/conversations/${id}`,

          {

            method: 'DELETE',

          },

        )



      if (!response.ok) {

        return

      }



      /*

       * If the deleted chat is the currently

       * open chat, return to a clean research state.

       */

      if (conversationId === id) {

        setConversationId(null)

        setMessages([

          welcomeMessage,

        ])

        setUploadedFiles([])

      }



      await loadChats()

    } catch (error) {

      console.error(

        'DELETE RESEARCH CHAT ERROR:',

        error,

      )

    }

  }



  return (

    <div

      style={{

        display: 'flex',

        gap: 16,

        height:

          'calc(100vh - 116px)',

      }}

      className="research-layout"

    >



      {/* =====================================================

          RESEARCH CHAT HISTORY

          ===================================================== */}



      <aside

        className="card research-history"

        style={{

          width: 235,

          flexShrink: 0,

          padding: 14,

          display: 'flex',

          flexDirection: 'column',

          minHeight: 0,

        }}

      >



        <button

          onClick={startNewChat}

          className="btn-primary"

          style={{

            width: '100%',

            padding: '10px 12px',

            border: 'none',

            borderRadius: 9,

            cursor: 'pointer',

            display: 'flex',

            alignItems: 'center',

            justifyContent:

              'center',

            gap: 7,

            fontWeight: 700,

            fontSize: '0.78rem',

          }}

        >

          <Plus size={14} />

          New Research

        </button>



        <div

          style={{

            marginTop: 16,

            marginBottom: 8,

            fontSize: '0.68rem',

            fontWeight: 800,

            color:

              'var(--text-muted)',

            textTransform:

              'uppercase',

            letterSpacing: '0.06em',

          }}

        >

          Research history

        </div>



        <div

          style={{

            flex: 1,

            overflowY: 'auto',

            display: 'flex',

            flexDirection:

              'column',

            gap: 5,

          }}

        >

          {chatHistory.length ===

            0 && (

            <div

              style={{

                fontSize: '0.74rem',

                color:

                  'var(--text-muted)',

                padding:

                  '10px 5px',

              }}

            >

              No research chats yet.

            </div>

          )}



          {chatHistory.map(chat => (

            <div

              key={chat.id}

              style={{

                display: 'flex',

                alignItems:

                  'center',

                gap: 3,

              }}

            >

              <button

                onClick={() =>

                  loadChat(

                    chat.id,

                  )

                }

                style={{

                  flex: 1,

                  minWidth: 0,

                  border: 'none',

                  background:

                    conversationId ===

                    chat.id

                      ? 'var(--bg-secondary)'

                      : 'transparent',

                  borderRadius: 8,

                  padding:

                    '9px 8px',

                  textAlign: 'left',

                  cursor:

                    'pointer',

                  color:

                    'var(--text)',

                  display: 'flex',

                  alignItems:

                    'center',

                  gap: 7,

                }}

              >

                <MessageSquare

                  size={12}

                  style={{

                    flexShrink: 0,

                    color:

                      'var(--text-muted)',

                  }}

                />



                <span

                  style={{

                    overflow:

                      'hidden',

                    textOverflow:

                      'ellipsis',

                    whiteSpace:

                      'nowrap',

                    fontSize:

                      '0.72rem',

                  }}

                >

                  {chat.title}

                </span>

              </button>



              <button

                onClick={() =>

                  deleteChat(

                    chat.id,

                  )

                }

                title="Delete research chat"

                style={{

                  border: 'none',

                  background:

                    'transparent',

                  color:

                    'var(--text-muted)',

                  cursor:

                    'pointer',

                  padding: 4,

                }}

              >

                <Trash2

                  size={11}

                />

              </button>

            </div>

          ))}

        </div>

      </aside>



      {/* =====================================================

          DOCUMENT + QUICK RESEARCH TOOLS

          ===================================================== */}



      <aside

        className="card research-left"

        style={{

          width: 260,

          flexShrink: 0,

          padding: 16,

          overflowY: 'auto',

        }}

      >



        <div

          style={{

            fontWeight: 800,

            color:

              'var(--text)',

            fontSize:

              '0.85rem',

            marginBottom: 11,

            display: 'flex',

            alignItems:

              'center',

            gap: 6,

          }}

        >

          <Upload

            size={15}

            style={{

              color:

                'var(--blue)',

            }}

          />



          Upload Documents

        </div>



        <input

          ref={fileRef}

          type="file"

          accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,.gif"

          style={{

            display: 'none',

          }}

          onChange={e => {

            const file =

              e.target.files?.[0]



            if (file) {

              handleUpload(

                file,

              )

            }

          }}

        />



        <div

          style={{

            display: 'flex',

            flexDirection:

              'column',

            gap: 7,

          }}

        >

          {researchTools.map(

            tool => (

              <button

                key={

                  tool.label

                }

                onClick={() => {

                  setUploadKind(

                    tool.label.replace(

                      'Upload ',

                      '',

                    ),

                  )



                  fileRef.current?.click()

                }}

                disabled={

                  uploading ||

                  loading

                }

                style={{

                  padding:

                    '10px 11px',

                  border:

                    '1px solid var(--border)',

                  borderRadius: 8,

                  background:

                    'var(--bg-secondary)',

                  cursor:

                    'pointer',

                  textAlign:

                    'left',

                  display:

                    'flex',

                  alignItems:

                    'center',

                  gap: 8,

                  opacity:

                    uploading

                      ? 0.6

                      : 1,

                }}

              >

                <div

                  style={{

                    width: 30,

                    height: 30,

                    borderRadius: 8,

                    background:

                      `color-mix(in srgb, ${tool.color} 12%, transparent)`,

                    display:

                      'flex',

                    alignItems:

                      'center',

                    justifyContent:

                      'center',

                  }}

                >

                  <tool.icon

                    size={14}

                    style={{

                      color:

                        tool.color,

                    }}

                  />

                </div>



                <div>

                  <div

                    style={{

                      fontSize:

                        '0.76rem',

                      fontWeight:

                        700,

                      color:

                        'var(--text)',

                    }}

                  >

                    {tool.label}

                  </div>



                  <div

                    style={{

                      fontSize:

                        '0.63rem',

                      color:

                        'var(--text-muted)',

                    }}

                  >

                    {tool.sub}

                  </div>

                </div>

              </button>

            ),

          )}

        </div>



        {/* ===================================================

            UPLOADED DOCUMENTS

            =================================================== */}



        {uploadedFiles.length >

          0 && (

          <div

            style={{

              marginTop: 14,

              paddingTop: 13,

              borderTop:

                '1px solid var(--border)',

            }}

          >

            <div

              style={{

                fontSize:

                  '0.67rem',

                fontWeight:

                  800,

                color:

                  'var(--text-muted)',

                marginBottom:

                  6,

                textTransform:

                  'uppercase',

              }}

            >

              Documents in this

              research

            </div>



            {uploadedFiles.map(

              file => (

                <div

                  key={

                    file.id

                  }

                  style={{

                    display:

                      'flex',

                    alignItems:

                      'center',

                    gap: 6,

                    padding:

                      '6px 0',

                  }}

                >

                  <FileText

                    size={12}

                    style={{

                      color:

                        'var(--blue)',

                      flexShrink: 0,

                    }}

                  />



                  <span

                    style={{

                      fontSize:

                        '0.7rem',

                      color:

                        'var(--text)',

                      overflow:

                        'hidden',

                      textOverflow:

                        'ellipsis',

                      whiteSpace:

                        'nowrap',

                    }}

                  >

                    {

                      file.file_name

                    }

                  </span>

                </div>

              ),

            )}

          </div>

        )}



        {/* ===================================================

            CASE-ONLY AI NOTICE

            =================================================== */}



        <div

          className="card"

          style={{

            marginTop: 14,

            padding: 12,

            background:

              'var(--bg-secondary)',

          }}

        >

          <div

            style={{

              display:

                'flex',

              alignItems:

                'center',

              gap: 6,

              fontWeight:

                750,

              fontSize:

                '0.75rem',

              color:

                'var(--text)',

              marginBottom:

                5,

            }}

          >

            <ShieldCheck

              size={13}

              style={{

                color:

                  'var(--emerald)',

              }}

            />



            Case-only AI

          </div>



          <div

            style={{

              fontSize:

                '0.67rem',

              lineHeight:

                1.55,

              color:

                'var(--text-muted)',

            }}

          >

            Legal and case

            questions are

            answered. Unrelated

            questions are

            rejected as not

            relevant to the

            current case.

          </div>

        </div>



        {/* ===================================================

            QUICK RESEARCH

            =================================================== */}



        <div

          style={{

            marginTop: 14,

          }}

        >

          <div

            style={{

              fontWeight:

                800,

              color:

                'var(--text)',

              fontSize:

                '0.82rem',

              marginBottom:

                9,

            }}

          >

            Quick Research

          </div>



          <div

            style={{

              display:

                'flex',

              flexDirection:

                'column',

              gap: 5,

            }}

          >

            {quickResearch.map(

              prompt => (

                <button

                  key={prompt}

                  onClick={() =>

                    sendQuery(

                      prompt,

                    )

                  }

                  disabled={

                    loading ||

                    uploading

                  }

                  style={{

                    padding:

                      '7px 9px',

                    border:

                      '1px solid var(--border)',

                    borderRadius: 7,

                    background:

                      'var(--bg-secondary)',

                    cursor:

                      'pointer',

                    textAlign:

                      'left',

                    fontSize:

                      '0.69rem',

                    color:

                      'var(--text-muted)',

                    display:

                      'flex',

                    alignItems:

                      'flex-start',

                    gap: 5,

                  }}

                >

                  <ChevronRight

                    size={10}

                    style={{

                      flexShrink: 0,

                      marginTop: 2,

                    }}

                  />



                  {prompt}

                </button>

              ),

            )}

          </div>

        </div>

      </aside>

            {/* =====================================================

          CHAT

          ===================================================== */}



      <main

        style={{

          flex: 1,

          minWidth: 0,

          display: 'flex',

          flexDirection:

            'column',

          borderRadius:

            'var(--radius)',

          border:

            '1px solid var(--border)',

          overflow:

            'hidden',

        }}

      >



        {/* HEADER */}



        <header

          style={{

            position: 'relative',

            padding:

              '14px 20px',

            borderBottom:

              '1px solid var(--border)',

            background:

              'var(--bg-glass)',

            display:

              'flex',

            alignItems:

              'center',

            gap: 10,

            backdropFilter:

              'blur(20px)',

          }}

        >



          <NyayaAIResearchMonogram size={34} radius={10} />



          <div>

            <div

              style={{

                fontWeight:

                  800,

                color:

                  'var(--text)',

                fontSize:

                  '0.9rem',

              }}

            >

              NyayaAI Advocate

              Research

            </div>



            <div

              style={{

                fontSize:

                  '0.68rem',

                color:

                  'var(--text-muted)',

              }}

            >

              Document-aware ·

              Legal research ·

              Case analysis

            </div>

          </div>



          {/* ===================================================

              RESEARCH MODE

              =================================================== */}



          <div

            style={{

              marginLeft: 'auto',

              display: 'flex',

              alignItems: 'center',

              gap: 7,

            }}

          >

            <span

              style={{

                fontSize: '0.68rem',

                color: 'var(--text-muted)',

                fontWeight: 700,

              }}

            >

              Research mode

            </span>



            <button

              type="button"

              onClick={() =>

                setResearchMode(

                  researchMode === 'deep'

                    ? 'standard'

                    : 'deep',

                )

              }

              disabled={

                loading ||

                uploading

              }

              title={

                researchMode === 'deep'

                  ? 'Deep Legal Research is enabled'

                  : 'Enable Deep Legal Research'

              }

              style={{

                border:

                  researchMode === 'deep'

                    ? '1px solid var(--blue)'

                    : '1px solid var(--border)',

                background:

                  researchMode === 'deep'

                    ? 'color-mix(in srgb, var(--blue) 12%, transparent)'

                    : 'var(--bg-secondary)',

                color:

                  researchMode === 'deep'

                    ? 'var(--blue)'

                    : 'var(--text-muted)',

                borderRadius: 8,

                padding: '7px 10px',

                cursor:

                  loading ||

                  uploading

                    ? 'not-allowed'

                    : 'pointer',

                fontSize: '0.68rem',

                fontWeight: 800,

                display: 'flex',

                alignItems: 'center',

                gap: 6,

                opacity:

                  loading ||

                  uploading

                    ? 0.6

                    : 1,

              }}

            >

              <span

                style={{

                  width: 7,

                  height: 7,

                  borderRadius:

                    '50%',

                  background:

                    researchMode === 'deep'

                      ? 'var(--blue)'

                      : 'var(--text-muted)',

                }}

              />



              {researchMode === 'deep'

                ? 'Deep Legal Research'

                : 'Standard Research'}

            </button>



            {researchMode === 'deep' && (

              <div

                style={{

                  position: 'absolute',

                  top: '100%',

                  right: 20,

                  marginTop: 6,

                  padding: '6px 9px',

                  borderRadius: 7,

                  background: 'var(--bg-secondary)',

                  border: '1px solid var(--border)',

                  color: 'var(--text-muted)',

                  fontSize: '0.64rem',

                  zIndex: 20,

                  boxShadow:

                    '0 8px 24px rgba(0,0,0,0.12)',

                  whiteSpace: 'nowrap',

                }}

              >

                Uses Legal RAG + TinyFish live web research

              </div>

            )}

          </div>



          {uploading && (



            <div



              style={{



                marginLeft:



                  10,



                display:



                  'flex',



                alignItems:



                  'center',



                gap: 6,



                fontSize:



                  '0.72rem',



                color:



                  'var(--text-muted)',



              }}



            >



              <Loader2



                size={13}



                className="spin"



              />



              Reading document...



            </div>



          )}



        </header>



        {/* ===================================================



            MESSAGES



            =================================================== */}



        <div

          style={{

            flex: 1,

            overflowY:

              'auto',

            padding: 20,

            display:

              'flex',

            flexDirection:

              'column',

            gap: 18,

          }}

        >



          {messages.map(

            msg => (

              <div

                key={

                  msg.id

                }

                style={{

                  display:

                    'flex',

                  gap: 10,

                  flexDirection:

                    msg.role ===

                    'user'

                      ? 'row-reverse'

                      : 'row',

                }}

              >



                {/* AVATAR */}



                {msg.role === 'ai' ? (
                  <NyayaAIResearchMonogram size={30} radius="50%" />
                ) : (
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background:
                        'linear-gradient(135deg, #059669, #065F46)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                    }}
                  >
                    PS
                  </div>
                )}



                {/* MESSAGE + LIVE WEB SOURCES */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems:
                      msg.role === 'user'
                        ? 'flex-end'
                        : 'flex-start',
                    width: 'min(82%, 760px)',
                    minWidth: 0,
                  }}
                >
                  <div
                    className={
                      msg.role === 'ai'
                        ? 'chat-bubble-ai'
                        : 'chat-bubble-user'
                    }
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      padding: '12px 16px',
                      fontSize: '0.85rem',
                      lineHeight: 1.7,
                      boxSizing: 'border-box',
                    }}
                  >
                    {msg.role === 'ai' ? (
                      <AnimatedMarkdown
                        content={String(
                          msg.content ??
                            '',
                        )}
                        animate={
                          msg.id ===
                          streamingMessageId
                        }
                      />
                    ) : (
                      <div
                        style={{
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {msg.content}
                      </div>
                    )}
                  </div>

                  {msg.role === 'ai' &&
                    Array.isArray(msg.webSources) &&
                    msg.webSources.length > 0 && (
                      <div
                        style={{
                          marginTop: 10,
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            letterSpacing: '0.06em',
                            color: 'var(--text-muted)',
                            marginBottom: 7,
                            textTransform: 'uppercase',
                          }}
                        >
                          Live Web Sources
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 7,
                          }}
                        >
                          {msg.webSources.map(
                            (source, index) => (
                              <a
                                key={`${source.url}-${index}`}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'block',
                                  textDecoration: 'none',
                                  color: 'inherit',
                                  padding: '9px 11px',
                                  border:
                                    '1px solid var(--border)',
                                  borderRadius: 8,
                                  background:
                                    'var(--bg-secondary)',
                                  boxSizing: 'border-box',
                                  width: '100%',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems:
                                      'center',
                                    justifyContent:
                                      'space-between',
                                    gap: 10,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '0.73rem',
                                      fontWeight: 750,
                                      color:
                                        'var(--text)',
                                      overflow: 'hidden',
                                      textOverflow:
                                        'ellipsis',
                                      whiteSpace:
                                        'nowrap',
                                      minWidth: 0,
                                    }}
                                  >
                                    {source.title ||
                                      'Untitled source'}
                                  </div>

                                  <span
                                    style={{
                                      flexShrink: 0,
                                      fontSize: '0.62rem',
                                      color:
                                        'var(--blue)',
                                      fontWeight: 700,
                                    }}
                                  >
                                    Open ↗
                                  </span>
                                </div>

                                {source.site_name && (
                                  <div
                                    style={{
                                      marginTop: 3,
                                      fontSize: '0.62rem',
                                      color:
                                        'var(--blue)',
                                    }}
                                  >
                                    {source.site_name}
                                  </div>
                                )}

                                {source.snippet && (
                                  <div
                                    style={{
                                      marginTop: 5,
                                      fontSize: '0.65rem',
                                      lineHeight: 1.45,
                                      color:
                                        'var(--text-muted)',
                                      display:
                                        '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient:
                                        'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {source.snippet}
                                  </div>
                                )}
                              </a>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )
          )}


          {/* =================================================

              LOADING

              ================================================= */}



          {(loading ||

            uploading) && (

            <div

              style={{

                display:

                  'flex',

                gap: 10,

              }}

            >



              <NyayaAIResearchMonogram size={30} radius="50%" />



              <div

                className="chat-bubble-ai"

                style={{

                  padding:

                    '14px 18px',

                  display:

                    'flex',

                  alignItems:

                    'center',

                  gap: 8,

                }}

              >



                <Loader2

                  size={14}

                  className="spin"

                />



                <span

                  style={{

                    fontSize:

                      '0.78rem',

                    color:

                      'var(--text-muted)',

                  }}

                >

                  {uploading

                    ? 'Extracting and understanding the document...'

                    : researchMode === 'deep'

                      ? 'Running deep legal research with live web sources...'

                      : 'Researching the case...'}

                </span>



              </div>

            </div>

          )}



          <div

            ref={

              bottomRef

            }

          />



        </div>

                {/* ===================================================

            INPUT

            =================================================== */}



        <div

          style={{

            padding:

              '12px 16px',

            borderTop:

              '1px solid var(--border)',

            background:

              'var(--bg-glass)',

            backdropFilter:

              'blur(20px)',

          }}

        >



          <div

            style={{

              display:

                'flex',

              alignItems:

                'flex-end',

              gap: 8,

              background:

                'var(--bg-secondary)',

              border:

                '1px solid var(--border)',

              borderRadius: 12,

              padding:

                '8px 8px 8px 14px',

            }}

          >



            <textarea

              value={input}

              onChange={e =>

                setInput(

                  e.target

                    .value,

                )

              }

              onKeyDown={e => {

                if (

                  e.key ===

                    'Enter' &&

                  !e.shiftKey

                ) {

                  e.preventDefault()



                  sendQuery(

                    input,

                  )

                }

              }}

              placeholder="Ask about the case, document, legal issue, sections, evidence, judgments, or drafting..."

              rows={1}

              style={{

                flex: 1,

                background:

                  'none',

                border:

                  'none',

                outline:

                  'none',

                resize:

                  'none',

                fontSize:

                  '0.875rem',

                color:

                  'var(--text)',

                lineHeight:

                  1.6,

                fontFamily:

                  'inherit',

                maxHeight:

                  100,

                overflowY:

                  'auto',

                paddingTop: 4,

              }}

            />



            <button

              onClick={() =>

                sendQuery(

                  input,

                )

              }

              disabled={

                !input.trim() ||

                loading ||

                uploading

              }

              className="btn-primary"

              style={{

                width: 34,

                height: 34,

                borderRadius: 8,

                border: 'none',

                cursor:

                  'pointer',

                display:

                  'flex',

                alignItems:

                  'center',

                justifyContent:

                  'center',

                opacity:

                  !input.trim() ||

                  loading ||

                  uploading

                    ? 0.5

                    : 1,

                flexShrink: 0,

              }}

            >

              <Send

                size={15}

              />

            </button>



          </div>

        </div>



      </main>



      {/* =====================================================

          STYLES

          ===================================================== */}



      <style>{`

        .spin {

          animation:

            research-spin

            0.9s linear

            infinite;

        }



        @keyframes research-spin {

          from {

            transform:

              rotate(0deg);

          }



          to {

            transform:

              rotate(360deg);

          }

        }



        .chat-bubble-ai p {

          margin:

            0 0 8px;

        }



        .chat-bubble-ai p:last-child {

          margin-bottom:

            0;

        }



        .chat-bubble-ai h1,

        .chat-bubble-ai h2,

        .chat-bubble-ai h3 {

          margin:

            12px 0 7px;

          font-size:

            0.95rem;

        }



        .chat-bubble-ai ul,

        .chat-bubble-ai ol {

          padding-left:

            20px;

          margin:

            7px 0;

        }



        .chat-bubble-ai li {

          margin:

            3px 0;

        }



        .chat-bubble-ai table {

          border-collapse:

            collapse;

          width:

            100%;

          margin:

            8px 0;

        }



        .chat-bubble-ai th,

        .chat-bubble-ai td {

          border:

            1px solid var(--border);

          padding:

            5px 7px;

          text-align:

            left;

        }



        .chat-bubble-ai code {

          font-size:

            0.82em;

        }



        .chat-bubble-ai pre {

          overflow-x:

            auto;

          padding:

            10px;

          border-radius:

            8px;

          background:

            var(--bg-secondary);

        }



        @media (max-width: 1050px) {

          .research-history {

            display:

              none !important;

          }

        }



        @media (max-width: 800px) {

          .research-layout {

            flex-direction:

              column !important;

            height:

              auto !important;

          }



          .research-left {

            width:

              100% !important;

            max-height:

              420px;

          }



          .research-layout > main {

            min-height:

              680px;

          }

        }

      `}</style>



    </div>

  )

}
