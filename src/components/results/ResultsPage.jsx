import React, { useRef, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toPng } from 'html-to-image'
import { 
  RotateCcw, Share2, Download, Twitter, Facebook, Copy, Check,
  Trophy, Zap, Target, Clock, AlertCircle, TrendingUp
} from 'lucide-react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Confetti from 'react-confetti'
import toast, { Toaster } from 'react-hot-toast'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const ResultsPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const shareCardRef = useRef(null)
  
  const [copied, setCopied] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [profile, setProfile] = useState(null)

  // Get result data from navigation state
  const {
    target = '',
    input = '',
    durationSec = 0,
    wpm = 0,
    rawWpm = 0,
    acc = 0,
    mistakes = 0,
    mistakenIndices = [],
    corrections = 0,
    mode = 'english',
    subMode = '',
  } = location.state || {}

  // Fetch user profile
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('display_name, avatar_url, current_streak')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data))
    }
  }, [user])

  // Window size for confetti
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Show confetti for good results
  useEffect(() => {
    if (wpm >= 60 || acc >= 98) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)
    }
  }, [wpm, acc])

  // Generate chart data
  const generateChartData = () => {
    const seconds = Math.max(1, Math.ceil(durationSec))
    const timeLabels = Array.from({ length: seconds }, (_, i) => (i + 1).toString())
    
    // Calculate cumulative stats per second
    const mistakenSet = new Set(mistakenIndices)
    const cumulativeCorrect = Array(seconds).fill(0)
    const cumulativeMistakes = Array(seconds).fill(0)
    
    if (input && input.length > 0) {
      for (let i = 0; i < input.length; i++) {
        const charTime = ((i + 1) * durationSec) / input.length
        const secIdx = Math.min(Math.floor(charTime), seconds - 1)
        if (mistakenSet.has(i)) {
          cumulativeMistakes[secIdx] += 1
        } else {
          cumulativeCorrect[secIdx] += 1
        }
      }
      
      // Make cumulative
      for (let i = 1; i < seconds; i++) {
        cumulativeCorrect[i] += cumulativeCorrect[i - 1]
        cumulativeMistakes[i] += cumulativeMistakes[i - 1]
      }
    }

    // Calculate WPM per second
    const wpmData = cumulativeCorrect.map((correct, i) => {
      const elapsed = i + 1
      return elapsed > 0 ? Math.round((correct / 5) / (elapsed / 60)) : 0
    })

    return {
      labels: timeLabels,
      datasets: [
        {
          label: 'WPM',
          data: wpmData,
          borderColor: '#facc15',
          backgroundColor: 'rgba(250, 204, 21, 0.1)',
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Errors',
          data: cumulativeMistakes,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#facc15',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#6b7280' },
        title: {
          display: true,
          text: 'Time (seconds)',
          color: '#6b7280',
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#6b7280' },
      },
    },
  }

  // Generate shareable image
  const generateShareImage = async () => {
    if (!shareCardRef.current) return null
    
    try {
      const dataUrl = await toPng(shareCardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#101826',
      })
      return dataUrl
    } catch (error) {
      console.error('Failed to generate image:', error)
      return null
    }
  }

  // Share to social media
  const handleShare = async (platform) => {
    setIsSharing(true)
    
    try {
      // Generate and upload image
      const imageData = await generateShareImage()
      let imageUrl = ''
      
      if (imageData && user?.id) {
        // Convert base64 to blob
        const response = await fetch(imageData)
        const blob = await response.blob()
        
        // Upload to Supabase Storage
        const fileName = `results/${user.id}/${Date.now()}.png`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('shared-results')
          .upload(fileName, blob, { contentType: 'image/png' })
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('shared-results')
            .getPublicUrl(fileName)
          imageUrl = urlData.publicUrl
        }
      }
      
      // Generate share URL
      const shareText = `🏎️ Just typed ${wpm} WPM with ${acc}% accuracy on KeyDash!\n\nMode: ${mode}${subMode ? ` (${subMode})` : ''}\nTime: ${durationSec.toFixed(1)}s\n\nCan you beat my score? 🔥`
      const siteUrl = 'https://keydash.shresthamanish.info.np'
      
      switch (platform) {
        case 'twitter':
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(siteUrl)}`,
            '_blank'
          )
          break
        case 'facebook':
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}&quote=${encodeURIComponent(shareText)}`,
            '_blank'
          )
          break
        case 'copy':
          await navigator.clipboard.writeText(`${shareText}\n\n${siteUrl}`)
          setCopied(true)
          toast.success('Copied to clipboard!')
          setTimeout(() => setCopied(false), 2000)
          break
        case 'download':
          if (imageData) {
            const link = document.createElement('a')
            link.download = `keydash-result-${wpm}wpm.png`
            link.href = imageData
            link.click()
            toast.success('Image downloaded!')
          }
          break
      }
    } catch (error) {
      console.error('Share error:', error)
      toast.error('Failed to share. Please try again.')
    } finally {
      setIsSharing(false)
    }
  }

  // Handle play again
  const handlePlayAgain = () => {
    navigate('/')
  }

  // Handle retry same text
  const handleRetry = () => {
    navigate('/', { state: { retryText: target, mode, subMode } })
  }

  // No result data
  if (!location.state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertCircle className="w-16 h-16 text-gray-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Result Found</h2>
        <p className="text-gray-400 mb-6">Complete a typing test to see your results</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-300 transition-colors"
        >
          Start Typing
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <Toaster position="top-center" />
      
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          colors={['#facc15', '#fbbf24', '#f59e0b', '#22c55e', '#3b82f6']}
        />
      )}

      <div className="max-w-4xl mx-auto">
        {/* Share Card (hidden, used for image generation) */}
        <div className="fixed -left-[9999px] top-0">
          <div
            ref={shareCardRef}
            className="w-[600px] h-[400px] bg-gradient-to-br from-[#101826] to-[#1a1f2e] p-8 flex flex-col"
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <img src="/logo.svg" alt="KeyDash" className="h-10" />
              <span className="text-2xl font-bold text-white">KeyDash</span>
            </div>

            {/* Main Stats */}
            <div className="flex-1 flex items-center justify-around">
              <div className="text-center">
                <div className="text-6xl font-bold text-yellow-400">{wpm}</div>
                <div className="text-gray-400 mt-1">WPM</div>
              </div>
              <div className="text-center">
                <div className="text-6xl font-bold text-green-400">{acc}%</div>
                <div className="text-gray-400 mt-1">Accuracy</div>
              </div>
            </div>

            {/* Details */}
            <div className="flex justify-between text-gray-400 text-sm border-t border-gray-700 pt-4">
              <span>Mode: {mode}{subMode ? ` (${subMode})` : ''}</span>
              <span>Time: {durationSec.toFixed(1)}s</span>
              <span>Errors: {mistakes}</span>
            </div>

            {/* User */}
            {profile && (
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-700">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 bg-gray-700 rounded-full" />
                )}
                <span className="text-white">{profile.display_name}</span>
                {profile.current_streak > 0 && (
                  <span className="text-orange-400">🔥 {profile.current_streak} day streak</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Visible Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {wpm >= 100 ? '🚀 Incredible!' : wpm >= 70 ? '🔥 Great job!' : wpm >= 50 ? '👍 Nice work!' : 'Keep practicing!'}
            </h1>
            <p className="text-gray-400">
              {mode.charAt(0).toUpperCase() + mode.slice(1)} mode
              {subMode ? ` • ${subMode}` : ''}
            </p>
          </div>

          {/* Main Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-2xl p-6 text-center border border-yellow-500/20"
            >
              <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-4xl md:text-5xl font-bold text-yellow-400">{wpm}</div>
              <div className="text-gray-400 text-sm mt-1">WPM</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-2xl p-6 text-center border border-green-500/20"
            >
              <Target className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-4xl md:text-5xl font-bold text-green-400">{acc}%</div>
              <div className="text-gray-400 text-sm mt-1">Accuracy</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl p-6 text-center border border-blue-500/20"
            >
              <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <div className="text-4xl md:text-5xl font-bold text-blue-400">{durationSec.toFixed(1)}s</div>
              <div className="text-gray-400 text-sm mt-1">Time</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-2xl p-6 text-center border border-red-500/20"
            >
              <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <div className="text-4xl md:text-5xl font-bold text-red-400">{mistakes}</div>
              <div className="text-gray-400 text-sm mt-1">Errors</div>
            </motion.div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#1a1f2e] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-300">{rawWpm || wpm}</div>
              <div className="text-gray-500 text-sm">Raw WPM</div>
            </div>
            <div className="bg-[#1a1f2e] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-300">{input?.length || 0}</div>
              <div className="text-gray-500 text-sm">Characters</div>
            </div>
            <div className="bg-[#1a1f2e] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-300">{corrections || 0}</div>
              <div className="text-gray-500 text-sm">Corrections</div>
            </div>
          </div>

          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
              Performance Over Time
            </h3>
            <div className="h-64">
              <Line data={generateChartData()} options={chartOptions} />
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePlayAgain}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-300 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              New Test
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRetry}
              className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Retry Same Text
            </motion.button>
          </div>

          {/* Share Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-yellow-400" />
              Share Your Result
            </h3>
            
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => handleShare('twitter')}
                disabled={isSharing}
                className="flex items-center gap-2 px-4 py-2 bg-[#1DA1F2] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Twitter className="w-4 h-4" />
                Twitter
              </button>

              <button
                onClick={() => handleShare('facebook')}
                disabled={isSharing}
                className="flex items-center gap-2 px-4 py-2 bg-[#4267B2] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Facebook className="w-4 h-4" />
                Facebook
              </button>

              <button
                onClick={() => handleShare('copy')}
                disabled={isSharing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>

              <button
                onClick={() => handleShare('download')}
                disabled={isSharing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </motion.div>

          {/* Typed Text Review */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50"
          >
            <h3 className="text-lg font-semibold mb-4">Text Review</h3>
            <div className="font-mono text-lg leading-relaxed">
              {target.split('').map((char, idx) => {
                const isTyped = idx < input?.length
                const isCorrect = isTyped && input[idx] === char
                const isError = isTyped && input[idx] !== char
                
                let className = 'text-gray-500'
                if (isCorrect) className = 'text-green-400'
                if (isError) className = 'text-red-400 bg-red-400/20 px-0.5 rounded'
                
                return (
                  <span key={idx} className={className}>
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default ResultsPage
