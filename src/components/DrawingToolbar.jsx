import { useStore } from '@store'
import { TOOLS } from '@utils/constants'

export default function DrawingToolbar() {
  const { selectedTool, setSelectedTool, clearDrawings } = useStore(s => ({
    selectedTool:    s.selectedTool,
    setSelectedTool: s.setSelectedTool,
    clearDrawings:   s.clearDrawings,
  }))

  return (
    <div className="w-11 bg-tv-panel border-r border-tv-border flex flex-col items-center py-2 gap-1 flex-shrink-0">
      {TOOLS.map(tool => (
        <button
          key={tool.id}
          onClick={() => setSelectedTool(tool.id)}
          title={tool.label}
          className={`
            w-8 h-8 rounded flex items-center justify-center text-base
            transition-colors cursor-pointer
            ${selectedTool === tool.id
              ? 'bg-tv-blue text-white'
              : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'}
          `}
        >
          {tool.icon}
        </button>
      ))}

      <div className="flex-1" />

      {/* Clear drawings */}
      <button
        onClick={clearDrawings}
        title="Clear all drawings"
        className="w-8 h-8 rounded flex items-center justify-center text-tv-red hover:bg-tv-red/10 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}
