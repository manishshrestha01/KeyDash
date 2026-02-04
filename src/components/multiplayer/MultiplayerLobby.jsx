import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Copy, Check, Play, Crown, Loader2, 
  ArrowLeft, RefreshCw, Trophy, Zap
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useMultiplayerStore } from '../../store'
import toast, { Toaster } from 'react-hot-toast'
import TypingEngine from '../typing/TypingEngine'

// Generate random room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Generate race text
const generateRaceText = () => {
  const sentences = [
    "The quick brown fox jumps over the lazy dog.",
    "Pack my box with five dozen liquor jugs.",
    "How vexingly quick daft zebras jump!",
    "The five boxing wizards jump quickly.",
    "Sphinx of black quartz, judge my vow.",
    "Two driven jocks help fax my big quiz.",
    "The jay, pig, fox, zebra and my wolves quack!",
    "Sympathizing would fix Quaker objectives.",
  ]
  
  const selected = []
  const count = Math.floor(Math.random() * 2) + 2 // 2-3 sentences
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * sentences.length)
    selected.push(sentences[idx])
  }
  return selected.join(' ')
}

const MultiplayerLobby = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const {
    currentRoom, roomCode, isHost, status, participants, raceText, countdown,
    setRoom, setIsHost, setParticipants, setStatus, setCountdown, updateParticipant, leaveRoom
  } = useMultiplayerStore()

  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [myProgress, setMyProgress] = useState(0)
  const [myWpm, setMyWpm] = useState(0)
  const [finished, setFinished] = useState(false)
  const [results, setResults] = useState([])

  const channelRef = useRef(null)

  // Fetch user profile
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data))
    }
  }, [user])

  // Check if all players have finished
  useEffect(() => {
    if (status === 'racing' && participants.length > 0) {
      const allFinished = participants.every(p => p.progress >= 100 || p.finished_at)
      if (allFinished) {
        // All players finished - update room status
        setStatus('finished')
        if (isHost && currentRoom?.id) {
          supabase
            .from('multiplayer_rooms')
            .update({ status: 'finished', finished_at: new Date().toISOString() })
            .eq('id', currentRoom.id)
        }
      }
    }
  }, [participants, status, isHost, currentRoom?.id])

  // Subscribe to room changes
  useEffect(() => {
    if (!currentRoom?.id) return

    // Initial fetch of participants
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('multiplayer_participants')
        .select('*')
        .eq('room_id', currentRoom.id)
      if (data) setParticipants(data)
    }
    fetchParticipants()

    // Subscribe to room updates
    channelRef.current = supabase
      .channel(`room:${currentRoom.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'multiplayer_rooms',
        filter: `id=eq.${currentRoom.id}`,
      }, (payload) => {
        if (payload.new) {
          setRoom(payload.new)
          setStatus(payload.new.status)
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'multiplayer_participants',
        filter: `room_id=eq.${currentRoom.id}`,
      }, async (payload) => {
        // Refresh participants list
        const { data } = await supabase
          .from('multiplayer_participants')
          .select('*')
          .eq('room_id', currentRoom.id)
        setParticipants(data || [])
      })
      .on('broadcast', { event: 'countdown' }, ({ payload }) => {
        setStatus('countdown')
        setCountdown(payload.count)
      })
      .on('broadcast', { event: 'start' }, () => {
        setStatus('racing')
      })
      .on('broadcast', { event: 'progress' }, ({ payload }) => {
        updateParticipant(payload.userId, {
          progress: payload.progress,
          wpm: payload.wpm,
        })
      })
      .on('broadcast', { event: 'finish' }, ({ payload }) => {
        updateParticipant(payload.userId, {
          progress: 100,
          wpm: payload.wpm,
          finished_at: new Date().toISOString(),
        })
      })
      .on('broadcast', { event: 'new_race' }, ({ payload }) => {
        // Reset state for new race - get fresh currentRoom from store
        const { currentRoom: freshRoom } = useMultiplayerStore.getState()
        setRoom({ ...freshRoom, status: 'waiting', race_text: payload.text })
        setStatus('waiting')
        setFinished(false)
        setMyProgress(0)
        setMyWpm(0)
        toast.info('New race starting!')
      })
      .on('presence', { event: 'sync' }, () => {
        // Handle presence sync
      })
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [currentRoom?.id])

  // Create a new room
  const handleCreateRoom = async () => {
    // Wait for auth to be ready
    if (authLoading) return
    
    if (!user?.id) {
      navigate('/login')
      return
    }

    setLoading(true)
    try {
      const code = generateRoomCode()
      const text = generateRaceText()

      // Fetch fresh profile data to ensure we have the display name
      let displayName = profile?.display_name
      let avatarUrl = profile?.avatar_url
      
      if (!displayName) {
        const { data: freshProfile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single()
        
        if (freshProfile) {
          displayName = freshProfile.display_name
          avatarUrl = freshProfile.avatar_url
          setProfile(freshProfile)
        }
      }
      
      // Use email username as fallback
      if (!displayName) {
        displayName = user.email?.split('@')[0] || 'Host'
      }

      const { data: room, error } = await supabase
        .from('multiplayer_rooms')
        .insert({
          room_code: code,
          host_id: user.id,
          race_text: text,
          status: 'waiting',
          max_players: 5,
          current_players: 1,
        })
        .select()
        .single()

      if (error) throw error

      // Add self as participant
      const { data: participant, error: participantError } = await supabase
        .from('multiplayer_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          is_ready: true,
        })
        .select()
        .single()

      if (participantError) throw participantError

      // Set room and initial participant in store
      setRoom(room)
      setIsHost(true)
      setParticipants([participant])
      
      toast.success('Room created!')
    } catch (error) {
      console.error('Error creating room:', error)
      toast.error('Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  // Join a room
  const handleJoinRoom = async () => {
    // Wait for auth to be ready
    if (authLoading) return
    
    if (!user?.id) {
      navigate('/login')
      return
    }

    if (!joinCode.trim()) {
      toast.error('Enter a room code')
      return
    }

    setLoading(true)
    try {
      const { data: room, error: roomError } = await supabase
        .from('multiplayer_rooms')
        .select('*')
        .eq('room_code', joinCode.toUpperCase())
        .single()

      if (roomError || !room) {
        toast.error('Room not found')
        setLoading(false)
        return
      }

      if (room.status !== 'waiting') {
        toast.error('Race already started')
        setLoading(false)
        return
      }

      if (room.current_players >= room.max_players) {
        toast.error('Room is full')
        setLoading(false)
        return
      }

      // Check if user is already in the room
      const { data: existingParticipant } = await supabase
        .from('multiplayer_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single()

      if (!existingParticipant) {
        // Fetch fresh profile data to ensure we have the display name
        let displayName = profile?.display_name
        let avatarUrl = profile?.avatar_url
        
        if (!displayName) {
          const { data: freshProfile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', user.id)
            .single()
          
          if (freshProfile) {
            displayName = freshProfile.display_name
            avatarUrl = freshProfile.avatar_url
            setProfile(freshProfile)
          }
        }
        
        // Use email username as fallback
        if (!displayName) {
          displayName = user.email?.split('@')[0] || 'Player'
        }

        // Add self as participant
        const { error: joinError } = await supabase.from('multiplayer_participants').insert({
          room_id: room.id,
          user_id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
        })

        if (joinError) {
          console.error('Error joining:', joinError)
          toast.error('Failed to join room')
          setLoading(false)
          return
        }

        // Update room player count
        await supabase
          .from('multiplayer_rooms')
          .update({ current_players: room.current_players + 1 })
          .eq('id', room.id)
      }

      // Fetch all participants
      const { data: participantsData } = await supabase
        .from('multiplayer_participants')
        .select('*')
        .eq('room_id', room.id)

      // Set room and participants in store
      setRoom(room)
      setIsHost(false)
      setParticipants(participantsData || [])
      
      toast.success('Joined room!')
    } catch (error) {
      console.error('Error joining room:', error)
      toast.error('Failed to join room')
    } finally {
      setLoading(false)
    }
  }

  // Start the race (host only)
  const handleStartRace = async () => {
    if (!isHost || !currentRoom?.id) return
    
    // Require at least 2 participants
    if (participants.length < 2) {
      toast.error('Need at least 2 players to start the race')
      return
    }

    try {
      // Countdown
      setStatus('countdown')
      for (let i = 3; i >= 0; i--) {
        setCountdown(i)
        await supabase.channel(`room:${currentRoom.id}`).send({
          type: 'broadcast',
          event: 'countdown',
          payload: { count: i },
        })
        await new Promise(r => setTimeout(r, 1000))
      }

      // Start race
      await supabase
        .from('multiplayer_rooms')
        .update({ status: 'racing', started_at: new Date().toISOString() })
        .eq('id', currentRoom.id)

      await supabase.channel(`room:${currentRoom.id}`).send({
        type: 'broadcast',
        event: 'start',
        payload: {},
      })
    } catch (error) {
      console.error('Error starting race:', error)
      toast.error('Failed to start race')
    }
  }

  // Start new race (host only)
  const handleNewRace = async () => {
    if (!isHost || !currentRoom?.id) return

    try {
      setLoading(true)
      
      // Generate new text
      const newText = generateRaceText()
      
      // Reset room status and text in database
      await supabase
        .from('multiplayer_rooms')
        .update({ 
          status: 'waiting', 
          race_text: newText,
          started_at: null 
        })
        .eq('id', currentRoom.id)

      // Reset all participants' progress
      await supabase
        .from('multiplayer_participants')
        .update({ 
          progress: 0, 
          wpm: 0, 
          finished_at: null 
        })
        .eq('room_id', currentRoom.id)

      // Update local state
      setRoom({ ...currentRoom, status: 'waiting', race_text: newText })
      setStatus('waiting')
      setFinished(false)
      setMyProgress(0)
      setMyWpm(0)

      // Broadcast new race event
      await supabase.channel(`room:${currentRoom.id}`).send({
        type: 'broadcast',
        event: 'new_race',
        payload: { text: newText },
      })

      toast.success('New race ready!')
    } catch (error) {
      console.error('Error starting new race:', error)
      toast.error('Failed to start new race')
    } finally {
      setLoading(false)
    }
  }

  // Handle progress update - memoized to prevent infinite loops
  const handleProgress = useCallback(async (progress, wpm) => {
    if (!currentRoom?.id || !user?.id) return

    setMyProgress(progress)
    setMyWpm(wpm)

    // Update own participant record
    await supabase
      .from('multiplayer_participants')
      .update({ progress, wpm })
      .eq('room_id', currentRoom.id)
      .eq('user_id', user.id)

    // Broadcast progress
    await supabase.channel(`room:${currentRoom.id}`).send({
      type: 'broadcast',
      event: 'progress',
      payload: { userId: user.id, progress, wpm },
    })
  }, [currentRoom?.id, user?.id])

  // Handle typing complete - memoized to prevent re-renders
  const handleComplete = useCallback(async (resultData) => {
    if (!currentRoom?.id || !user?.id) return

    setFinished(true)

    // Update participant record
    await supabase
      .from('multiplayer_participants')
      .update({
        progress: 100,
        wpm: resultData.wpm,
        accuracy: resultData.acc,
        errors: resultData.mistakes,
        finished_at: new Date().toISOString(),
      })
      .eq('room_id', currentRoom.id)
      .eq('user_id', user.id)

    // Broadcast finish
    await supabase.channel(`room:${currentRoom.id}`).send({
      type: 'broadcast',
      event: 'finish',
      payload: { userId: user.id, wpm: resultData.wpm },
    })

    // Save to typing history
    await supabase.from('typing_history').insert({
      user_id: user.id,
      mode: 'multiplayer',
      sub_mode: currentRoom?.room_code || null,
      original_text: raceText || currentRoom?.race_text || '',
      typed_text: resultData.input || '',
      wpm: Math.round(resultData.wpm || 0),
      raw_wpm: Math.round(resultData.rawWpm || resultData.wpm || 0),
      accuracy: parseFloat((resultData.acc || 100).toFixed(2)),
      errors: resultData.mistakes || 0,
      correct_chars: resultData.correctChars || 0,
      total_chars: resultData.totalChars || 0,
      duration_seconds: parseFloat((resultData.durationSec || 0).toFixed(2)),
      mistake_indices: resultData.mistakenIndices || [],
      corrections: resultData.corrections || 0,
      is_completed: true,
    })
  }, [currentRoom?.id, currentRoom?.room_code, currentRoom?.race_text, user?.id, raceText])

  // Copy room code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    toast.success('Code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  // Leave room
  const handleLeaveRoom = async () => {
    if (currentRoom?.id && user?.id) {
      await supabase
        .from('multiplayer_participants')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id)

      if (isHost) {
        // Delete room if host leaves
        await supabase
          .from('multiplayer_rooms')
          .delete()
          .eq('id', currentRoom.id)
      }
    }
    leaveRoom()
  }

  // Not in a room - show lobby
  if (!currentRoom) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <Toaster position="top-center" />

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400/20 rounded-2xl mb-4">
            <Users className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Multiplayer Race</h1>
          <p className="text-gray-400">Race against friends in real-time</p>
        </div>

        <div className="space-y-6">
          {/* Create Room */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50"
          >
            <h2 className="text-xl font-semibold mb-4">Create a Room</h2>
            <p className="text-gray-400 mb-4">
              Start a new race and invite friends with a room code
            </p>
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-300 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Create Room
                </>
              )}
            </button>
          </motion.div>

          {/* Join Room */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50"
          >
            <h2 className="text-xl font-semibold mb-4">Join a Room</h2>
            <p className="text-gray-400 mb-4">
              Enter a room code to join an existing race
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter code..."
                maxLength={6}
                className="flex-1 px-4 py-3 bg-[#252b3b] border border-gray-700 rounded-xl
                         text-white text-center text-xl tracking-widest font-mono uppercase
                         placeholder-gray-500 focus:outline-none focus:border-yellow-400/50"
              />
              <button
                onClick={handleJoinRoom}
                disabled={loading || !joinCode.trim()}
                className="px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // In a room - show waiting/racing/results
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleLeaveRoom}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Leave Room
        </button>

        {/* Room Code */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400">Room Code:</span>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-4 py-2 bg-[#252b3b] rounded-lg font-mono text-xl tracking-widest"
          >
            {roomCode}
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {status === 'countdown' && countdown >= 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className={`text-9xl font-bold ${countdown === 0 ? 'text-green-400' : 'text-yellow-400'}`}
            >
              {countdown === 0 ? 'GO!' : countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting State */}
      {status === 'waiting' && (
        <div className="space-y-6">
          {/* Participants */}
          <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-yellow-400" />
              Players ({participants.length}/5)
            </h2>

            <div className="space-y-3">
              {participants.map((p, idx) => (
                <div
                  key={p.user_id}
                  className="flex items-center gap-3 p-3 bg-[#252b3b] rounded-xl"
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.display_name || 'Player'}</span>
                      {p.user_id === currentRoom.host_id && (
                        <Crown className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                  </div>
                  {p.is_ready && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                      Ready
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Start Button (Host only) */}
          {isHost && (
            <motion.button
              whileHover={{ scale: participants.length >= 2 ? 1.02 : 1 }}
              whileTap={{ scale: participants.length >= 2 ? 0.98 : 1 }}
              onClick={handleStartRace}
              disabled={participants.length < 2}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-yellow-400 text-black rounded-xl font-bold text-lg hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-6 h-6" />
              {participants.length < 2 ? 'Waiting for players...' : 'Start Race'}
            </motion.button>
          )}

          {!isHost && (
            <div className="text-center text-gray-400">
              Waiting for host to start the race...
            </div>
          )}
        </div>
      )}

      {/* Racing State */}
      {status === 'racing' && (
        <div className="space-y-6">
          {/* Progress Bars */}
          <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50">
            <h2 className="text-lg font-semibold mb-4">Race Progress</h2>
            <div className="space-y-4">
              {participants
                .sort((a, b) => (b.progress || 0) - (a.progress || 0))
                .map((p, idx) => (
                  <div key={p.user_id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {idx === 0 && <Trophy className="w-4 h-4 text-yellow-400" />}
                        <span className={p.user_id === user?.id ? 'text-yellow-400' : ''}>
                          {p.display_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-yellow-400">{p.wpm || 0} WPM</span>
                        <span className="text-gray-400">{p.progress || 0}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${p.user_id === user?.id ? 'bg-yellow-400' : 'bg-blue-400'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${p.progress || 0}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Typing Area */}
          {!finished && (raceText || currentRoom?.race_text) && (
            <TypingEngine
              text={raceText || currentRoom?.race_text}
              mode="multiplayer"
              onProgress={handleProgress}
              onComplete={handleComplete}
              showLiveStats={false}
              showRestartButton={false}
            />
          )}

          {!finished && !(raceText || currentRoom?.race_text) && (
            <div className="text-center py-10 bg-[#1a1f2e] rounded-2xl border border-gray-700/50">
              <Loader2 className="w-10 h-10 text-yellow-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-400">Loading race text...</p>
            </div>
          )}

          {finished && (
            <div className="text-center py-10 bg-[#1a1f2e] rounded-2xl border border-gray-700/50">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Finished!</h2>
              <p className="text-gray-400">
                Your WPM: <span className="text-yellow-400 font-bold">{myWpm}</span>
              </p>
              <p className="text-gray-400 mt-2">Waiting for other players...</p>
            </div>
          )}
        </div>
      )}

      {/* Finished State */}
      {status === 'finished' && (
        <div className="space-y-6">
          <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50">
            <h2 className="text-2xl font-bold mb-6 text-center">🏁 Race Results</h2>
            
            <div className="space-y-3">
              {participants
                .sort((a, b) => (b.wpm || 0) - (a.wpm || 0))
                .map((p, idx) => (
                  <div
                    key={p.user_id}
                    className={`flex items-center gap-4 p-4 rounded-xl ${
                      idx === 0 ? 'bg-yellow-400/10 border border-yellow-400/30' : 'bg-[#252b3b]'
                    }`}
                  >
                    <div className="text-2xl font-bold w-8">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                    </div>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-600 rounded-full" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold">{p.display_name}</div>
                      <div className="text-sm text-gray-400">{p.accuracy?.toFixed(1)}% accuracy</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-yellow-400">{p.wpm || 0}</div>
                      <div className="text-sm text-gray-400">WPM</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleLeaveRoom}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
            >
              Leave
            </button>
            {isHost && (
              <button
                onClick={handleNewRace}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Setting up...' : 'New Race'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiplayerLobby
