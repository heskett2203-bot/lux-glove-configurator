import React, {useState} from 'react'
import GloveConfigurator from './GloveConfigurator'

export default function App(){
  const [started, setStarted] = useState(false)
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="p-6 border-b border-gray-800 flex items-center justify-between">
        <div className="text-2xl font-bold">LUX Glove Co. Custom Builder</div>
      </header>

      {!started ? (
        <main className="flex items-center justify-center h-[80vh]">
          <div className="max-w-2xl text-center p-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 drop-shadow-lg">
            <h1 className="text-4xl font-extrabold mb-4">Design your game-day glove</h1>
            <p className="text-gray-300 mb-6">Choose your style, colors, and personalization. Built for performance & pride.</p>
            <button className="px-6 py-3 bg-yellow-500 text-black font-semibold rounded" onClick={()=>setStarted(true)}>Start Designing</button>
          </div>
        </main>
      ) : (
        <main className="p-6">
          <GloveConfigurator />
        </main>
      )}
    </div>
  )
}
