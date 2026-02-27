import { useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { liveClassAPI } from '../lib/api';
import type { LiveSession } from '../types';

const SOCKET_URL = (() => {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
})();

const getStoredUser = (): { id?: string; name?: string } | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const useLiveClass = (classId: string) => {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [transcript, setTranscript] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const sessionIdRef = useRef<string | null>(null);

  const startSession = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const currentUser = getStoredUser();

      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        setConnected(true);
        socketRef.current?.emit('join-classroom', { classId });
        socketRef.current?.emit('start-live-session', { classId, teacherId: currentUser?.id });
      });

      socketRef.current.on('session-started', async (data: { sessionId?: string; id?: string; classId: string; teacherId?: string; studentIds?: string[]; startTime?: string | Date; status?: LiveSession['status'] }) => {
        const normalizedSessionId = data.sessionId || data.id;

        if (!normalizedSessionId) {
          return;
        }

        sessionIdRef.current = normalizedSessionId;

        try {
          const response = await liveClassAPI.getSession(normalizedSessionId);
          const sessionDetails = response.session;
          setSession({
            id: sessionDetails.sessionId,
            classId: sessionDetails.classId,
            teacherId: sessionDetails.teacherId,
            studentIds: sessionDetails.studentId ? [sessionDetails.studentId] : [],
            startTime: new Date(sessionDetails.startTime),
            status: sessionDetails.status as LiveSession['status'],
          });
        } catch {
          setSession({
            id: normalizedSessionId,
            classId: data.classId,
            teacherId: data.teacherId || currentUser?.id || 'unknown',
            studentIds: data.studentIds || [],
            startTime: data.startTime ? new Date(data.startTime) : new Date(),
            status: data.status || 'active'
          });
        }

        socketRef.current?.emit('join-live-session', { sessionId: normalizedSessionId, classId: data.classId });
      });

      socketRef.current.on('participant-joined', (data: { userId?: string; participantId?: string }) => {
        const participantId = data.userId || data.participantId;
        if (participantId) {
          setParticipants((prev) => [...new Set([...prev, participantId])]);
        }
      });

      socketRef.current.on('participant-left', (data: { userId?: string; participantId?: string }) => {
        const participantId = data.userId || data.participantId;
        if (participantId) {
          setParticipants((prev) => prev.filter((p) => p !== participantId));
          peerConnectionRef.current.delete(participantId);
        }
      });

      socketRef.current.on('transcript-update', (data: { text: string }) => {
        setTranscript((prev) => `${prev} ${data.text}`.trim());
      });

      socketRef.current.on('webrtc-offer', async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
        });

        peerConnection.ondatachannel = (event) => {
          const dataChannel = event.channel;
          dataChannel.onmessage = (msg) => {
            // Dados recebidos do peer
          };
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current?.emit('ice-candidate', {
              to: data.from,
              candidate: event.candidate,
            });
          }
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socketRef.current?.emit('webrtc-answer', {
          to: data.from,
          answer: answer,
        });

        peerConnectionRef.current.set(data.from, peerConnection);
      });

      socketRef.current.on('ice-candidate', async (data: { from: string; candidate: RTCIceCandidateInit }) => {
        const pc = peerConnectionRef.current.get(data.from);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        }
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
    } catch (error) {
      console.error('Error starting live session:', error);
      throw error;
    }
  }, [classId]);

  const endSession = useCallback(async () => {
    const sessionId = sessionIdRef.current;

    if (sessionId) {
      try {
        await liveClassAPI.end(sessionId);
      } catch (error) {
        console.error('Error ending live session:', error);
      }
    }

    if (socketRef.current) {
      socketRef.current.emit('end-live-session', { sessionId, classId });
      socketRef.current.disconnect();
      setConnected(false);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    peerConnectionRef.current.forEach((pc) => pc.close());
    peerConnectionRef.current.clear();

    sessionIdRef.current = null;
    setSession(null);
    setParticipants([]);
    setTranscript('');
  }, [classId]);

  const sendMessage = useCallback((message: string) => {
    const sessionId = sessionIdRef.current;
    if (socketRef.current && sessionId) {
      const sender = getStoredUser();
      socketRef.current.emit('class-message', { sessionId, classId, message, sender: sender?.id || 'teacher' });
    }
  }, [classId]);

  const toggleAudio = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }, []);

  const toggleVideo = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      sessionIdRef.current = null;
    };
  }, []);

  return {
    session,
    connected,
    participants,
    transcript,
    localStream,
    startSession,
    endSession,
    sendMessage,
    toggleAudio,
    toggleVideo,
  };
};
