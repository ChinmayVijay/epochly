import styles from './TopicPills.module.css'

const topicIcons = {
  "World War II": "🪖",
  "Cold War": "❄️",
  "Bitcoin": "₿",
  "iPhone": "📱",
  "French Revolution": "🗼",
  "Space Race": "🚀",
  "Nelson Mandela": "🕊️",
  "Arab Spring": "🌹",
  "Internet History": "🌐",
  "India Independence": "🇮🇳",
  "Apple": "🍎",
  "Climate Change": "🌍",
  "World War I": "⚔️",
  "AI History": "🤖",
  "Amazon": "📦",
  "COVID-19": "🦠",
}

export default function TopicPills({ topics, onSelect }) {
  const chunkSize = Math.ceil(topics.length / 3)
  const rows = []
  for (let i = 0; i < topics.length; i += chunkSize) {
    rows.push(topics.slice(i, i + chunkSize))
  }

  return (
    <div className={styles.container}>
      {rows.map((row, idx) => (
        <div key={idx} className={styles.pills}>
          {row.map(t => (
            <button key={t} className={styles.pill} onClick={() => onSelect(t)}>
              <span className={styles.icon}>{topicIcons[t] || "📜"}</span>
              {t}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
