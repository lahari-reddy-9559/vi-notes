import { useState, useRef } from 'react'
import './App.css'

interface PasteEvent {
  time: string
  charsAdded: number
  keysPressed: number
  ratio: string
}

interface SuspiciousEvent extends PasteEvent {
  severity: 'low' | 'medium' | 'high'
}

interface Stats {
  keysPressed: number
  charsTyped: number
  charsPasted: number
  pasteEvents: PasteEvent[]
  suspiciousEvents: SuspiciousEvent[]
}

interface Notification {
  id: number
  message: string
  type: 'warning' | 'info' | 'error'
}

export default function App() {
  const [text, setText] = useState<string>('')
  const [stats, setStats] = useState<Stats>({
    keysPressed: 0,
    charsTyped: 0,
    charsPasted: 0,
    pasteEvents: [],
    suspiciousEvents: []
  })
  const [monitoring, setMonitoring] = useState<boolean>(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isPasteHighlighted, setIsPasteHighlighted] = useState<boolean>(false)

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const lastTextRef = useRef<string>('')
  const keysCountRef = useRef<number>(0)

  const addNotification = (message: string, type: Notification['type'] = 'warning') => {
    const id = Date.now()
    const notification: Notification = { id, message, type }

    setNotifications(prev => [...prev, notification])

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 3000)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!monitoring) return

    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const charsAdded = pastedText.length

    if (charsAdded > 0 && textAreaRef.current) {
      const cursorPos = textAreaRef.current.selectionStart
      const beforeText = text.substring(0, cursorPos)
      const afterText = text.substring(cursorPos)
      const newText = beforeText + pastedText + afterText

      setText(newText)
      lastTextRef.current = newText

      setIsPasteHighlighted(true)
      setTimeout(() => setIsPasteHighlighted(false), 2000)

      const pasteEvent: PasteEvent = {
        time: new Date().toLocaleTimeString(),
        charsAdded,
        keysPressed: keysCountRef.current,
        ratio:
          keysCountRef.current > 0
            ? (charsAdded / keysCountRef.current).toFixed(2)
            : '∞'
      }

      setStats(prev => ({
        ...prev,
        charsPasted: prev.charsPasted + charsAdded,
        pasteEvents: [...prev.pasteEvents, pasteEvent],
        suspiciousEvents: [
          ...prev.suspiciousEvents,
          {
            ...pasteEvent,
            severity:
              keysCountRef.current > 0 &&
              charsAdded / keysCountRef.current > 10
                ? 'high'
                : 'medium'
          }
        ]
      }))

      addNotification(`Paste detected: ${charsAdded} characters`, 'warning')
      keysCountRef.current = 0
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setText(newText)
    lastTextRef.current = newText
  }

  const handleKeyDown = () => {
    if (monitoring) {
      keysCountRef.current++

      setStats(prev => ({
        ...prev,
        keysPressed: prev.keysPressed + 1
      }))
    }
  }

  const handleKeyUp = () => {
    if (monitoring && textAreaRef.current) {
      setStats(prev => ({
        ...prev,
        charsTyped: textAreaRef.current!.value.length
      }))
    }
  }
const saveLogToBackend = async () => {
  try {
    const res = await fetch('http://localhost:5000/save-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textLength: stats.charsTyped,
        charsPasted: stats.charsPasted,
        keysPressed: stats.keysPressed,
        pasteEvents: stats.pasteEvents
      })
    })

    const data = await res.json()
    console.log("Saved:", data)
  } catch (err) {
    console.error("Error:", err)
  }
}
  const toggleMonitoring = () => {
  if (monitoring) {
    saveLogToBackend()
  } else {
    keysCountRef.current = 0
    lastTextRef.current = text
  }

  setMonitoring(prev => !prev)
}

  const reset = () => {
    setText('')
    setStats({
      keysPressed: 0,
      charsTyped: 0,
      charsPasted: 0,
      pasteEvents: [],
      suspiciousEvents: []
    })
    setIsPasteHighlighted(false)
    keysCountRef.current = 0
    lastTextRef.current = ''
    setMonitoring(false)
  }

  const pasteCount = stats.pasteEvents.length

  const suspicionLevel =
    pasteCount === 0
      ? 'None'
      : pasteCount > 5
      ? 'Very High'
      : pasteCount > 3
      ? 'High'
      : pasteCount > 1
      ? 'Medium'
      : 'Low'

  return (
    <div className="container">
      <div className="header">
        <h1>Text Editor</h1>
        <p>Advanced text analysis and monitoring</p>
      </div>

      <div className="controls">
        <button
          className={`btn btn-primary ${monitoring ? 'active' : ''}`}
          onClick={toggleMonitoring}
        >
          {monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
        <button className="btn btn-secondary" onClick={reset}>
          Clear
        </button>
      </div>

      <div className="main-content">
        <div className="editor-section">
          <h2>Document</h2>
          <textarea
            ref={textAreaRef}
            className={`notepad ${isPasteHighlighted ? 'pasted' : ''}`}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onPaste={handlePaste}
            placeholder="Enter text here..."
            disabled={!monitoring}
          />
        </div>

        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Keys Pressed</div>
              <div className="stat-value">{stats.keysPressed}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Characters</div>
              <div className="stat-value">{stats.charsTyped}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pasted</div>
              <div className="stat-value pasted">{stats.charsPasted}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Paste Events</div>
              <div className="stat-value">{pasteCount}</div>
            </div>
          </div>

          <div className={`suspicion-card ${suspicionLevel.toLowerCase().replace(' ', '-')}`}>
            <div className="suspicion-header">Status</div>
            <div className="suspicion-level">{suspicionLevel}</div>
            <div className="suspicion-bar">
              <div
                className="suspicion-fill"
                style={{ width: `${(pasteCount / 10) * 100}%` }}
              />
            </div>
          </div>

          {stats.pasteEvents.length > 0 && (
            <div className="events-card">
              <h3>Activity Log</h3>
              <div className="events-list">
                {stats.pasteEvents.map((event, idx) => (
                  <div key={idx} className="event-item">
                    <span className="event-time">{event.time}</span>
                    <span className="event-chars">+{event.charsAdded} chars</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {monitoring && (
        <div className="monitoring-indicator">
          <span className="pulse"></span> Monitoring
        </div>
      )}

      <div className="notifications-container">
        {notifications.map(notif => (
          <div key={notif.id} className={`toast ${notif.type}`}>
            {notif.message}
          </div>
        ))}
      </div>
    </div>
  )
}